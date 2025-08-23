import * as vscode from "vscode";
import * as path from "path";
import { promises as fs } from "fs";
export async function getHtmlForWebview(ep: string, webview: vscode.Webview, currentFileName: string): Promise<string> {
	// webview is provided by the caller to avoid circular imports with the extension module
	const baseName = path.parse(currentFileName).name.toLowerCase();

	const resources: { [key: string]: string } = {
		// node_modules
		katex: 'node_modules/katex/dist/katex.min.js',
		katexCss: 'node_modules/katex/dist/katex.min.css',
		katexAutoRender: 'node_modules/katex/dist/contrib/auto-render.min.js',
		vscodeElements: 'node_modules/@vscode-elements/elements/dist/bundled.js',
		markdownIt: 'node_modules/markdown-it/dist/markdown-it.min.js',

		// shared
		sharedHtmlHead: 'src/webviews/sharedHead.html',
		sharedScript: 'src/webviews/sharedScript.js',

		// custom
		customHtml: `src/webviews/${baseName}.html`,
		customScript: `src/webviews/${baseName}.js`
	};

	const webviewUris: { [key: string]: string } = {};
	for (const [key, relativePath] of Object.entries(resources)) {
		const absolutePath = path.join(ep, relativePath);
		const uri = vscode.Uri.file(absolutePath);
		webviewUris[key] = webview.asWebviewUri(uri).toString();
	}

	const nonce = getNonce();
	const imageUriMappings = await generateImageUriMappings(ep, webview);

	let html = await fs.readFile(path.join(ep, resources.sharedHtmlHead), 'utf8');
	html = html
		.replace(/%%WEBVIEW_CSP%%/g, webview.cspSource)
		.replace('%%TOOLKIT_JS_URI%%', webviewUris.vscodeElements)
		.replace('%%KATEX_JS_URI%%', webviewUris.katex)
		.replace('%%KATEX_CSS_URI%%', webviewUris.katexCss)
		.replace('%%KATEX_AUTO_RENDER_URI%%', webviewUris.katexAutoRender)
		.replace('%%MARKDOWNIT_JS_URI%%', webviewUris.markdownIt)
		.replace('%%SHARED_SCRIPT_URI%%', webviewUris.sharedScript)
		.replace('%%CUSTOM_SCRIPT_URI%%', webviewUris.customScript)
		.replace(/"%%IMAGE_URI_MAPPINGS%%"/g, JSON.stringify(imageUriMappings))
		.replace(/%%NONCE%%/g, nonce);

	console.log('trying path for html', path.join(ep, resources.customHtml));
	html += await fs.readFile(path.join(ep, resources.customHtml), 'utf8');
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