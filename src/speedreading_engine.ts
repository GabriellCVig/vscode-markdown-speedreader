export interface SpeedreadingConfig {
    wpm: number;
    highlightColor: string;
    fontSize: number;
    pauseOnPunctuation: boolean;
    orpHighlightColor: string;
    autoPauseOnDiagram?: boolean;
}

export interface WordSegments {
    before: string;
    orp: string;
    after: string;
    orpPosition: number;
    isInlineCode?: boolean;
    inlineCodeContent?: string;
}

export interface CodeBlockUpdate {
    codeContent: string;
    codeIndex: number;
    language?: string;
    isActive: boolean;
}

export interface SpeedreadingState {
    isPlaying: boolean;
    currentIndex: number;
    totalWords: number;
    progress: number;
}

export class SpeedreadingEngine {
    private words: string[] = [];
    private codeBlocks: string[] = [];
    private currentCodeBlockIndex: number = -1;
    private currentIndex: number = 0;
    private isPlaying: boolean = false;
    private intervalId: NodeJS.Timeout | null = null;
    private config: SpeedreadingConfig;
    private onWordUpdate?: (wordSegments: WordSegments, state: SpeedreadingState) => void;
    private onStateChange?: (state: SpeedreadingState) => void;
    private onCodeBlockUpdate?: (update: CodeBlockUpdate) => void;

    constructor(config: SpeedreadingConfig) {
        this.config = { ...config };
    }

    /**
     * Loads text content and code blocks for speedreading.
     * @param text The text content to speedread.
     * @param codeBlocks Array of code blocks extracted from markdown.
     */
    public loadText(text: string, codeBlocks: string[] = []): void {
        // Split text into words, removing extra whitespace
        this.words = text
            .split(/\s+/)
            .filter(word => word.trim().length > 0);
        
        this.codeBlocks = codeBlocks;
        console.log(`[DEBUG ENGINE] Loaded ${codeBlocks.length} code blocks:`);
        codeBlocks.forEach((block, index) => {
            const preview = block.substring(0, 50).replace(/\n/g, '\\n');
            console.log(`[DEBUG ENGINE] Block ${index}: ${preview}...`);
        });
        
        this.currentCodeBlockIndex = -1;
        this.currentIndex = 0;
        this.isPlaying = false;
        this.stop();
        this.notifyStateChange();
        
        // Show code panel with placeholder content initially
        this.notifyCodeBlockUpdate(false);
    }

    /**
     * Starts or resumes speedreading.
     */
    public play(): void {
        if (this.words.length === 0) {
            return;
        }

        if (this.currentIndex >= this.words.length) {
            this.currentIndex = 0;
            this.currentCodeBlockIndex = -1; // Reset code block index when looping
        }

        this.isPlaying = true;
        this.notifyStateChange();
        this.startInterval();
    }

    /**
     * Pauses speedreading.
     */
    public pause(): void {
        this.isPlaying = false;
        this.stopInterval();
        this.notifyStateChange();
    }

    /**
     * Stops speedreading and resets to the beginning.
     */
    public stop(): void {
        this.isPlaying = false;
        this.currentIndex = 0;
        this.currentCodeBlockIndex = -1;
        this.stopInterval();
        this.notifyStateChange();
        // Keep code panel visible with placeholder content when stopped
        this.notifyCodeBlockUpdate(false);
    }

    /**
     * Sets the reading speed in words per minute.
     * @param wpm Words per minute.
     */
    public setWPM(wpm: number): void {
        this.config.wpm = Math.max(50, Math.min(1000, wpm)); // Clamp between 50-1000 WPM
        
        if (this.isPlaying) {
            this.stopInterval();
            this.startInterval();
        }
    }

    /**
     * Jumps to a specific position in the text.
     * @param percentage Percentage of completion (0-100).
     */
    public seekTo(percentage: number): void {
        const targetIndex = Math.floor((percentage / 100) * this.words.length);
        this.currentIndex = Math.max(0, Math.min(targetIndex, this.words.length - 1));
        
        // Recalculate which code block should be active based on current position
        this.recalculateCodeBlockState();
        
        if (this.words.length > 0) {
            this.notifyWordUpdate();
        }
        this.notifyStateChange();
    }

    /**
     * Gets the current speedreading state.
     */
    public getState(): SpeedreadingState {
        return {
            isPlaying: this.isPlaying,
            currentIndex: this.currentIndex,
            totalWords: this.words.length,
            progress: this.words.length > 0 ? (this.currentIndex / this.words.length) * 100 : 0
        };
    }

    /**
     * Gets the current configuration.
     */
    public getConfig(): SpeedreadingConfig {
        return { ...this.config };
    }

    /**
     * Updates the configuration.
     */
    public updateConfig(newConfig: Partial<SpeedreadingConfig>): void {
        this.config = { ...this.config, ...newConfig };
        
        if (newConfig.wpm && this.isPlaying) {
            this.stopInterval();
            this.startInterval();
        }
        
        // Refresh current word display if ORP color changed
        if (newConfig.orpHighlightColor && this.currentIndex < this.words.length) {
            this.notifyWordUpdate();
        }
    }

