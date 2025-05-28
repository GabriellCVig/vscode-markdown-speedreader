// Debug script to test markdown parsing
const markdownContent = `# Test Code Blocks Feature

This is a test file to verify the side-by-side code block display feature in the speed reader.

Here's some regular text before the first code block. This should appear in normal speed reading mode.

\`\`\`javascript
function greetUser(name) {
    const greeting = \`Hello, \${name}!\`;
    console.log(greeting);
    return greeting;
}

// Call the function
greetUser("World");
\`\`\`

After the first code block, we have more regular text. The code should have been displayed in the side panel while this text continues in the speed reader.

Here's another code block with a different language:

\`\`\`python
def calculate_fibonacci(n):
    if n <= 1:
        return n
    else:
        return calculate_fibonacci(n-1) + calculate_fibonacci(n-2)

# Example usage
for i in range(10):
    print(f"Fibonacci({i}) = {calculate_fibonacci(i)}")
\`\`\`

And some more text after the second code block. The side panel should now show the Python code.

Let's add one more code block without language specification:

\`\`\`
This is a generic code block
without any specific language.
It should still display properly
in the side panel.
\`\`\`

Finally, we end with some regular text to ensure the code panel hides when no more code blocks are encountered.`;

// Simple markdown-it setup
const MarkdownIt = require('markdown-it');
const md = new MarkdownIt();

// Code block extraction logic from the parser
const codeBlocks = [];
const codeBlockRegex = /(```+)([\s\S]*?)\1/g;
let match;
let codeBlockIndex = 0;

console.log('=== EXTRACTING CODE BLOCKS ===');
while ((match = codeBlockRegex.exec(markdownContent)) !== null) {
    console.log(`Code Block ${codeBlockIndex}:`, match[0]);
    codeBlocks.push(match[0]);
    codeBlockIndex++;
}

console.log('\n=== TOTAL CODE BLOCKS FOUND ===');
console.log('Count:', codeBlocks.length);

// Test replacement logic
let textWithoutCodeBlocks = markdownContent.replace(codeBlockRegex, ' [CODE BLOCK] ');

console.log('\n=== TEXT WITH REPLACEMENTS ===');
console.log(textWithoutCodeBlocks);

// Check for inline code
textWithoutCodeBlocks = textWithoutCodeBlocks.replace(/`([^`]+)`/g, (match, content) => {
    if (content.length <= 20) {
        return `«code:short»${content}«/code»`;
    } else {
        codeBlocks.push(match);
        return ' [CODE BLOCK] ';
    }
});

// Convert to HTML then extract text
const html = md.render(textWithoutCodeBlocks);
const parsedText = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

console.log('\n=== FINAL PARSED TEXT ===');
console.log(parsedText);

console.log('\n=== WORDS ARRAY ===');
const words = parsedText.split(/\s+/).filter(word => word.trim().length > 0);
words.forEach((word, index) => {
    if (word === '[CODE' || word === 'BLOCK]') {
        console.log(`Word ${index}: "${word}" <-- CODE BLOCK TOKEN`);
    }
});

console.log('\n=== EXTRACTED CODE BLOCKS ===');
codeBlocks.forEach((block, index) => {
    console.log(`Block ${index}:`, block);
});
