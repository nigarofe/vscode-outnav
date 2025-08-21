import * as vscode from "vscode";
import * as path from "path";
import { openCorrespondingWebview } from "./webviews/sharedHtmlProvider";
import { generateMessageForOutlines } from "./webviews/outlinesMessageProvider";
import { generateMessageForPremises } from "./webviews/premisesMessageProvider";
import { generateMessageForQuestions } from "./webviews/questionsMessageProvider";
import { possibleWebviews } from './webviews/sharedHtmlProvider';

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.window.onDidChangeActiveTextEditor(e => {
			if (!e) return;
			openCorrespondingWebview(context, getActiveFileName(e));
		}),
	);

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
		generateMessageForOutlines(editor, possibleWebviews[activeFileName]);
	} else if (activeFileName === 'Premises.md') {
		generateMessageForPremises(editor, possibleWebviews[activeFileName]);
	} else if (activeFileName === 'Questions.md') {
		generateMessageForQuestions(editor, possibleWebviews[activeFileName]);
	}
}

function getActiveFileName(editor: vscode.TextEditor) {
	const fullPath = editor.document.uri.fsPath;
	const fileName = path.basename(fullPath);
	// console.log(`Active file (name): ${fileName}`);
	return `${fileName}`;
}