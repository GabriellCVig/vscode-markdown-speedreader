(function () {
    const vscode = (typeof acquireVsCodeApi === 'function') ? acquireVsCodeApi() : { postMessage() {} };

    // UI Elements
    const wordContainer = document.getElementById('wordContainer');
    const wordBefore = document.getElementById('wordBefore');
    const wordOrp = document.getElementById('wordOrp');
    const wordAfter = document.getElementById('wordAfter');
    const readyMessage = document.getElementById('readyMessage');
    const charMeasure = document.getElementById('charMeasure');
    const playBtn = document.getElementById('playBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const stopBtn = document.getElementById('stopBtn');
    const wpmInput = document.getElementById('wpmInput');
    const progressBar = document.getElementById('progressBar');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const progressPercent = document.getElementById('progressPercent');
    const pauseOnPunctuationEl = document.getElementById('pauseOnPunctuation');
    const orpColorInput = document.getElementById('orpColorInput');
    const codePanel = document.getElementById('codePanel');
    const codeHeader = document.getElementById('codeHeader');
    const codeContent = document.getElementById('codeContent');

    // State
    let currentState = {
        isPlaying: false,
        currentIndex: 0,
        totalWords: 0,
        progress: 0
    };

    // Event Listeners
    playBtn.addEventListener('click', () => {
        vscode.postMessage({ command: 'play' });
    });

    pauseBtn.addEventListener('click', () => {
        vscode.postMessage({ command: 'pause' });
    });

    stopBtn.addEventListener('click', () => {
        vscode.postMessage({ command: 'stop' });
    });

    wpmInput.addEventListener('change', () => {
        const wpm = parseInt(wpmInput.value);
        if (wpm >= 50 && wpm <= 1000) {
            vscode.postMessage({ command: 'setWPM', wpm: wpm });
        }
    });

    progressBar.addEventListener('click', (e) => {
        const rect = progressBar.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = (x / rect.width) * 100;
        vscode.postMessage({ command: 'seekTo', percentage: Math.max(0, Math.min(100, percentage)) });
    });

    pauseOnPunctuationEl.addEventListener('change', () => {
        vscode.postMessage({
            command: 'updateConfig',
            config: { pauseOnPunctuation: pauseOnPunctuationEl.checked }
        });
    });

    orpColorInput.addEventListener('change', () => {
        vscode.postMessage({
            command: 'updateConfig',
            config: { orpHighlightColor: orpColorInput.value }
        });
    });

    // Handle messages from extension
    window.addEventListener('message', event => {
        const message = event.data;

        switch (message.command) {
            case 'updateWord':
                updateWordDisplay(message.wordSegments);
                updateState(message.state);
                break;

            case 'updateState':
                updateState(message.state);
                break;

            case 'updateConfig':
                updateConfig(message.config);
                break;

            case 'updateCodeBlock':
                updateCodeBlock(message.codeBlock);
                break;
        }
    });

    // Dynamic text measurement and positioning functions
    function measureTextWidth(text) {
        if (!text) return 0;
        charMeasure.textContent = text;
        return charMeasure.getBoundingClientRect().width;
    }

    function calculateOptimalSpacing() {
        // Measure a single character to determine minimal spacing
        const singleCharWidth = measureTextWidth('M'); // Use 'M' as it's typically the widest
        return Math.max(2, singleCharWidth * 0.05); // 5% of character width, minimum 2px
    }

    function updateWordDisplay(segments) {
        // Hide ready message and show word container
        readyMessage.style.display = 'none';
        wordContainer.style.display = 'flex';

        // Handle inline code styling
        if (segments.isInlineCode) {
            wordContainer.classList.add('inline-code');
            // For inline code, inherit the monospace font in char-measure
            charMeasure.style.fontFamily = "'Consolas', 'Monaco', 'Courier New', monospace";
        } else {
            wordContainer.classList.remove('inline-code');
            // Reset to default font for regular words
            charMeasure.style.fontFamily = 'inherit';
        }

        // Update word segments content
        wordBefore.textContent = segments.before;
        wordOrp.textContent = segments.orp;
        wordAfter.textContent = segments.after;

        // Calculate dynamic spacing
        const spacing = calculateOptimalSpacing();
        const orpWidth = measureTextWidth(segments.orp);
        const beforeWidth = measureTextWidth(segments.before);

        // Position elements with precise measurements
        const containerRect = wordContainer.getBoundingClientRect();
        const centerX = containerRect.width / 2;

        // Position ORP at exact center
        wordOrp.style.left = '50%';
        wordOrp.style.transform = 'translateX(-50%)';

        // For inline code, use a more subtle ORP highlight that doesn't clash with code styling
        if (segments.isInlineCode) {
            wordOrp.style.color = 'inherit';
            wordOrp.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
            wordOrp.style.borderRadius = '2px';
            wordOrp.style.padding = '0 1px';
        } else {
            wordOrp.style.color = orpColorInput.value;
            wordOrp.style.backgroundColor = 'transparent';
            wordOrp.style.borderRadius = '0';
            wordOrp.style.padding = '0';
        }

        // Position 'before' segment to the left of ORP with spacing
        if (segments.before) {
            wordBefore.style.right = `calc(50% + ${orpWidth/2 + spacing}px)`;
            wordBefore.style.left = 'auto';
        } else {
            wordBefore.style.right = 'auto';
            wordBefore.style.left = 'auto';
        }

        // Position 'after' segment to the right of ORP with spacing
        if (segments.after) {
            wordAfter.style.left = `calc(50% + ${orpWidth/2 + spacing}px)`;
            wordAfter.style.right = 'auto';
        } else {
            wordAfter.style.left = 'auto';
            wordAfter.style.right = 'auto';
        }
    }

    function updateState(state) {
        currentState = state;

        // Update buttons
        playBtn.disabled = state.isPlaying;
        pauseBtn.disabled = !state.isPlaying;
        stopBtn.disabled = state.totalWords === 0;

        // Update progress
        progressFill.style.width = state.progress + '%';
        progressText.textContent = `${state.currentIndex} / ${state.totalWords} words`;
        progressPercent.textContent = Math.round(state.progress) + '%';

        // Show ready message if stopped and no text loaded
        if (!state.isPlaying && state.totalWords === 0) {
            wordContainer.style.display = 'none';
            readyMessage.style.display = 'block';
            readyMessage.textContent = 'Ready to start reading...';
        }
    }

    function updateConfig(config) {
        wpmInput.value = config.wpm;
        pauseOnPunctuationEl.checked = config.pauseOnPunctuation;
        if (config.orpHighlightColor) {
            orpColorInput.value = config.orpHighlightColor;
        }
    }

    function updateCodeBlock(codeBlockUpdate) {
        console.log('updateCodeBlock called:', codeBlockUpdate);
        if (codeBlockUpdate.isActive) {
            // Update header with language info
            const headerText = codeBlockUpdate.language
                ? `Code Block (${codeBlockUpdate.language})`
                : 'Code Block';
            codeHeader.textContent = headerText;

            // Update code content
            codeContent.textContent = codeBlockUpdate.codeContent;
        } else {
            // Show placeholder content instead of hiding panel
            codeHeader.textContent = 'Code Block';
            codeContent.textContent = 'No code block currently active.';
        }
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            e.preventDefault();
            if (currentState.isPlaying) {
                pauseBtn.click();
            } else {
                playBtn.click();
            }
        } else if (e.code === 'Escape') {
            e.preventDefault();
            stopBtn.click();
        }
    });

    // Expose internals for automated tests
    window.__speedReader = {
        measureTextWidth,
        calculateOptimalSpacing,
        updateWordDisplay,
        updateState,
        updateConfig,
        updateCodeBlock,
        getState: () => currentState
    };

    // Signal that webview is ready
    vscode.postMessage({ command: 'ready' });
})();