    /**
     * Sets the callback for word updates.
     */
    public setOnWordUpdate(callback: (wordSegments: WordSegments, state: SpeedreadingState) => void): void {
        this.onWordUpdate = callback;
    }

    /**
     * Sets the callback for state changes.
     */
    public setOnStateChange(callback: (state: SpeedreadingState) => void): void {
        this.onStateChange = callback;
    }

    /**
     * Sets the callback for code block updates.
     */
    public setOnCodeBlockUpdate(callback: (update: CodeBlockUpdate) => void): void {
        this.onCodeBlockUpdate = callback;
    }

    private startInterval(): void {
        const intervalMs = this.calculateInterval();
        
        this.intervalId = setInterval(() => {
            this.showNextWord();
        }, intervalMs);

        // Show current word immediately
        this.notifyWordUpdate();
    }

    private stopInterval(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    private showNextWord(): void {
        if (this.currentIndex >= this.words.length) {
            this.stop();
            return;
        }

        const currentWord = this.words[this.currentIndex];
        
        // Check if current word is a code block token (new format: [CODE BLOCK N])
        if (currentWord === '[CODE' && 
            this.currentIndex + 2 < this.words.length && 
            this.words[this.currentIndex + 1] === 'BLOCK' &&
            /^\d+\]$/.test(this.words[this.currentIndex + 2])) {
            
            // Extract the code block index from the token
            const indexToken = this.words[this.currentIndex + 2];
            const codeBlockIndex = parseInt(indexToken.replace(']', ''));
            
            console.log(`[DEBUG] Code block token detected at index ${this.currentIndex}, codeBlockIndex: ${codeBlockIndex}`);
            // Handle code block with specific index
            this.handleCodeBlockTokenWithIndex(codeBlockIndex);
            this.currentIndex += 3; // Skip [CODE, BLOCK, N]
            this.notifyStateChange();

            // Auto-pause on diagram blocks (e.g. mermaid) so the reader can view
            // the rendered diagram; playback resumes only on a manual play().
            if (
                this.config.autoPauseOnDiagram &&
                codeBlockIndex >= 0 &&
                codeBlockIndex < this.codeBlocks.length &&
                this.extractLanguageFromCodeBlock(this.codeBlocks[codeBlockIndex]) === 'mermaid'
            ) {
                this.pause();
            }

            // Don't recursively call showNextWord() - let the timer handle the next word
            // This gives time for the user to see the code block
            return;
        }
        
        this.notifyWordUpdate();
        this.currentIndex++;
        this.notifyStateChange();

        // Add pause for punctuation if enabled
        if (this.config.pauseOnPunctuation && this.shouldPauseAfterWord()) {
            this.pause(); 
            setTimeout(() => {
                // If currentIndex is at or past the end of words, it means the
                // document just finished with the punctuated word. Do not restart.
                if (this.currentIndex >= this.words.length) {
                    return; 
                }

                // Original logic to resume play if not already playing and not at the end.
                if (!this.isPlaying) { 
                    this.play();
                }
            }, 300);
        }
    }

    private shouldPauseAfterWord(): boolean {
        if (this.currentIndex === 0) {return false;}

        const currentWord = this.words[this.currentIndex - 1];
        return /[.!?;:]$/.test(currentWord);
    }

    private calculateInterval(): number {
        const baseInterval = 60000 / this.config.wpm; // Base interval in milliseconds
        
        // Adjust interval based on word length for better readability
        if (this.currentIndex < this.words.length) {
            const currentWord = this.words[this.currentIndex];
            const wordLength = currentWord.length;
            
            if (wordLength > 8) {
                return baseInterval * 1.3; // Slower for long words
            } else if (wordLength < 4) {
                return baseInterval * 0.8; // Faster for short words
            }
        }
        
        return baseInterval;
    }

    /**
     * Calculates and segments a word for ORP (Optimal Recognition Point) highlighting.
     * @param word The word to segment.
     * @returns WordSegments object with before, orp, and after parts.
     */
    private calculateWordSegments(word: string): WordSegments {
        if (word.length === 0) {
            return {
                before: '',
                orp: '',
                after: '',
                orpPosition: 0
            };
        }
        
        // Check if this word contains inline code markers
        const inlineCodeMatch = word.match(/«code:short»([^«]+)«\/code»/);
        if (inlineCodeMatch) {
            const codeContent = inlineCodeMatch[1];
            // For inline code, we treat the entire code content as a single unit
            // but still apply ORP highlighting within it
            const orpPosition = Math.floor(codeContent.length * 0.3);
            const safePosition = Math.max(0, Math.min(orpPosition, codeContent.length - 1));
            
            return {
                before: codeContent.slice(0, safePosition),
                orp: codeContent[safePosition],
                after: codeContent.slice(safePosition + 1),
                orpPosition: safePosition,
                isInlineCode: true,
                inlineCodeContent: codeContent
            };
        }
        
        // Standard word processing for non-inline-code words
        // Calculate ORP position using the standard formula: Math.floor(word.length * 0.3)
        const orpPosition = Math.floor(word.length * 0.3);
        const safePosition = Math.max(0, Math.min(orpPosition, word.length - 1));
        
        return {
            before: word.slice(0, safePosition),
            orp: word[safePosition],
            after: word.slice(safePosition + 1),
            orpPosition: safePosition
        };
    }

