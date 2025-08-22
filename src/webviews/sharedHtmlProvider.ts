import * as vscode from "vscode";
import * as path from "path";
import { promises as fs } from "fs";
import { possibleWebviews } from "../webviews-config";

/**
 * Generates HTML for webviews with proper Content Security Policy and image URI handling.
 * 
 * This module solves the image loading issue in VS Code webviews by:
 * 1. Adding img-src to the Content Security Policy to allow image loading
 * 2. Scanning workspace directories for image files and creating URI mappings
 * 3. Injecting these mappings into the webview as window.imageUriMappings
 * 4. Using client-side JavaScript to convert relative image paths to webview URIs
 * 
 * The conversion happens in sharedScript.js during markdown-to-HTML processing.
 */

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

	// Generate image URI mappings for the workspace to convert relative paths to webview URIs
	const imageUriMappings = await generateImageUriMappings(ep, webview);

	const nonce = getNonce();
	let html = await fs.readFile(htmlHeadPath, 'utf8');

	// Build Content Security Policy with image source support
	const csp = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}' ${webview.cspSource}; style-src ${webview.cspSource} 'unsafe-inline'; font-src ${webview.cspSource}; img-src ${webview.cspSource};">`;

	// Replace all template placeholders with actual values
	html = html
		.replace('%%CSP%%', csp)
		.replace('%%TOOLKIT_JS_URI%%', vscodeElementsJsUri)
		.replace('%%KATEX_JS_URI%%', katexJsUri)
		.replace('%%KATEX_CSS_URI%%', katexCssUri)
		.replace('%%KATEX_AUTO_RENDER_URI%%', katexAutoRenderUri)
		.replace('%%MARKDOWNIT_JS_URI%%', markdownItUri)
		.replace('%%SHARED_SCRIPT_URI%%', sharedScriptJsUri)
		.replace('%%SCRIPT_URI%%', `<script type="module" nonce="${nonce}" src="${scriptUri}"></script>`)
		.replace(/"%%IMAGE_URI_MAPPINGS%%"/g, JSON.stringify(imageUriMappings))
		.replace(/%%NONCE%%/g, nonce);

	html += await fs.readFile(htmlPath, 'utf8');
	html += '</html>';

	return html;
}

function getNonce() {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) { text += possible.charAt(Math.floor(Math.random() * possible.length)); }
	return text;
}

async function generateImageUriMappings(extensionPath: string, webview: vscode.Webview): Promise<{ [key: string]: string }> {
	const mappings: { [key: string]: string } = {};
	const workspacePath = path.join(extensionPath, 'outnav-workspace');

	try {
		// Scan for common image directories in the workspace
		const imageDirs = ['media', 'images'];

		for (const imageDir of imageDirs) {
			const imageDirPath = path.join(workspacePath, imageDir);

			try {
				const files = await fs.readdir(imageDirPath);

				// Process each image file found in the directory
				for (const file of files) {
					if (file.match(/\.(png|jpg|jpeg|gif|svg|webp)$/i)) {
						const relativePath = `${imageDir}/${file}`;
						const absolutePath = path.join(imageDirPath, file);
						const imageUri = vscode.Uri.file(absolutePath);
						const webviewUri = webview.asWebviewUri(imageUri).toString();

						// Map relative path to webview URI for client-side conversion
						mappings[relativePath] = webviewUri;
					}
				}
			} catch (err) {
				// Directory doesn't exist or can't be read, skip it silently
			}
		}
	} catch (err) {
		console.error('Error generating image URI mappings:', err);
	}

	return mappings;
}