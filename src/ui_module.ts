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
            orpHighlightColor: '#ff4444',
            autoPauseOnDiagram: false
        };
        this.engine = new SpeedreadingEngine(defaultConfig);
        this.setupEngineCallbacks();
    }

    /**
     * Creates and shows the speedreading webview panel.
     */
    public show(text: string, context: vscode.ExtensionContext): void {
        this.context = context;

        // Apply user settings that can change between invocations.
        const autoPauseOnDiagram = vscode.workspace
            .getConfiguration('speedreader')
            .get<boolean>('autoPauseOnDiagram', false);
        this.engine.updateConfig({ autoPauseOnDiagram });

        // Parse markdown if applicable
        let parsedText = text;
        let codeBlocks: string[] = [];
        
        console.log('[DEBUG UI] Original text length:', text.length);
        console.log('[DEBUG UI] Is markdown:', MarkdownParser.isMarkdown(text));
        
        if (MarkdownParser.isMarkdown(text)) {
            const maxLen = vscode.workspace
                .getConfiguration('speedreader')
                .get<number>('inlineCodeMaxLength', 20);
            const parseResult = MarkdownParser.parseMarkdown(text, maxLen);
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
        const mermaidUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.context!.extensionUri, 'media', 'mermaid.bundle.js')
        );
        const styleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.context!.extensionUri, 'media', 'webview.css')
        );

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; font-src ${webview.cspSource};">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Speed Reader</title>
    <link rel="stylesheet" href="${styleUri}">
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

    <script nonce="${nonce}" src="${mermaidUri}"></script>
    <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
    }
}
