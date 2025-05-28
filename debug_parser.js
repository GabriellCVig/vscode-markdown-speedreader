// Simple debug script to test markdown parsing
const fs = require('fs');

// Mock the markdown-it module since we might not have it compiled
const markdownit = require('markdown-it');

class MarkdownParser {
    static md = markdownit();

    static parseMarkdown(markdownText) {
        const codeBlocks = [];
        
        // Extract actual code blocks (triple+ backticks) first
        const codeBlockRegex = /(```+)([\s\S]*?)\1/g;
        let match;
        while ((match = codeBlockRegex.exec(markdownText)) !== null) {
            codeBlocks.push(match[0]);
        }
        
        // Remove code blocks but preserve inline code
        let textWithoutCodeBlocks = markdownText.replace(codeBlockRegex, ' [CODE BLOCK] ');
        
        // Handle inline code based on length
        textWithoutCodeBlocks = textWithoutCodeBlocks.replace(/`([^`]+)`/g, (match, content) => {
            if (content.length <= 20) {
                return `«code:short»${content}«/code»`;
            } else {
                codeBlocks.push(match);
                return ' [CODE BLOCK] ';
            }
        });
        
        // Convert to HTML then extract text content
        const html = MarkdownParser.md.render(textWithoutCodeBlocks);
        
        // Simple HTML tag removal to get plain text
        const parsedText = html
            .replace(/<[^>]*>/g, ' ') // Remove HTML tags
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();

        return { parsedText, codeBlocks };
    }
}

// Test with our markdown file
const content = fs.readFileSync('test_code_blocks.md', 'utf8');
const result = MarkdownParser.parseMarkdown(content);

console.log('=== PARSED TEXT ===');
console.log(result.parsedText);
console.log('\n=== CODE BLOCKS ===');
result.codeBlocks.forEach((block, i) => {
    console.log(`Block ${i}:`);
    console.log(block);
    console.log('---');
});

console.log('\n=== WORDS (first 30) ===');
const words = result.parsedText.split(/\s+/).filter(word => word.trim().length > 0);
console.log(words.slice(0, 30));

console.log('\n=== [CODE BLOCK] POSITIONS ===');
words.forEach((word, i) => {
    if (word === '[CODE' || word === 'BLOCK]' || word.includes('[CODE') || word.includes('BLOCK]')) {
        console.log(`Position ${i}: "${word}"`);
    }
});
