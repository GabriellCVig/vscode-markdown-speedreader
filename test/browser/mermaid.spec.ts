import { test, expect } from '@playwright/test';
import * as path from 'path';

// Body fixture mirrors src/unit/helpers/webview-dom.ts so webview.js can find
// every element it queries on load. The browser test loads the *real* mermaid
// bundle plus webview.js and asserts a real <svg> is produced — something jsdom
// cannot do because mermaid needs getBBox().
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

test('renders a real SVG from a mermaid block', async ({ page }) => {
	await page.setContent(`<!DOCTYPE html><html><body>${BODY}</body></html>`);
	await page.addScriptTag({ path: path.join(root, 'media', 'mermaid.bundle.js') });
	await page.addScriptTag({ path: path.join(root, 'media', 'webview.js') });

	await page.evaluate(async () => {
		await (window as any).__speedReader.updateCodeBlock({
			isActive: true,
			language: 'mermaid',
			codeContent: 'graph TD;A-->B;'
		});
	});

	const svg = page.locator('#codeContent svg');
	await expect(svg).toHaveCount(1);
	// SVG nodes have no innerText; read the rendered node labels via textContent.
	const text = (await svg.textContent()) ?? '';
	expect(text).toContain('A');
	expect(text).toContain('B');
});
