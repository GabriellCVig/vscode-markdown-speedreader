import * as fs from 'fs';
import * as vscode from 'vscode';

export class FileReader {
    /**
     * Reads the content of a file.
     * @param filePath The path to the file.
     * @returns The content of the file as a string, or null if an error occurred.
     */
    public static readFile(filePath: string): string | null {
        try {
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            return fileContent;
        } catch (error) {
            vscode.window.showErrorMessage(`Error reading file: ${error}`);
            return null;
        }
    }
}
