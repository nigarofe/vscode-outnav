import * as vscode from "vscode";
import * as path from "path";
import { promises as fs } from "fs";

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.window.onDidChangeActiveTextEditor(editor => openCorrespondingWebview(editor, context))
	);

	
	// Send cursor line updates to the matching webview when the selection changes
		context.subscriptions.push(
			vscode.window.onDidChangeTextEditorSelection(e => {
				const editor = e.textEditor;
				if (!editor || !editor.document) {return;}

				const fileName = path.basename(editor.document.uri.fsPath);
				const mapping = fileWebviews[fileName];
				if (mapping && mapping.panel) {
					const currentLineNumber = editor.selection.active.line + 1;
					const currentLineContent = editor.document.lineAt(editor.selection.active.line).text;
					const currentIndentationLevel = (currentLineContent.match(/\t/g) || []).length;
					let parentLine: string | undefined = undefined;

					if (currentIndentationLevel > 0) {
						for (let i = editor.selection.active.line - 1; i >= 0; i--) {
							const candidate = editor.document.lineAt(i).text;
							const candidateIndent = (candidate.match(/\t/g) || []).length;
							if (candidateIndent === currentIndentationLevel - 1) {
								parentLine = candidate;
								break;
							}
						}
					}

					console.log(`Cursor line: ${currentLineNumber}, Content: ${currentLineContent}, Indentation: ${currentIndentationLevel}, Parent: ${parentLine}`);

					mapping.panel.webview.postMessage({ type: 'currentLineNumber', currentLineNumber });
					mapping.panel.webview.postMessage({ type: 'currentLineContent', currentLineContent});
					mapping.panel.webview.postMessage({ type: 'currentIndentationLevel', currentIndentationLevel});
					mapping.panel.webview.postMessage({ type: 'parentLine', parentLine});
				}
			})
		);


	
	
	
	
	openCorrespondingWebview(vscode.window.activeTextEditor, context);
	// console.log(`Active file (name): ${getActiveEditor(vscode.window.activeTextEditor)}`);
	console.log('Last line of activate()');
}


const fileWebviews: Record<string, { htmlFileName: string; scriptFileName:string; panel: vscode.WebviewPanel }> = {
	"Outlines.txt": {
		htmlFileName: "outlinesWebview.html",
		scriptFileName: "outlinesWebview.js",
		panel: vscode.window.createWebviewPanel(
			"outlines",
			"Outlines",
			vscode.ViewColumn.Two,
			{ enableScripts: true }
		)
	},
	"Premises.md": {
		htmlFileName: "premisesWebview.html",
		scriptFileName: "premisesWebview.js",
		panel: vscode.window.createWebviewPanel(
			"premises",
			"Premises",
			vscode.ViewColumn.Two,
			{ enableScripts: true }
		)
	},
	"Questions.md": {
		htmlFileName: "questionsWebview.html",
		scriptFileName: "questionsWebview.js",
		panel: vscode.window.createWebviewPanel(
			"questions",
			"Questions",
			vscode.ViewColumn.Two,
			{ enableScripts: true }
		)
	}
};

async function openCorrespondingWebview(editor: vscode.TextEditor | undefined, context: vscode.ExtensionContext) {
	const fileName = getActiveEditor(editor);
	if(!fileName){
		// console.log("No active editor to open webview");
		return;
	}
	
	const mapping = fileWebviews[fileName];
	let htmlPath = path.join(context.extensionPath, "src", "webviews", mapping.htmlFileName);
	let html = await fs.readFile(htmlPath, 'utf8');

	const scriptUri = mapping.panel.webview.asWebviewUri(
        vscode.Uri.file(path.join(context.extensionPath, 'src', 'webviews', mapping.scriptFileName))
      );

	const csp = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src ${mapping.panel.webview.cspSource}; style-src ${mapping.panel.webview.cspSource} 'unsafe-inline';">`;

	html = html.replace('%%SCRIPT_URI%%', scriptUri.toString())
				.replace('%%CSP%%', csp);

	console.log(`Opening webview for: ${fileName}`);
	mapping.panel.reveal(vscode.ViewColumn.Beside, true);
	mapping.panel.webview.html = html;
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