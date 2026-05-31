import * as fs from 'fs';
import * as path from 'path';
import * as sinon from 'sinon';
import { JSDOM } from 'jsdom';

const scriptSrc = fs.readFileSync(
	path.join(__dirname, '../../../media/webview.js'),
	'utf8'
);

const html = `<!DOCTYPE html><html><body>
	<div id="wordContainer"></div><div id="wordBefore"></div><div id="wordOrp"></div>
	<div id="wordAfter"></div><div id="readyMessage"></div><div id="charMeasure"></div>
	<button id="playBtn"></button><button id="pauseBtn"></button><button id="stopBtn"></button>
	<input id="wpmInput"><div id="progressBar"></div><div id="progressFill"></div>
	<span id="progressText"></span><span id="progressPercent"></span>
	<input type="checkbox" id="pauseOnPunctuation"><input type="color" id="orpColorInput">
	<div id="codePanel"></div><div id="codeHeader"></div><div id="codeContent"></div>
</body></html>`;

export interface WebviewDom {
	dom: JSDOM;
	window: any;
	postSpy: sinon.SinonSpy;
	api: any;
}

/**
 * Builds a JSDOM instance with the webview body fixture, stubs the VS Code API
 * (capturing postMessage on a spy), optionally injects a mocked `window.mermaid`,
 * then evaluates media/webview.js and returns the captured handles.
 */
export function buildWebviewDom(opts: { mermaid?: any } = {}): WebviewDom {
	const dom = new JSDOM(html, { runScripts: 'outside-only' });
	const window = dom.window as any;
	const postSpy = sinon.spy();
	window.acquireVsCodeApi = () => ({ postMessage: postSpy });
	if (opts.mermaid !== undefined) {
		window.mermaid = opts.mermaid;
	}
	window.eval(scriptSrc);
	return { dom, window, postSpy, api: window.__speedReader };
}
