import * as vscode from "vscode";
import * as path from "path";
import { openCorrespondingWebview } from "./webviews/sharedHtmlProvider";
import { generateMessageForOutlines } from "./webviews/outlinesMessageProvider";
import { generateMessageForPremises } from "./webviews/premisesMessageProvider";
import { generateMessageForQuestions } from "./webviews/questionsMessageProvider";
import { possibleWebviews } from './webviews/sharedHtmlProvider';
import { parseQuestionsToJson } from './parsers/questionsToJson';

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.window.onDidChangeActiveTextEditor(e => {
			if (!e) return;
			openCorrespondingWebview(context, getActiveFileName(e));
		}),
	);

	context.subscriptions.push(
		vscode.window.onDidChangeTextEditorSelection(e => {
			generateMessageForWebview(e.textEditor);
		})
	);

	context.subscriptions.push(
		vscode.workspace.onDidChangeTextDocument(e => {
			parseQuestionsToJson();
		})
	);

	// Initialization
	const e = vscode.window.activeTextEditor;
	if (e) {
		openCorrespondingWebview(context, getActiveFileName(e));
		generateMessageForWebview(e);
	}

	vscode.window.showInformationMessage('Last line of activate() reached');
}

async function generateMessageForWebview(e: vscode.TextEditor) {
	const activeFileName = getActiveFileName(e);
	let mapping = possibleWebviews[activeFileName];
	if (!mapping || !mapping.panel) return;

	let payload: {} = {};
	switch (activeFileName) {
		case 'Outlines.txt':
			payload = await generateMessageForOutlines(e);
			break;
		case 'Premises.md':
			payload = await generateMessageForPremises(e);
			break;
		case 'Questions.md':
			payload = await generateMessageForQuestions(e);
			break;
		default:
			// leave payload as empty object
			break;
	}
	mapping.panel.webview.postMessage({ type: 'onDidChangeTextEditorSelection', payload: payload });
}

function getActiveFileName(e: vscode.TextEditor) {
	const fullPath = e.document.uri.fsPath;
	const fileName = path.basename(fullPath);
	// console.log(`Active file (name): ${fileName}`);
	return `${fileName}`;
}