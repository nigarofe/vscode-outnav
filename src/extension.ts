// General
import * as vscode from "vscode";
import * as path from "path";
export const workspaceRoot = path.resolve(__dirname, '..');
export const workspaceDir = path.join(workspaceRoot, 'outnav-workspace');
export const jsonExportsDir = path.join(workspaceRoot, 'src', 'json_exports');

// Questions.md
import { generateMessageForQuestions } from "./webviews/questions";
import { parseQuestionsToJson } from './parsers/questionsToJson';
let questionsPanel: Promise<vscode.WebviewPanel> | null = null;



// Outlines.md
import { generateMessageForOutlines } from "./webviews/outlines";
import { parseOutlinesToJson } from './parsers/outlinesToJson';
let outlinesPanel: Promise<vscode.WebviewPanel> | null = null;

// Premises.md
let premisesPanel: Promise<vscode.WebviewPanel> | null = null;
import { generateMessageForPremises } from "./webviews/premises";
import { getHtmlForWebview } from "./webviews/sharedHtmlProvider";


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


async function createPanelForFile(filename: string): Promise<vscode.WebviewPanel> {
	const baseName = path.parse(filename).name;
	let panel = vscode.window.createWebviewPanel(
		baseName,
		baseName,
		{ viewColumn: vscode.ViewColumn.Two, preserveFocus: true },
		{
			enableScripts: true,
		}
	);
	panel.webview.html = await getHtmlForWebview(workspaceRoot, panel.webview, filename);

	// when the panel is disposed, clear the cached promise so a new panel can be created later
	panel.onDidDispose(() => {
		const base = path.parse(filename).name + '.md';
		switch (base) {
			case 'Outlines.md': outlinesPanel = null; break;
			case 'Questions.md': questionsPanel = null; break;
			case 'Premises.md': premisesPanel = null; break;
		}
	});
	return panel;
}

export async function getPanelForFile(fileName: string): Promise<vscode.WebviewPanel> {
	switch (fileName) {
		case 'Outlines.md':
			if (!outlinesPanel) outlinesPanel = createPanelForFile('Outlines.md');
			return await outlinesPanel;
		case 'Premises.md':
			if (!premisesPanel) premisesPanel = createPanelForFile('Premises.md');
			return await premisesPanel;
		case 'Questions.md':
			if (!questionsPanel) questionsPanel = createPanelForFile('Questions.md');
			return await questionsPanel;
	}
	return vscode.window.createWebviewPanel('none', 'Error', vscode.ViewColumn.Two, { enableScripts: true });
}

async function ensurePanelForCurrentFile(e: vscode.TextEditor) {
	const currentFileName = getCurrentFileName(e);
	const currentPanel = await getPanelForFile(currentFileName);
	if (currentPanel) await currentPanel.reveal(currentPanel.viewColumn, true);
}

async function sendPayloadToCurrentPanel(e: vscode.TextEditor) {
	const currentFileName = getCurrentFileName(e);
	console.log('sending payload to current panel. Filename = ', currentFileName);
	const currentPanel = await getPanelForFile(currentFileName);
	const payload = await getPayloadForCurrentPanel(e);
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