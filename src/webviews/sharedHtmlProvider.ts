import * as vscode from "vscode";
import * as path from "path";
import { promises as fs } from "fs";
import { get } from "http";

const possibleWebviews: Record<string, { htmlFileName: string; scriptFileName:string; title: string ; panel: vscode.WebviewPanel | undefined }> = {
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

export async function openCorrespondingWebview(context: vscode.ExtensionContext, fileName: string) {
	// console.log(`Opening webview for: ${fileName}`);
    const mapping = possibleWebviews[fileName];
	
	if (!mapping.panel) {
        mapping.panel = vscode.window.createWebviewPanel(
            fileName,
            mapping.title,
            vscode.ViewColumn.Two,
            { enableScripts: true }
        );
        mapping.panel.onDidDispose(() => { mapping.panel = undefined; });
    }

    mapping.panel.webview.html = await getHtmlForWebview(fileName, context);
	mapping.panel.reveal(mapping.panel.viewColumn, true);
}

async function getHtmlForWebview(fileName: string, context: vscode.ExtensionContext) {
	const mapping = possibleWebviews[fileName];

	const htmlHeadPath = path.join(context.extensionPath, "src", "webviews", "sharedHead.html");
	let html = await fs.readFile(htmlHeadPath, 'utf8');

	const htmlPath = path.join(context.extensionPath, "src", "webviews", mapping.htmlFileName);
    const jsPath = path.join(context.extensionPath, "src", "webviews", mapping.scriptFileName);

	html += await fs.readFile(htmlPath, 'utf8');

	if(!mapping.panel){return "No mapping panel";};
	const scriptUri = mapping.panel.webview.asWebviewUri(vscode.Uri.file(jsPath));
	const csp = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src ${mapping.panel.webview.cspSource}; style-src ${mapping.panel.webview.cspSource} 'unsafe-inline';">`;

	html = html.replace('%%SCRIPT_URI%%', scriptUri.toString()).replace('%%CSP%%', csp);

	if(fileName === "Outlines.txt"){
		
	}
	return html;
}