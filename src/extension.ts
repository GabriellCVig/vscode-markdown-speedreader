import * as vscode from 'vscode';
import * as path from 'path';
import { FileReader } from './file_reader';
import { MarkdownParser } from './markdown_parser';
import { SpeedreadingUI } from './ui_module';

let speedreadingUI: SpeedreadingUI | undefined;

export function activate(context: vscode.ExtensionContext) {
	console.log('Markdown Speed Reader extension is now active!');

	// Initialize the speedreading UI
	speedreadingUI = new SpeedreadingUI();

	// Register command to speedread current file
	const speedreadFileCommand = vscode.commands.registerCommand('markdownspeedreader.speedreadFile', async () => {
		const activeEditor = vscode.window.activeTextEditor;
		if (!activeEditor) {
			vscode.window.showInformationMessage('No file is currently open. Please open a file to speedread.');
			return;
		}

		const document = activeEditor.document;
		const filePath = document.fileName;
		const fileExtension = path.extname(filePath).toLowerCase();

		// Check if file type is supported
		if (!['.md', '.txt', '.markdown'].includes(fileExtension)) {
			const proceed = await vscode.window.showWarningMessage(
				`File type '${fileExtension}' may not be optimized for speedreading. Continue anyway?`,
				'Yes', 'No'
			);
			if (proceed !== 'Yes') {
				return;
			}
		}

		let content = document.getText();
		console.log('[DEBUG EXT] File extension:', fileExtension);
		console.log('[DEBUG EXT] Raw file content length:', content.length);
		console.log('[DEBUG EXT] Raw content preview:', content.substring(0, 300));
		
		if (!content.trim()) {
			vscode.window.showWarningMessage('No readable text found in the current file.');
			return;
		}

		// Pass raw content to UI - let UI handle all parsing
		if (speedreadingUI) {
			speedreadingUI.show(content, context);
		}
	});

	// Register command to speedread selected text
	const speedreadSelectionCommand = vscode.commands.registerCommand('markdownspeedreader.speedreadSelection', async () => {
		const activeEditor = vscode.window.activeTextEditor;
		if (!activeEditor) {
			vscode.window.showInformationMessage('No file is currently open.');
			return;
		}

		const selection = activeEditor.selection;
		let selectedText = activeEditor.document.getText(selection);

		if (!selectedText.trim()) {
			vscode.window.showInformationMessage('No text is selected. Please select some text to speedread.');
			return;
		}

		// Pass raw selected text to UI - let UI handle all parsing
		if (speedreadingUI) {
			speedreadingUI.show(selectedText, context);
		}
	});

	// Register command to speedread from file path
	const speedreadFromFileCommand = vscode.commands.registerCommand('markdownspeedreader.speedreadFromFile', async () => {
		const fileUri = await vscode.window.showOpenDialog({
			canSelectFiles: true,
			canSelectFolders: false,
			canSelectMany: false,
			filters: {
				'Text Files': ['txt', 'md', 'markdown'],
				'All Files': ['*']
			}
		});

		if (!fileUri || fileUri.length === 0) {
			return;
		}

		const filePath = fileUri[0].fsPath;
		const content = FileReader.readFile(filePath);

		if (!content) {
			vscode.window.showErrorMessage('Failed to read the selected file.');
			return;
		}

		if (!content.trim()) {
			vscode.window.showWarningMessage('No readable text found in the selected file.');
			return;
		}

		// Pass raw content to UI - let UI handle all parsing
		if (speedreadingUI) {
			speedreadingUI.show(content, context);
		}
	});

	// Add commands to subscriptions
	context.subscriptions.push(
		speedreadFileCommand,
		speedreadSelectionCommand,
		speedreadFromFileCommand
	);
}

export function deactivate() {
	if (speedreadingUI) {
		speedreadingUI.dispose();
		speedreadingUI = undefined;
	}
}
