import * as vscode from 'vscode';
import { SpeedreadingEngine, SpeedreadingConfig, SpeedreadingState, WordSegments, CodeBlockUpdate } from './speedreading_engine';
import { MarkdownParser } from './markdown_parser';

export class SpeedreadingUI {
    private panel: vscode.WebviewPanel | undefined;
    private engine: SpeedreadingEngine;
    private disposables: vscode.Disposable[] = [];
    private context: vscode.ExtensionContext | undefined;

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
        this.context = context;

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

        this.panel.webview.html = this.getWebviewContent(this.panel.webview);
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

    private getNonce(): string {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 16; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }

    private getWebviewContent(webview: vscode.Webview): string {
        const nonce = this.getNonce();
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.context!.extensionUri, 'media', 'webview.js')
        );

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; font-src ${webview.cspSource};">
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

    <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
    }
}
