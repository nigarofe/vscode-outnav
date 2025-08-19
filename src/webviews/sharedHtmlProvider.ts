import * as vscode from "vscode";
import * as path from "path";
import { promises as fs } from "fs";

export const possibleWebviews: Record<string, { htmlFileName: string; scriptFileName: string; title: string ; panel: vscode.WebviewPanel | undefined }> = {
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
		mapping.panel.webview.html = await getHtmlForWebview(context, fileName);

        mapping.panel.onDidDispose(() => { mapping.panel = undefined; });
    }
    
	mapping.panel.reveal(mapping.panel.viewColumn, true);
}

async function getHtmlForWebview(context: vscode.ExtensionContext, fileName: string) {
	const mapping = possibleWebviews[fileName];

	const htmlHeadPath = path.join(context.extensionPath, "src", "webviews", "sharedHead.html");
	let html = await fs.readFile(htmlHeadPath, 'utf8');

	if(!mapping.panel){return "No mapping panel";};

	const nonce = getNonce();
	// create webview-safe URIs for resources
	const webview = mapping.panel.webview;
	const bootstrapCssOnDisk = vscode.Uri.file(path.join(context.extensionPath, 'node_modules', 'bootstrap', 'dist', 'css', 'bootstrap.min.css'));
	const bootstrapJsOnDisk = vscode.Uri.file(path.join(context.extensionPath, 'node_modules', 'bootstrap', 'dist', 'js', 'bootstrap.esm.js'));

	const bootstrapCssUri = webview.asWebviewUri(bootstrapCssOnDisk).toString();
	const bootstrapJsUri = webview.asWebviewUri(bootstrapJsOnDisk).toString();
	const scriptOnDisk = vscode.Uri.file(path.join(context.extensionPath, 'src', 'webviews', mapping.scriptFileName));
	const scriptUri = webview.asWebviewUri(scriptOnDisk).toString();

	const csp = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}' ${webview.cspSource}; style-src ${webview.cspSource} 'unsafe-inline';">`;
	html = html.replace('%%CSP%%', csp);

	// replace resource placeholders in the head template
	html = html.replace('%%BOOTSTRAP_CSS_URI%%', bootstrapCssUri);
	html = html.replace('%%BOOTSTRAP_JS_URI%%', bootstrapJsUri);
	html = html.replace('%%SCRIPT_URI%%', `<script type=\"module\" nonce=\"${nonce}\" src=\"${scriptUri}\"></script>`);

	const htmlPath = path.join(context.extensionPath, "src", "webviews", mapping.htmlFileName);
	html += await fs.readFile(htmlPath, 'utf8');
	html = html.replace('%%NONCE%%', nonce);

	html += '</html>';
	return html;
}






function getNonce() { 
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) { text += possible.charAt(Math.floor(Math.random() * possible.length)); }
	return text;
}