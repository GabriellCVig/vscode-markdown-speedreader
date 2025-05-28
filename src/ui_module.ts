import * as vscode from 'vscode';
import { SpeedreadingEngine, SpeedreadingConfig, SpeedreadingState, WordSegments, CodeBlockUpdate } from './speedreading_engine';
import { MarkdownParser } from './markdown_parser';

export class SpeedreadingUI {
    private panel: vscode.WebviewPanel | undefined;
    private engine: SpeedreadingEngine;
    private disposables: vscode.Disposable[] = [];

    constructor() {
        const defaultConfig: SpeedreadingConfig = {
            wpm: 250,
            highlightColor: '#007acc',
            fontSize: 24,
            pauseOnPunctuation: true,
            orpHighlightColor: '#ff4444'
        };
        this.engine = new SpeedreadingEngine(defaultConfig);
        this.setupEngineCallbacks();
    }

    /**
     * Creates and shows the speedreading webview panel.
     */
    public show(text: string, context: vscode.ExtensionContext): void {
        // Parse markdown if applicable
        let parsedText = text;
        let codeBlocks: string[] = [];
        
        console.log('[DEBUG UI] Original text length:', text.length);
        console.log('[DEBUG UI] Is markdown:', MarkdownParser.isMarkdown(text));
        
        if (MarkdownParser.isMarkdown(text)) {
            const parseResult = MarkdownParser.parseMarkdown(text);
            parsedText = parseResult.parsedText;
            codeBlocks = parseResult.codeBlocks;
            console.log('[DEBUG UI] Parsed text length:', parsedText.length);
            console.log('[DEBUG UI] Code blocks found:', codeBlocks.length);
            codeBlocks.forEach((block, index) => {
                console.log(`[DEBUG UI] Code block ${index}:`, block.substring(0, 50) + '...');
            });
        }
        
        console.log('[DEBUG UI] Loading text with', codeBlocks.length, 'code blocks');
        
        if (this.panel) {
            this.panel.reveal(vscode.ViewColumn.One);
            this.engine.loadText(parsedText, codeBlocks);
            return;
        }

        this.panel = vscode.window.createWebviewPanel(
            'speedreading',
            'Speed Reader',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')]
            }
        );

        this.panel.webview.html = this.getWebviewContent();
        this.engine.loadText(parsedText, codeBlocks);

        // Handle messages from the webview
        this.panel.webview.onDidReceiveMessage(
            message => this.handleWebviewMessage(message),
            null,
            this.disposables
        );

        // Clean up when the panel is closed
        this.panel.onDidDispose(
            () => {
                this.panel = undefined;
                this.engine.stop();
                this.disposables.forEach(d => d.dispose());
                this.disposables = [];
            },
            null,
            this.disposables
        );
    }

    /**
     * Disposes of the UI and cleans up resources.
     */
    public dispose(): void {
        if (this.panel) {
            this.panel.dispose();
        }
        this.disposables.forEach(d => d.dispose());
    }

    private setupEngineCallbacks(): void {
        this.engine.setOnWordUpdate((wordSegments: WordSegments, state: SpeedreadingState) => {
            this.sendToWebview({
                command: 'updateWord',
                wordSegments: wordSegments,
                state: state
            });
        });

        this.engine.setOnStateChange((state: SpeedreadingState) => {
            this.sendToWebview({
                command: 'updateState',
                state: state
            });
        });

        this.engine.setOnCodeBlockUpdate((update: CodeBlockUpdate) => {
            this.sendToWebview({
                command: 'updateCodeBlock',
                codeBlock: update
            });
        });
    }

    private handleWebviewMessage(message: any): void {
        switch (message.command) {
            case 'play':
                this.engine.play();
                break;
            case 'pause':
                this.engine.pause();
                break;
            case 'stop':
                this.engine.stop();
                break;
            case 'setWPM':
                this.engine.setWPM(message.wpm);
                break;
            case 'seekTo':
                this.engine.seekTo(message.percentage);
                break;
            case 'updateConfig':
                this.engine.updateConfig(message.config);
                break;
            case 'ready':
                // Send initial state when webview is ready
                this.sendToWebview({
                    command: 'updateState',
                    state: this.engine.getState()
                });
                this.sendToWebview({
                    command: 'updateConfig',
                    config: this.engine.getConfig()
                });
                break;
        }
    }

    private sendToWebview(message: any): void {
        if (this.panel) {
            this.panel.webview.postMessage(message);
        }
    }

    private getWebviewContent(): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Speed Reader</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            margin: 0;
            padding: 20px;
            display: flex;
            flex-direction: column;
            height: 100vh;
            box-sizing: border-box;
        }

        .reading-area {
            flex: 1;
            display: flex;
            min-height: 200px;
            border: 2px solid var(--vscode-panel-border);
            border-radius: 8px;
            margin-bottom: 20px;
            background-color: var(--vscode-panel-background);
            position: relative;
            gap: 10px;
        }

        .speed-reader-panel {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
        }

        .code-panel {
            flex: 1;
            display: flex;
            flex-direction: column;
            border-left: 1px solid var(--vscode-panel-border);
            background-color: var(--vscode-editor-background);
        }

        .code-panel.hidden {
            display: none;
        }

        .code-header {
            padding: 8px 12px;
            background-color: var(--vscode-tab-activeBackground);
            border-bottom: 1px solid var(--vscode-panel-border);
            font-size: 12px;
            font-weight: bold;
            color: var(--vscode-tab-activeForeground);
        }

        .code-content {
            flex: 1;
            padding: 12px;
            font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
            font-size: 14px;
            line-height: 1.4;
            color: var(--vscode-editor-foreground);
            background-color: var(--vscode-editor-background);
            overflow: auto;
            white-space: pre;
            word-wrap: break-word;
        }

        .word-container {
            position: relative;
            font-size: 32px;
            font-weight: bold;
            color: var(--vscode-textLink-foreground);
            min-height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            width: 100%;
        }

        .word-container.inline-code {
            font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
            background-color: var(--vscode-textCodeBlock-background);
            color: var(--vscode-textCodeBlock-foreground);
            border-radius: 4px;
            padding: 8px 12px;
            margin: 0 4px;
        }

        .word-before {
            position: absolute;
            text-align: right;
            white-space: nowrap;
        }

        .word-orp {
            position: absolute;
            font-weight: bold;
            white-space: nowrap;
            z-index: 10;
        }

        .word-after {
            position: absolute;
            text-align: left;
            white-space: nowrap;
        }

        .char-measure {
            position: absolute;
            visibility: hidden;
            white-space: nowrap;
            font-size: inherit;
            font-family: inherit;
            font-weight: inherit;
        }

        .ready-message {
            font-size: 32px;
            font-weight: bold;
            text-align: center;
            color: var(--vscode-textLink-foreground);
        }

        .controls {
            display: flex;
            flex-direction: column;
            gap: 15px;
            padding: 20px;
            border: 1px solid var(--vscode-panel-border);
            border-radius: 8px;
            background-color: var(--vscode-panel-background);
        }

        .playback-controls {
            display: flex;
            gap: 10px;
            justify-content: center;
        }

        .control-button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            min-width: 80px;
        }

        .control-button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }

        .control-button:disabled {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            cursor: not-allowed;
        }

        .speed-control {
            display: flex;
            align-items: center;
            gap: 10px;
            justify-content: center;
        }

        .speed-input {
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            padding: 5px 10px;
            border-radius: 4px;
            width: 80px;
            text-align: center;
        }

        .progress-container {
            display: flex;
            flex-direction: column;
            gap: 5px;
        }

        .progress-bar {
            width: 100%;
            height: 8px;
            background-color: var(--vscode-progressBar-background);
            border-radius: 4px;
            overflow: hidden;
            cursor: pointer;
        }

        .progress-fill {
            height: 100%;
            background-color: var(--vscode-textLink-foreground);
            width: 0%;
            transition: width 0.1s ease;
        }

        .progress-info {
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
        }

        .settings-row {
            display: flex;
            align-items: center;
            gap: 10px;
            justify-content: space-between;
        }

        .checkbox {
            accent-color: var(--vscode-textLink-foreground);
        }

        .color-input {
            width: 50px;
            height: 30px;
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            cursor: pointer;
            background: none;
        }

        .color-input::-webkit-color-swatch-wrapper {
            padding: 0;
        }

        .color-input::-webkit-color-swatch {
            border: none;
            border-radius: 3px;
        }

        .label {
            font-size: 14px;
            color: var(--vscode-foreground);
        }

        @media (max-width: 600px) {
            .current-word {
                font-size: 24px;
            }
            
            .playback-controls {
                flex-wrap: wrap;
            }
            
            .control-button {
                min-width: 60px;
                padding: 8px 15px;
            }
        }
    </style>
