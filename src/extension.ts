// General
import * as vscode from "vscode";
import * as path from "path";
export const workspaceRoot = path.resolve(__dirname, '..');
export const workspaceDir = path.join(workspaceRoot, 'outnav-workspace');
export const jsonExportsDir = path.join(workspaceRoot, 'src', 'json_exports');

// Questions.md
import { generateMessageForQuestions } from "./webviews/questions";
import { parseQuestionsToJson } from './parsers/questionsToJson';
let questionsPanel = createPanelForFile('Questions.md');

// Outlines.md
import { generateMessageForOutlines } from "./webviews/outlines";
import { parseOutlinesToJson } from './parsers/outlinesToJson';
let outlinesPanel = createPanelForFile('Outlines.md');

// Premises.md
let premisesPanel = createPanelForFile('Premises.md');
import { generateMessageForPremises } from "./webviews/premises";


export function activate(c: vscode.ExtensionContext) {
	const e = vscode.window.activeTextEditor;
	if (e) {
		ensurePanelForCurrentFile(e);
		sendPayloadToCurrentPanel(e);
	}

	c.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(e => {
		if (!e) return;
		ensurePanelForCurrentFile(e);
	}));

	c.subscriptions.push(vscode.window.onDidChangeTextEditorSelection(e => {
		sendPayloadToCurrentPanel(e.textEditor);
	}));

	c.subscriptions.push(vscode.workspace.onDidSaveTextDocument(async () => {
		const e = vscode.window.activeTextEditor;
		if (e) {
			await parseFileToJson(getCurrentFileName(e));
			sendPayloadToCurrentPanel(e);
		}
	}));

	vscode.window.showInformationMessage('Extension Fully Loaded');
}

function createPanelForFile(filename: string): vscode.WebviewPanel {
	const baseName = path.parse(filename).name;
	return vscode.window.createWebviewPanel(
		baseName,
		baseName,
		{ viewColumn: vscode.ViewColumn.Two, preserveFocus: true },
		{
			enableScripts: true,
			// localResourceRoots: [
			// 	vscode.Uri.file(path.join(c.extensionPath, 'node_modules')),
			// 	vscode.Uri.file(path.join(c.extensionPath, 'src')),
			// 	vscode.Uri.file(path.join(c.extensionPath, 'outnav-workspace'))
			// ]
		}
	);
}

export function getPanelForFile(fileName: string): vscode.WebviewPanel {
	switch (fileName) {
		case 'Outlines.md':
			return outlinesPanel;
		case 'Premises.md':
			return premisesPanel;
		case 'Questions.md':
			return questionsPanel;
	}
	return vscode.window.createWebviewPanel('none', 'Error', vscode.ViewColumn.Two, { enableScripts: true });
}

async function ensurePanelForCurrentFile(e: vscode.TextEditor) {
	const currentFileName = getCurrentFileName(e);
	const currentPanel = getPanelForFile(currentFileName);
	if (currentPanel) currentPanel.reveal(currentPanel.viewColumn, true);
}

async function sendPayloadToCurrentPanel(e: vscode.TextEditor) {
	const currentFileName = getCurrentFileName(e);
	const currentPanel = getPanelForFile(currentFileName);
	const payload = getPayloadForCurrentPanel(e);
	currentPanel?.webview.postMessage({ payload: payload });
}

function getCurrentFileName(e: vscode.TextEditor) {
	const fullPath = e.document.uri.fsPath;
	const fileName = path.basename(fullPath);
	return fileName;
}

function getPayloadForCurrentPanel(e: vscode.TextEditor): Promise<any> | null {
	const currentFileName = getCurrentFileName(e);
	switch (currentFileName) {
		case 'Outlines.md':
			return generateMessageForOutlines(e);
		case 'Premises.md':
			// return generateMessageForPremises(e);
			return null;
		case 'Questions.md':
			return generateMessageForQuestions(e);
		default:
			return null;
	}
}

async function parseFileToJson(currentFileName: string) {
	switch (currentFileName) {
		case 'Outlines.md':
			await parseOutlinesToJson();
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