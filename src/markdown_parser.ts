import markdownit from 'markdown-it';

export class MarkdownParser {
    private static md = new markdownit();

    /**
     * Parses Markdown content, removing formatting and identifying code blocks.
     * @param markdownText The Markdown text to parse.
     * @param maxInlineCodeLength Inline-code spans up to this length stay inline;
     *                            longer spans are treated as code blocks. Default 20.
     * @returns An object containing the parsed text and an array of code blocks.
     */
    public static parseMarkdown(markdownText: string, maxInlineCodeLength: number = 20): { parsedText: string; codeBlocks: string[] } {
        const codeBlocks: string[] = [];
        let codeBlockIndex = 0;
        
        // Extract actual code blocks (triple+ backticks) first
        // This regex properly matches code blocks by ensuring the closing backticks
        // have at least as many backticks as the opening
        const codeBlockRegex = /(```+)([\s\S]*?)\1/g;
        let match;
        while ((match = codeBlockRegex.exec(markdownText)) !== null) {
            codeBlocks.push(match[0]);
        }
        
        // Remove code blocks and replace with indexed tokens
        let textWithoutCodeBlocks = markdownText.replace(codeBlockRegex, () => {
            return ` [CODE BLOCK ${codeBlockIndex++}] `;
        });
        
        // Handle inline code based on length
        // Short inline code (<= maxInlineCodeLength chars) gets special styling markers
        // Longer inline code gets treated as code blocks
        textWithoutCodeBlocks = textWithoutCodeBlocks.replace(/`([^`]+)`/g, (match, content) => {
            if (content.length <= maxInlineCodeLength) {
                // Short inline code - preserve for consolas styling
                return `«code:short»${content}«/code»`;
            } else {
                // Long inline code - treat as code block
                codeBlocks.push(match);
                return ` [CODE BLOCK ${codeBlockIndex++}] `;
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

    /**
     * Determines if the content is likely markdown based on common markdown patterns.
     * @param content The content to check.
     * @returns True if content appears to be markdown.
     */
    public static isMarkdown(content: string): boolean {
        const markdownPatterns = [
            /^#{1,6}\s/m, // Headers
            /\*\*.*\*\*/, // Bold
            /\*.*\*/, // Italic
            /\[.*\]\(.*\)/, // Links
            /```[\s\S]*?```/, // Code blocks
            /^\s*[-*+]\s/m, // Lists
            /^\s*\d+\.\s/m // Numbered lists
        ];
        
        console.log('[DEBUG PARSER] Testing markdown patterns on content:');
        console.log('[DEBUG PARSER] Content preview:', content.substring(0, 200));
        
        const results = markdownPatterns.map((pattern, index) => {
            const patternNames = ['Headers', 'Bold', 'Italic', 'Links', 'Code blocks', 'Lists', 'Numbered lists'];
            const matches = pattern.test(content);
            console.log(`[DEBUG PARSER] Pattern ${index} (${patternNames[index]}): ${matches}`);
            return matches;
        });
        
        const isMarkdown = results.some(result => result);
        console.log('[DEBUG PARSER] Final isMarkdown result:', isMarkdown);
        
        return isMarkdown;
    }
}
