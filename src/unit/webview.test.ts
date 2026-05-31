import * as assert from 'assert';
import * as sinon from 'sinon';
import { buildWebviewDom } from './helpers/webview-dom';

describe('webview script', () => {
	let win: any;
	let doc: Document;
	let postSpy: sinon.SinonSpy;
	let api: any;

	beforeEach(() => {
		const built = buildWebviewDom();
		win = built.window;
		doc = win.document;
		postSpy = built.postSpy;
		api = built.api;
	});

	const speedReader = () => api;
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

describe('webview mermaid render path', () => {
	it('renders a mermaid block via mermaid.render and posts diagramRendered', async () => {
		const render = sinon.stub().resolves({ svg: '<svg id="m"></svg>' });
		const built = buildWebviewDom({ mermaid: { render } });
		const doc = built.window.document;
		const byId = (id: string) => doc.getElementById(id) as any;

		await built.api.updateCodeBlock({
			isActive: true,
			language: 'mermaid',
			codeContent: 'graph TD;A-->B;'
		});

		assert.ok(
			render.calledWith('sr-diagram', 'graph TD;A-->B;'),
			'expected mermaid.render to be called with the diagram text'
		);
		assert.ok(
			byId('codeContent').innerHTML.includes('<svg'),
			'expected the rendered SVG to be injected into codeContent'
		);
		assert.ok(
			built.postSpy.calledWith({ command: 'diagramRendered' }),
			'expected a diagramRendered message to be posted'
		);
	});

	it('leaves non-mermaid blocks on the textContent path', async () => {
		const render = sinon.stub().resolves({ svg: '<svg/>' });
		const built = buildWebviewDom({ mermaid: { render } });
		const doc = built.window.document;
		const byId = (id: string) => doc.getElementById(id) as any;

		await built.api.updateCodeBlock({
			isActive: true,
			language: 'javascript',
			codeContent: 'const x = 1;'
		});

		assert.ok(render.notCalled, 'mermaid.render must not run for non-mermaid blocks');
		assert.strictEqual(byId('codeContent').textContent, 'const x = 1;');
	});
});
