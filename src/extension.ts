import * as vscode from "vscode";
import * as path from "path";
import { promises as fs } from "fs";
import { openCorrespondingWebview } from "./webviews/sharedHtmlProvider";
import { generateMessageForOutlines } from "./webviews/outlinesMessageProvider";

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.window.onDidChangeActiveTextEditor(editor => {
			if (editor) {
				openCorrespondingWebview(context, getActiveFileName(editor));
			}
		}),
	);

	// Send cursor line updates to the matching webview when the selection changes
	context.subscriptions.push(
		vscode.window.onDidChangeTextEditorSelection(e => {
			generateMessageForOutlines(e.textEditor);
		})
	);

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