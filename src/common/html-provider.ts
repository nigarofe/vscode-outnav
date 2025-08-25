import * as vscode from "vscode";
import * as path from "path";
import { promises as fs } from "fs";
import {EXTENSION_ROOT, EXTENSION_SRC} from "../extension";

export async function getHtmlForWebview(webview: vscode.Webview, currentFileName: string): Promise<string> {
	const baseName = path.parse(currentFileName).name.toLowerCase();

	const resources: { [key: string]: string } = {
		// node_modules
		katex: 'node_modules/katex/dist/katex.min.js',
		katexCss: 'node_modules/katex/dist/katex.min.css',
		katexAutoRender: 'node_modules/katex/dist/contrib/auto-render.min.js',
		vscodeElements: 'node_modules/@vscode-elements/elements/dist/bundled.js',
		markdownIt: 'node_modules/markdown-it/dist/markdown-it.min.js',

		// shared
		commonHtml: 'src/common/ui.html',
		commonScript: 'src/common/ui.js',

		// custom
		customHtml: `src/${baseName}/ui.html`,
		customScript: `src/${baseName}/ui.js`
	};

	const webviewUris: { [key: string]: string } = {};
	for (const [key, relativePath] of Object.entries(resources)) {
		const absolutePath = path.join(EXTENSION_ROOT, relativePath);
		const uri = vscode.Uri.file(absolutePath);
		webviewUris[key] = webview.asWebviewUri(uri).toString();
	}

	const nonce = getNonce();
	const imageUriMappings = await generateImageUriMappings(EXTENSION_SRC, webview);

	let html = await fs.readFile(path.join(EXTENSION_ROOT, resources.commonHtml), 'utf8');
	html = html
		.replace(/%%WEBVIEW_CSP%%/g, webview.cspSource)
		.replace('%%TOOLKIT_JS_URI%%', webviewUris.vscodeElements)
		.replace('%%KATEX_JS_URI%%', webviewUris.katex)
		.replace('%%KATEX_CSS_URI%%', webviewUris.katexCss)
		.replace('%%KATEX_AUTO_RENDER_URI%%', webviewUris.katexAutoRender)
		.replace('%%MARKDOWNIT_JS_URI%%', webviewUris.markdownIt)
		.replace('%%COMMON_SCRIPT_URI%%', webviewUris.commonScript)
		.replace('%%CUSTOM_SCRIPT_URI%%', webviewUris.customScript)
		.replace(/"%%IMAGE_URI_MAPPINGS%%"/g, JSON.stringify(imageUriMappings))
		.replace(/%%NONCE%%/g, nonce);

	let customHtmlPath = path.join(EXTENSION_ROOT, resources.customHtml);
	let customHtml = await fs.readFile(customHtmlPath, 'utf8');
	html = html.replace('%%CUSTOM_HTML%%', customHtml);

	return html;
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


function getNonce() {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) { text += possible.charAt(Math.floor(Math.random() * possible.length)); }
	return text;
}