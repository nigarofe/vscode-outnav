import * as vscode from "vscode";
import * as path from "path";
import { openCorrespondingWebview, possibleWebviews } from "./webviews/sharedHtmlProvider";
import { generateMessageForOutlines } from "./webviews/outlinesMessageProvider";
import { generateMessageForPremises } from "./webviews/premisesMessageProvider";
import { generateMessageForQuestions } from "./webviews/questionsMessageProvider";

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
			generateMessageForWebview(e.textEditor, getActiveFileName(e.textEditor));
		})
	);

	// Initialization
	if (vscode.window.activeTextEditor) {
		openCorrespondingWebview(context, getActiveFileName(vscode.window.activeTextEditor));
		generateMessageForWebview(vscode.window.activeTextEditor, getActiveFileName(vscode.window.activeTextEditor));
	}

	vscode.window.showInformationMessage('Last line of activate() reached');
}

function generateMessageForWebview(editor: vscode.TextEditor, activeFileName: string) {
	if (activeFileName === 'Outlines.txt') {
		generateMessageForOutlines(editor);
	} else if (activeFileName === 'Premises.md') {
		generateMessageForPremises(editor);
	} else if (activeFileName === 'Questions.md') {
		generateMessageForQuestions(editor);
	}
}

function getActiveFileName(editor: vscode.TextEditor) {
	const fullPath = editor.document.uri.fsPath;
	const fileName = path.basename(fullPath);
	// console.log(`Active file (name): ${fileName}`);
	return `${fileName}`;
}