import * as vscode from "vscode";
import * as path from "path";
import { promises as fs } from "fs";
import { openCorrespondingWebview } from "./webviews/sharedHtmlProvider";

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.window.onDidChangeActiveTextEditor(editor => {
			if (editor) {
				openCorrespondingWebview(context, getActiveFileName(editor));
			}
		}),
	);

	// Send cursor line updates to the matching webview when the selection changes
	// context.subscriptions.push(
	// 	vscode.window.onDidChangeTextEditorSelection(e => {
	// 		const editor = e.textEditor;
	// 		if (!editor || !editor.document) {return;}

	// 		const fileName = path.basename(editor.document.uri.fsPath);
	// 		const mapping = fileWebviews[fileName];
	// 		if (mapping && mapping.panel) {
	// 			const currentLineNumber = editor.selection.active.line + 1;
	// 			const currentLineContent = editor.document.lineAt(editor.selection.active.line).text;
	// 			const currentIndentationLevel = (currentLineContent.match(/\t/g) || []).length;

	// 			const parents: string[] = [];
	// 			if (currentIndentationLevel > 0) {
	// 				let targetIndent = currentIndentationLevel - 1;
	// 				let searchIndex = editor.selection.active.line - 1;

	// 				while (targetIndent >= 0 && searchIndex >= 0) {
	// 					let found = false;
	// 					for (let i = searchIndex; i >= 0; i--) {
	// 						const candidate = editor.document.lineAt(i).text;
	// 						if (candidate.trim().length === 0) {continue;};
	// 						const candidateIndent = (candidate.match(/\t/g) || []).length;
	// 						if (candidateIndent === targetIndent) {
	// 							parents.unshift(candidate);
	// 							searchIndex = i - 1;
	// 							targetIndent--;
	// 							found = true;
	// 							break;
	// 						}
	// 					}
	// 					if (!found) {break;};
	// 				}
	// 			}

	// 			const payload = {
	// 				currentLineNumber,
	// 				currentLineContent,
	// 				currentIndentationLevel,
	// 				parents
	// 			};

	// 			console.log(`Cursor update: ${JSON.stringify(payload)}`);

	// 			mapping.panel.webview.postMessage({ type: 'cursorUpdate', payload });
	// 		}
	// 	})
	// );

	if(vscode.window.activeTextEditor){
		openCorrespondingWebview(context, getActiveFileName(vscode.window.activeTextEditor));
	}
	
	console.log('Last line of activate()');
}

function getActiveFileName(editor: vscode.TextEditor) {
	const fullPath = editor.document.uri.fsPath;
	const fileName = path.basename(fullPath);
	// console.log(`Active file (name): ${fileName}`);
	return `${fileName}`;
}