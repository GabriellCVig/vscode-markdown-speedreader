import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

/**
 * White-box assertions over media/webview.css. jsdom does no layout
 * (getBoundingClientRect returns 0), so panel widths can't be measured here;
 * instead we assert the canonical flexbox fix is present in the stylesheet.
 * The real pixel behavior is confirmed by manual F5.
 */
describe('webview.css layout rules', () => {
	const css = fs.readFileSync(
		path.join(__dirname, '../../media/webview.css'),
		'utf8'
	);

	// Normalize whitespace so assertions are robust to formatting.
	const normalized = css.replace(/\s+/g, ' ');

	/** Extracts the body of the first rule block for a given selector. */
	function ruleBody(selector: string): string {
		const idx = normalized.indexOf(selector + ' {');
		assert.ok(idx !== -1, `expected a rule block for "${selector}"`);
		const open = normalized.indexOf('{', idx);
		const close = normalized.indexOf('}', open);
		assert.ok(close !== -1, `unterminated rule block for "${selector}"`);
		return normalized.slice(open + 1, close);
	}

	it('.speed-reader-panel allows shrinking below content width (min-width: 0)', () => {
		assert.ok(
			/min-width:\s*0/.test(ruleBody('.speed-reader-panel')),
			'expected min-width: 0 on .speed-reader-panel'
		);
	});

	it('.code-panel allows shrinking below content width (min-width: 0)', () => {
		assert.ok(
			/min-width:\s*0/.test(ruleBody('.code-panel')),
			'expected min-width: 0 on .code-panel'
		);
	});

	it('.code-content retains overflow: auto so wide code scrolls inside its panel', () => {
		assert.ok(
			/overflow:\s*auto/.test(ruleBody('.code-content')),
			'expected overflow: auto on .code-content'
		);
	});
});
