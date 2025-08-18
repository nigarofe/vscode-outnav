import * as vscode from "vscode";
import * as path from "path";
import { promises as fs } from "fs";

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.window.onDidChangeActiveTextEditor(editor => openCorrespondingWebview(editor, context))
	);

	openCorrespondingWebview(vscode.window.activeTextEditor, context);
	// console.log(`Active file (name): ${getActiveEditor(vscode.window.activeTextEditor)}`);
	console.log('Last line of activate()');
}

function getActiveEditor(editor?: vscode.TextEditor) {
	if (editor && editor.document) {
		const fullPath = editor.document.uri.fsPath;
		const fileName = path.basename(fullPath);
		// console.log(`Active file (name): ${fileName}`);
		return `${fileName}`;
	} else {
		return undefined;
	}
}

const fileWebviews: Record<string, { htmlFileName: string; panel: vscode.WebviewPanel }> = {
	"Outlines.txt": {
		htmlFileName: "outlines.html",
		panel: vscode.window.createWebviewPanel(
			"outlines",
			"Outlines",
			vscode.ViewColumn.Two,
			{}
		)
	},
	"Premises.md":{
		htmlFileName: "premises.html",
		panel: vscode.window.createWebviewPanel(
			"premises",
			"Premises",
			vscode.ViewColumn.Two,
			{}
		)
	},
	"Questions.md": {
		htmlFileName: "questions.html",
		panel: vscode.window.createWebviewPanel(
			"questions",
			"Questions",
			vscode.ViewColumn.Two,
			{}
		)
	}
};

async function openCorrespondingWebview(editor: vscode.TextEditor | undefined, context: vscode.ExtensionContext) {
	const fileName = getActiveEditor(editor);
	if(!fileName){
		console.log("No active editor to open webview");
		return;
	}
	
	const mapping = fileWebviews[fileName];
	let htmlPath = path.join(context.extensionPath, "src", "webviews", mapping.htmlFileName);
	let html = await fs.readFile(htmlPath, 'utf8');

	console.log(`Opening webview for: ${fileName}`);
	mapping.panel.reveal(vscode.ViewColumn.Beside, true);
	mapping.panel.webview.html = html;
}