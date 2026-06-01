import { test, expect } from '@playwright/test';
import * as path from 'path';

// Body fixture mirrors src/unit/helpers/webview-dom.ts so webview.js can find
// every element it queries on load. The browser test loads the *real* highlight
// bundle plus webview.js and asserts real <span class="hljs-*"> elements are
// produced — proving highlighting actually ran in Chromium.
const BODY = `
	<div id="wordContainer"></div><div id="wordBefore"></div><div id="wordOrp"></div>
	<div id="wordAfter"></div><div id="readyMessage"></div><div id="charMeasure"></div>
	<button id="playBtn"></button><button id="pauseBtn"></button><button id="stopBtn"></button>
	<input id="wpmInput"><div id="progressBar"></div><div id="progressFill"></div>
	<span id="progressText"></span><span id="progressPercent"></span>
	<input type="checkbox" id="pauseOnPunctuation"><input type="color" id="orpColorInput">
	<div id="codePanel"></div><div id="codeHeader"></div><div id="codeContent"></div>
`;

const root = path.resolve(__dirname, '..', '..');

test('highlights a javascript block with real hljs spans in Chromium', async ({ page }) => {
	await page.setContent(`<!DOCTYPE html><html><body>${BODY}</body></html>`);
	await page.addScriptTag({ path: path.join(root, 'media', 'highlight.bundle.js') });
	await page.addScriptTag({ path: path.join(root, 'media', 'webview.js') });

	await page.evaluate(async () => {
		await (window as any).__speedReader.updateCodeBlock({
			isActive: true,
			language: 'javascript',
			codeContent: 'const x = 1;'
		});
	});

	const keywords = page.locator('#codeContent .hljs-keyword');
	await expect(keywords).toHaveCount(1);
});
