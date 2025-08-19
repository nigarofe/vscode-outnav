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

				const parents: string[] = [];
				if (currentIndentationLevel > 0) {
					let targetIndent = currentIndentationLevel - 1;
					let searchIndex = editor.selection.active.line - 1;

					while (targetIndent >= 0 && searchIndex >= 0) {
						let found = false;
						for (let i = searchIndex; i >= 0; i--) {
							const candidate = editor.document.lineAt(i).text;
							if (candidate.trim().length === 0) {continue;};
							const candidateIndent = (candidate.match(/\t/g) || []).length;
							if (candidateIndent === targetIndent) {
								parents.unshift(candidate);
								searchIndex = i - 1;
								targetIndent--;
								found = true;
								break;
							}
						}
						if (!found) {break;};
					}
				}

				const payload = {
					currentLineNumber,
					currentLineContent,
					currentIndentationLevel,
					parents
				};

				console.log(`Cursor update: ${JSON.stringify(payload)}`);

				mapping.panel.webview.postMessage({ type: 'cursorUpdate', payload });
			}
		})
	);
	
	openCorrespondingWebview(vscode.window.activeTextEditor, context);
	// console.log(`Active file (name): ${getActiveEditor(vscode.window.activeTextEditor)}`);
	console.log('Last line of activate()');
}


const fileWebviews: Record<string, { htmlFileName: string; scriptFileName:string; title: string ; panel: vscode.WebviewPanel | undefined }> = {
	"Outlines.txt": {
		htmlFileName: "outlinesWebview.html",
		scriptFileName: "outlinesWebview.js",
		title: "Outlines",
		panel: undefined
	},
	"Premises.md": {
		htmlFileName: "premisesWebview.html",
		scriptFileName: "premisesWebview.js",
		title: "Premises",
		panel: undefined
	},
	"Questions.md": {
		htmlFileName: "questionsWebview.html",
		scriptFileName: "questionsWebview.js",
		title: "Questions",
		panel: undefined
	}
};

async function openCorrespondingWebview(editor: vscode.TextEditor | undefined, context: vscode.ExtensionContext) {
	const fileName = getActiveEditor(editor);
	if(!fileName){
		// console.log("No active editor to open webview");
		return;
	}
	
	const mapping = fileWebviews[fileName];
	
	if (!mapping.panel) {
        mapping.panel = vscode.window.createWebviewPanel(
            fileName,
            mapping.title,
            vscode.ViewColumn.Two,
            { enableScripts: true }
        );

        // Clear the reference when disposed so it can be recreated later
        mapping.panel.onDidDispose(() => { mapping.panel = undefined; });
    }

	let htmlPath = path.join(context.extensionPath, "src", "webviews", mapping.htmlFileName);
	let html = await fs.readFile(htmlPath, 'utf8');

	const scriptUri = mapping.panel.webview.asWebviewUri(
        vscode.Uri.file(path.join(context.extensionPath, 'src', 'webviews', mapping.scriptFileName))
      );

	const csp = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src ${mapping.panel.webview.cspSource}; style-src ${mapping.panel.webview.cspSource} 'unsafe-inline';">`;

	html = html.replace('%%SCRIPT_URI%%', scriptUri.toString())
				.replace('%%CSP%%', csp);
	console.log(`Opening webview for: ${fileName}`);

	mapping.panel.reveal(mapping.panel.viewColumn, true);
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