import * as vscode from "vscode";
import * as path from "path";
import { promises as fs } from "fs";

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

export async function openCorrespondingWebview(editor: vscode.TextEditor | undefined, context: vscode.ExtensionContext, fileName: string) {
	
	
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
	// console.log(`Opening webview for: ${fileName}`);

	mapping.panel.reveal(mapping.panel.viewColumn, true);
	mapping.panel.webview.html = html;
}