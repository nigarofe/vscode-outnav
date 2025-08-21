import * as vscode from "vscode";
import * as path from "path";
import { promises as fs } from "fs";

export const possibleWebviews: Record<string, { htmlFileName: string; scriptFileName: string; title: string; panel: vscode.WebviewPanel | undefined }> = {
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
			{ viewColumn: vscode.ViewColumn.Two, preserveFocus: true },
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

	if (!mapping.panel) { return "No mapping panel"; };

	const nonce = getNonce();
	// create webview-safe URIs for resources
	const webview = mapping.panel.webview;

	const vscodeElementsJsOnDisk = vscode.Uri.file(path.join(context.extensionPath, 'node_modules', '@vscode-elements/', 'elements', 'dist', 'bundled.js'));
	const vscodeElementsJsUri = webview.asWebviewUri(vscodeElementsJsOnDisk).toString();

	const katexJsOnDisk = vscode.Uri.file(path.join(context.extensionPath, 'node_modules', 'katex', 'dist', 'katex.min.js'));
	const katexJsUri = webview.asWebviewUri(katexJsOnDisk).toString();

	const katexCssOnDisk = vscode.Uri.file(path.join(context.extensionPath, 'node_modules', 'katex', 'dist', 'katex.min.css'));
	const katexCssUri = webview.asWebviewUri(katexCssOnDisk).toString();

	// KaTeX auto-render extension provides renderMathInElement
	const katexAutoRenderOnDisk = vscode.Uri.file(path.join(context.extensionPath, 'node_modules', 'katex', 'dist',  'contrib', 'auto-render.min.js'));
	const katexAutoRenderUri = webview.asWebviewUri(katexAutoRenderOnDisk).toString();

	const sharedScriptJs = vscode.Uri.file(path.join(context.extensionPath, 'src', 'webviews', 'sharedScript.js'));
	const sharedScriptJsUri = webview.asWebviewUri(sharedScriptJs).toString();

	const scriptOnDisk = vscode.Uri.file(path.join(context.extensionPath, 'src', 'webviews', mapping.scriptFileName));
	const scriptUri = webview.asWebviewUri(scriptOnDisk).toString();

	// Allow fonts from the webview's resource origin so KaTeX's bundled font files can be loaded.
	const csp = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}' ${webview.cspSource}; style-src ${webview.cspSource} 'unsafe-inline'; font-src ${webview.cspSource};">`;
	html = html.replace('%%CSP%%', csp);

	// replace resource placeholders in the head template
	html = html.replace('%%TOOLKIT_JS_URI%%', vscodeElementsJsUri);
	html = html.replace('%%KATEX_JS_URI%%', katexJsUri);
	html = html.replace('%%KATEX_CSS_URI%%', katexCssUri);
	html = html.replace('%%KATEX_AUTO_RENDER_URI%%', katexAutoRenderUri);
	html = html.replace('%%SHARED_SCRIPT_URI%%', sharedScriptJsUri);
	html = html.replace('%%SCRIPT_URI%%', `<script type="module" nonce="${nonce}" src="${scriptUri}"></script>`);

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