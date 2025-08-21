import * as vscode from "vscode";
import * as path from "path";
import { promises as fs } from "fs";
import { possibleWebviews } from "../webviews-config";

export async function getHtmlForWebview(ep: string, mapping: typeof possibleWebviews[keyof typeof possibleWebviews]): Promise<string> {
	if (!mapping.panel) { return "No mapping panel"; };

	const uri = vscode.Uri.file;
	const vscodeElementsJsOnDisk = uri(path.join(ep, 'node_modules', '@vscode-elements/', 'elements', 'dist', 'bundled.js'));
	const katexJsOnDisk = uri(path.join(ep, 'node_modules', 'katex', 'dist', 'katex.min.js'));
	const katexCssOnDisk = uri(path.join(ep, 'node_modules', 'katex', 'dist', 'katex.min.css'));
	const katexAutoRenderOnDisk = uri(path.join(ep, 'node_modules', 'katex', 'dist', 'contrib', 'auto-render.min.js'));
	const markdownItOnDisk = uri(path.join(ep, 'node_modules', 'markdown-it', 'dist', 'markdown-it.min.js'));
	const sharedScriptJs = uri(path.join(ep, 'src', 'webviews', 'sharedScript.js'));
	const scriptOnDisk = uri(path.join(ep, 'src', 'webviews', mapping.scriptFileName));
	const htmlHeadPath = path.join(ep, "src", "webviews", "sharedHead.html");
	const htmlPath = path.join(ep, "src", "webviews", mapping.htmlFileName);

	const webview = mapping.panel.webview;
	const vscodeElementsJsUri = webview.asWebviewUri(vscodeElementsJsOnDisk).toString();
	const katexJsUri = webview.asWebviewUri(katexJsOnDisk).toString();
	const katexCssUri = webview.asWebviewUri(katexCssOnDisk).toString();
	const katexAutoRenderUri = webview.asWebviewUri(katexAutoRenderOnDisk).toString();
	const markdownItUri = webview.asWebviewUri(markdownItOnDisk).toString();
	const sharedScriptJsUri = webview.asWebviewUri(sharedScriptJs).toString();
	const scriptUri = webview.asWebviewUri(scriptOnDisk).toString();

	const nonce = getNonce();
	let html = await fs.readFile(htmlHeadPath, 'utf8');
	const csp = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-%%NONCE%%' ${webview.cspSource}; style-src ${webview.cspSource} 'unsafe-inline'; font-src ${webview.cspSource};">`;
	html = html
		.replace('%%CSP%%', csp)
		.replace('%%TOOLKIT_JS_URI%%', vscodeElementsJsUri)
		.replace('%%KATEX_JS_URI%%', katexJsUri)
		.replace('%%KATEX_CSS_URI%%', katexCssUri)
		.replace('%%KATEX_AUTO_RENDER_URI%%', katexAutoRenderUri)
		.replace('%%MARKDOWNIT_JS_URI%%', markdownItUri)
		.replace('%%SHARED_SCRIPT_URI%%', sharedScriptJsUri)
		.replace('%%SCRIPT_URI%%', `<script type="module" nonce=%%NONCE%% src="${scriptUri}"></script>`);

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