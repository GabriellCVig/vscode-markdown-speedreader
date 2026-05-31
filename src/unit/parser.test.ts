import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { MarkdownParser } from '../markdown_parser';

describe('MarkdownParser.isMarkdown', () => {
    it('returns true for a header line', () => {
        assert.strictEqual(MarkdownParser.isMarkdown('# Title'), true);
    });

    it('returns true for bold text', () => {
        assert.strictEqual(MarkdownParser.isMarkdown('**bold**'), true);
    });

    it('returns true for a link', () => {
        assert.strictEqual(MarkdownParser.isMarkdown('[a](b)'), true);
    });

    it('returns true for a fenced block', () => {
        assert.strictEqual(MarkdownParser.isMarkdown('```js\ncode\n```'), true);
    });

    it('returns true for a bullet list line', () => {
        assert.strictEqual(MarkdownParser.isMarkdown('- item'), true);
    });

    it('returns false for plain prose', () => {
        assert.strictEqual(
            MarkdownParser.isMarkdown('The quick brown fox jumps over the lazy dog.'),
            false
        );
    });
});

describe('MarkdownParser.parseMarkdown', () => {
    it('extracts fenced blocks into codeBlocks and leaves a token in prose', () => {
        const input = 'Intro paragraph.\n\n```js\nconst x = 1;\n```\n\nOutro.';
        const { parsedText, codeBlocks } = MarkdownParser.parseMarkdown(input);
        assert.strictEqual(codeBlocks.length, 1);
        assert.ok(codeBlocks[0].includes('const x = 1;'));
        assert.ok(parsedText.includes('[CODE BLOCK 0]'));
    });

    it('keeps a 4-backtick fence as a single block', () => {
        const input = '````\nlevel\n````';
        const { codeBlocks } = MarkdownParser.parseMarkdown(input);
        assert.strictEqual(codeBlocks.length, 1);
    });

    it('styles short inline code (<=20 chars) without adding to codeBlocks', () => {
        const input = 'use the `foo` function';
        const { parsedText, codeBlocks } = MarkdownParser.parseMarkdown(input);
        assert.ok(parsedText.includes('«code:short»foo«/code»'));
        assert.strictEqual(codeBlocks.length, 0);
    });

    it('treats long inline code (>20 chars) as a code block', () => {
        const input = 'run `this is a very long inline command indeed` now';
        const { parsedText, codeBlocks } = MarkdownParser.parseMarkdown(input);
        assert.strictEqual(codeBlocks.length, 1);
        assert.ok(codeBlocks[0].includes('this is a very long inline command indeed'));
        assert.ok(parsedText.includes('[CODE BLOCK'));
        assert.ok(!parsedText.includes('this is a very long inline command indeed'));
    });

    describe('configurable inline-code threshold', () => {
        it('keeps a 25-char span inline when maxInlineCodeLength is 30', () => {
            const span = 'a'.repeat(25);
            const input = `use the \`${span}\` thing`;
            const { parsedText, codeBlocks } = MarkdownParser.parseMarkdown(input, 30);
            assert.ok(parsedText.includes(`«code:short»${span}«/code»`));
            assert.strictEqual(codeBlocks.length, 0);
        });

        it('keeps a 20-char span inline at the default boundary', () => {
            const span = 'a'.repeat(20);
            const input = `use the \`${span}\` thing`;
            const { parsedText, codeBlocks } = MarkdownParser.parseMarkdown(input);
            assert.ok(parsedText.includes(`«code:short»${span}«/code»`));
            assert.strictEqual(codeBlocks.length, 0);
        });

        it('pushes a 21-char span to codeBlocks at the default boundary', () => {
            const span = 'a'.repeat(21);
            const input = `use the \`${span}\` thing`;
            const { parsedText, codeBlocks } = MarkdownParser.parseMarkdown(input);
            assert.strictEqual(codeBlocks.length, 1);
            assert.ok(codeBlocks[0].includes(span));
            assert.ok(parsedText.includes('[CODE BLOCK'));
        });

        it('pushes a 17-char span to codeBlocks when maxInlineCodeLength is 16', () => {
            const span = 'a'.repeat(17);
            const input = `use the \`${span}\` thing`;
            const { parsedText, codeBlocks } = MarkdownParser.parseMarkdown(input, 16);
            assert.strictEqual(codeBlocks.length, 1);
            assert.ok(codeBlocks[0].includes(span));
            assert.ok(parsedText.includes('[CODE BLOCK'));
        });
    });

    it('strips HTML tags from prose', () => {
        const input = '# Heading\n\nSome **bold** text.';
        const { parsedText } = MarkdownParser.parseMarkdown(input);
        assert.ok(!parsedText.includes('<'));
        assert.ok(!parsedText.includes('>'));
    });

    it('extracts exactly 3 fenced blocks from the fixture', () => {
        const fixturePath = path.join(__dirname, '../../test_markdown/test_code_blocks.md');
        const content = fs.readFileSync(fixturePath, 'utf8');
        const { codeBlocks } = MarkdownParser.parseMarkdown(content);
        assert.strictEqual(codeBlocks.length, 3);
    });
});