</head>
<body>
    <div class="reading-area">
        <div class="speed-reader-panel">
            <div class="word-container" id="wordContainer">
                <div class="word-before" id="wordBefore"></div>
                <div class="word-orp" id="wordOrp"></div>
                <div class="word-after" id="wordAfter"></div>
                <div class="char-measure" id="charMeasure"></div>
            </div>
            <div class="ready-message" id="readyMessage">Ready to start reading...</div>
        </div>
        <div class="code-panel" id="codePanel">
            <div class="code-header" id="codeHeader">Code Block</div>
            <div class="code-content" id="codeContent"></div>
        </div>
    </div>

    <div class="controls">
        <div class="playback-controls">
            <button class="control-button" id="playBtn">Play</button>
            <button class="control-button" id="pauseBtn" disabled>Pause</button>
            <button class="control-button" id="stopBtn" disabled>Stop</button>
        </div>

        <div class="speed-control">
            <label class="label" for="wpmInput">Speed:</label>
            <input type="number" class="speed-input" id="wpmInput" min="50" max="1000" value="250" step="25">
            <span class="label">WPM</span>
        </div>

        <div class="progress-container">
            <div class="progress-bar" id="progressBar">
                <div class="progress-fill" id="progressFill"></div>
            </div>
            <div class="progress-info">
                <span id="progressText">0 / 0 words</span>
                <span id="progressPercent">0%</span>
            </div>
        </div>

        <div class="settings-row">
            <label class="label" for="pauseOnPunctuation">Pause on punctuation:</label>
            <input type="checkbox" class="checkbox" id="pauseOnPunctuation" checked>
        </div>

        <div class="settings-row">
            <label class="label" for="orpColorInput">ORP Highlight Color:</label>
            <input type="color" class="color-input" id="orpColorInput" value="#ff4444">
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        
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
                wordBefore.style.right = \`calc(50% + \${orpWidth/2 + spacing}px)\`;
                wordBefore.style.left = 'auto';
            } else {
                wordBefore.style.right = 'auto';
                wordBefore.style.left = 'auto';
            }
            
            // Position 'after' segment to the right of ORP with spacing
            if (segments.after) {
                wordAfter.style.left = \`calc(50% + \${orpWidth/2 + spacing}px)\`;
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
            progressText.textContent = \`\${state.currentIndex} / \${state.totalWords} words\`;
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
                    ? \`Code Block (\${codeBlockUpdate.language})\` 
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

        // Signal that webview is ready
        vscode.postMessage({ command: 'ready' });
    </script>
</body>
</html>`;
    }
}
