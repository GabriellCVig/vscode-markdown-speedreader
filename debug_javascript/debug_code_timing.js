// Debug script to test code block token handling
const fs = require('fs');

// Simulate the markdown parser behavior
function parseMarkdown(markdownText) {
    const codeBlocks = [];
    
    // Extract actual code blocks (triple+ backticks) first
    const codeBlockRegex = /(```+)([\s\S]*?)\1/g;
    let match;
    while ((match = codeBlockRegex.exec(markdownText)) !== null) {
        codeBlocks.push(match[0]);
    }
    
    // Remove code blocks but preserve inline code
    let textWithoutCodeBlocks = markdownText.replace(codeBlockRegex, ' [CODE BLOCK] ');
    
    // Handle inline code
    textWithoutCodeBlocks = textWithoutCodeBlocks.replace(/`([^`]+)`/g, (match, content) => {
        if (content.length <= 20) {
            return `«code:short»${content}«/code»`;
        } else {
            codeBlocks.push(match);
            return ' [CODE BLOCK] ';
        }
    });
    
    // Simple HTML tag removal
    const parsedText = textWithoutCodeBlocks
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    return { parsedText, codeBlocks };
}

// Test with system design document
try {
    const content = fs.readFileSync('system_design_document.md', 'utf8');
    const result = parseMarkdown(content);
    
    console.log('=== PARSED TEXT PREVIEW ===');
    console.log(result.parsedText.substring(0, 500) + '...');
    
    console.log('\n=== WORD TOKENS (first 50) ===');
    const words = result.parsedText.split(/\s+/).filter(word => word.trim().length > 0);
    words.slice(0, 50).forEach((word, index) => {
        console.log(`${index}: "${word}"`);
    });
    
    console.log('\n=== CODE BLOCK TOKENS IN SEQUENCE ===');
    words.forEach((word, index) => {
        if (word === '[CODE' || word === 'BLOCK]') {
            console.log(`${index}: "${word}"`);
        }
    });
    
    console.log('\n=== CODE BLOCKS FOUND ===');
    result.codeBlocks.forEach((block, index) => {
        const preview = block.substring(0, 100).replace(/\n/g, '\\n');
        console.log(`Block ${index}: ${preview}...`);
    });
    
} catch (error) {
    console.error('Error:', error.message);
}
