import * as vscode from "vscode";
import * as path from "path";
import { getHtmlForWebview } from "./webviews/sharedHtmlProvider";
import { generateMessageForOutlines } from "./webviews/outlinesMessageProvider";
import { generateMessageForPremises } from "./webviews/premisesMessageProvider";
import { generateMessageForQuestions } from "./webviews/questionsMessageProvider";
import { parseQuestionsToJson } from './parsers/questionsToJson';
import { possibleWebviews } from "./webviews-config";

export function activate(c: vscode.ExtensionContext) {
	const e = vscode.window.activeTextEditor;
	if (e) {
		ensureWebviewForEditor(c, e);
		updateWebview(e);
	}

	c.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(e => {
		if (!e) return;
		ensureWebviewForEditor(c, e);
	}));

	c.subscriptions.push(vscode.window.onDidChangeTextEditorSelection(e => {
		updateWebview(e.textEditor);
	}));

	c.subscriptions.push(vscode.workspace.onDidSaveTextDocument(async () => {
		const e = vscode.window.activeTextEditor;
		if (e) {
			await parseFileToJson(e);
			updateWebview(e);
		}
	}));

	vscode.window.showInformationMessage('Extension Fully Loaded');
}


async function parseFileToJson(e: vscode.TextEditor) {
	const activeFileName = getActiveFileName(e);
	let mapping = possibleWebviews[activeFileName];
	if (!mapping || !mapping.panel) return;

	switch (activeFileName) {
		case 'Outlines.txt':
			break;
		case 'Premises.md':
			break;
		case 'Questions.md':
			await parseQuestionsToJson();
			break;
		default:
			break;
	}
}

async function updateWebview(e: vscode.TextEditor) {
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
			break;
	}
	mapping.panel.webview.postMessage({ payload: payload });
}


async function ensureWebviewForEditor(c: vscode.ExtensionContext, e: vscode.TextEditor) {
	const activeFileName = getActiveFileName(e);
	const mapping = possibleWebviews[activeFileName];

	if (!mapping.panel) {
		mapping.panel = vscode.window.createWebviewPanel(
			activeFileName,
			mapping.title,
			{ viewColumn: vscode.ViewColumn.Two, preserveFocus: true },
			{ enableScripts: true }
		);
		mapping.panel.webview.html = await getHtmlForWebview(c.extensionPath, mapping);

		mapping.panel.onDidDispose(() => { mapping.panel = undefined; });
	}

	mapping.panel.reveal(mapping.panel.viewColumn, true);
}


function getActiveFileName(e: vscode.TextEditor) {
	const fullPath = e.document.uri.fsPath;
	const fileName = path.basename(fullPath);
	return fileName;
}