    private notifyWordUpdate(): void {
        if (this.onWordUpdate && this.currentIndex < this.words.length) {
            const currentWord = this.words[this.currentIndex];
            
            // Skip code block tokens - they are handled in showNextWord()
            // New format: [CODE, BLOCK, N]
            if (currentWord === '[CODE' &&
                this.currentIndex + 2 < this.words.length &&
                this.words[this.currentIndex + 1] === 'BLOCK' &&
                /^\d+\]$/.test(this.words[this.currentIndex + 2])) {
                return; 
            }
            
            // Skip BLOCK N] or N] if previous words were part of a code block token
            if (this.currentIndex > 0 && this.words[this.currentIndex - 1] === '[CODE' && currentWord === 'BLOCK') {
                return;
            }
            if (this.currentIndex > 1 && this.words[this.currentIndex - 2] === '[CODE' && this.words[this.currentIndex -1] === 'BLOCK' && /^\d+\]$/.test(currentWord)) {
                return;
            }
            
            const wordSegments = this.calculateWordSegments(currentWord);
            this.onWordUpdate(wordSegments, this.getState());
        }
    }

    private notifyStateChange(): void {
        if (this.onStateChange) {
            this.onStateChange(this.getState());
        }
    }

    private notifyCodeBlockUpdate(active: boolean): void {
        if (this.onCodeBlockUpdate) {
            if (active && this.currentCodeBlockIndex >= 0 && this.currentCodeBlockIndex < this.codeBlocks.length) {
                const codeBlock = this.codeBlocks[this.currentCodeBlockIndex];
                const language = this.extractLanguageFromCodeBlock(codeBlock);
                const codeContent = this.extractCodeContent(codeBlock);
                
                console.log(`[DEBUG] Sending code block update: active=${active}, language=${language}, content length=${codeContent.length}`);
                this.onCodeBlockUpdate({
                    codeContent,
                    codeIndex: this.currentCodeBlockIndex,
                    language,
                    isActive: true
                });
            } else {
                console.log(`[DEBUG] Sending code block update: active=${active} (placeholder content)`);
                this.onCodeBlockUpdate({
                    codeContent: '',
                    codeIndex: -1,
                    isActive: false
                });
            }
        } else {
            console.log(`[DEBUG] No onCodeBlockUpdate callback registered`);
        }
    }

    private handleCodeBlockTokenWithIndex(index: number): void {
        this.currentCodeBlockIndex = index;
        console.log(`[DEBUG] handleCodeBlockTokenWithIndex: currentCodeBlockIndex = ${this.currentCodeBlockIndex}, total codeBlocks = ${this.codeBlocks.length}`);
        if (this.currentCodeBlockIndex >= 0 && this.currentCodeBlockIndex < this.codeBlocks.length) {
            console.log(`[DEBUG] Activating code block ${this.currentCodeBlockIndex}`);
            this.notifyCodeBlockUpdate(true);
        } else {
            console.log(`[DEBUG] Invalid code block index ${this.currentCodeBlockIndex} or no more code blocks to show.`);
            this.notifyCodeBlockUpdate(false); // Ensure UI clears if index is bad
        }
    }

    private extractLanguageFromCodeBlock(codeBlock: string): string | undefined {
        const match = codeBlock.match(/^```(\w+)/);
        return match ? match[1] : undefined;
    }

    private extractCodeContent(codeBlock: string): string {
        // Remove the opening and closing backticks and language specifier
        const content = codeBlock.replace(/^```\w*\n?/, '').replace(/```$/, '');
        return content.trim();
    }

    private recalculateCodeBlockState(): void {
        let lastSeenCodeBlockIndex = -1;
        for (let i = 0; i < this.currentIndex; i++) {
            if (this.words[i] === '[CODE' &&
                i + 2 < this.words.length &&
                this.words[i + 1] === 'BLOCK' &&
                /^\d+\]$/.test(this.words[i + 2])) {
                
                const indexToken = this.words[i + 2];
                lastSeenCodeBlockIndex = parseInt(indexToken.replace(']', ''));
                i += 2; // Advance past BLOCK and N]
            }
        }
        
        if (lastSeenCodeBlockIndex !== -1 && lastSeenCodeBlockIndex < this.codeBlocks.length) {
            this.currentCodeBlockIndex = lastSeenCodeBlockIndex;
            this.notifyCodeBlockUpdate(true);
        } else {
            this.currentCodeBlockIndex = -1;
            this.notifyCodeBlockUpdate(false);
        }
    }
}
