import * as fs from 'fs';
import * as path from 'path';
import * as assert from 'assert';
import * as sinon from 'sinon';
import { JSDOM } from 'jsdom';

const scriptSrc = fs.readFileSync(
	path.join(__dirname, '../../media/webview.js'),
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

describe('webview script', () => {
	let dom: JSDOM;
	let postSpy: sinon.SinonSpy;
	let win: any;
	let doc: Document;

	beforeEach(() => {
		dom = new JSDOM(html, { runScripts: 'outside-only' });
		win = dom.window;
		doc = win.document;
		postSpy = sinon.spy();
		win.acquireVsCodeApi = () => ({ postMessage: postSpy });
		win.eval(scriptSrc);
	});

	const speedReader = () => win.__speedReader;
	const byId = (id: string) => doc.getElementById(id) as any;

	it('posts a ready message on script eval', () => {
		assert.ok(postSpy.calledWith({ command: 'ready' }));
	});

	it('updateState toggles button disabled flags and progress text', () => {
		speedReader().updateState({
			isPlaying: false,
			currentIndex: 3,
			totalWords: 10,
			progress: 30
		});

		assert.strictEqual(byId('playBtn').disabled, false);
		assert.strictEqual(byId('pauseBtn').disabled, true);
		assert.strictEqual(byId('stopBtn').disabled, false);
		assert.strictEqual(byId('progressText').textContent, '3 / 10 words');
		assert.strictEqual(byId('progressPercent').textContent, '30%');

		speedReader().updateState({
			isPlaying: true,
			currentIndex: 3,
			totalWords: 10,
			progress: 30
		});

		assert.strictEqual(byId('playBtn').disabled, true);
		assert.strictEqual(byId('pauseBtn').disabled, false);
	});

	it('updateCodeBlock handles active and inactive states', () => {
		speedReader().updateCodeBlock({
			isActive: true,
			language: 'javascript',
			codeContent: 'x'
		});
		assert.strictEqual(
			byId('codeHeader').textContent,
			'Code Block (javascript)'
		);
		assert.strictEqual(byId('codeContent').textContent, 'x');

		speedReader().updateCodeBlock({ isActive: false });
		assert.strictEqual(byId('codeHeader').textContent, 'Code Block');
		assert.strictEqual(
			byId('codeContent').textContent,
			'No code block currently active.'
		);
	});

	it('updateConfig syncs wpm, checkbox and color inputs', () => {
		speedReader().updateConfig({
			wpm: 400,
			pauseOnPunctuation: false,
			orpHighlightColor: '#00ff00'
		});

		assert.strictEqual(byId('wpmInput').value, '400');
		assert.strictEqual(byId('pauseOnPunctuation').checked, false);
		assert.strictEqual(byId('orpColorInput').value, '#00ff00');
	});

	it('keyboard Space/Escape route to the right postMessages and preventDefault', () => {
		speedReader().updateState({
			isPlaying: false,
			currentIndex: 0,
			totalWords: 10,
			progress: 0
		});

		const spaceEvent = new win.KeyboardEvent('keydown', {
			code: 'Space',
			cancelable: true
		});
		doc.dispatchEvent(spaceEvent);
		assert.strictEqual(spaceEvent.defaultPrevented, true);
		assert.ok(postSpy.calledWith({ command: 'play' }));

		speedReader().updateState({
			isPlaying: true,
			currentIndex: 0,
			totalWords: 10,
			progress: 0
		});

		const spaceEvent2 = new win.KeyboardEvent('keydown', {
			code: 'Space',
			cancelable: true
		});
		doc.dispatchEvent(spaceEvent2);
		assert.strictEqual(spaceEvent2.defaultPrevented, true);
		assert.ok(postSpy.calledWith({ command: 'pause' }));

		const escEvent = new win.KeyboardEvent('keydown', {
			code: 'Escape',
			cancelable: true
		});
		doc.dispatchEvent(escEvent);
		assert.strictEqual(escEvent.defaultPrevented, true);
		assert.ok(postSpy.calledWith({ command: 'stop' }));
	});

	it('window message events route by command', () => {
		win.dispatchEvent(
			new win.MessageEvent('message', {
				data: {
					command: 'updateCodeBlock',
					codeBlock: {
						isActive: true,
						language: 'python',
						codeContent: 'pp'
					}
				}
			})
		);
		assert.strictEqual(
			byId('codeHeader').textContent,
			'Code Block (python)'
		);
		assert.strictEqual(byId('codeContent').textContent, 'pp');

		win.dispatchEvent(
			new win.MessageEvent('message', {
				data: {
					command: 'updateState',
					state: {
						isPlaying: false,
						currentIndex: 7,
						totalWords: 20,
						progress: 35
					}
				}
			})
		);
		assert.strictEqual(byId('progressText').textContent, '7 / 20 words');
	});
});
