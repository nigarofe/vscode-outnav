// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "vscode-outnav" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	// keep existing helloWorld command
	const hello = vscode.commands.registerCommand('vscode-outnav.helloWorld', () => {
		vscode.window.showInformationMessage('Hello World from vscode-outnav!');
	});
	context.subscriptions.push(hello);

	// New command: startOutlineNavigator
	const startCmd = vscode.commands.registerCommand('vscode-outnav.startOutlineNavigator', async () => {
		const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
		if (!workspaceFolder) {
			vscode.window.showErrorMessage('No workspace folder is open.');
			return;
		}

		// Paths
		const outlinesMd = path.join(workspaceFolder.uri.fsPath, 'outnav-workspace', 'Outlines.md');
		const outlinesJson = path.join(workspaceFolder.uri.fsPath, 'outnav-workspace', 'json_exports', 'outlines.json');

		try {
			const mdUri = vscode.Uri.file(outlinesMd);
			const mdBytes = await vscode.workspace.fs.readFile(mdUri);
			const md = Buffer.from(mdBytes).toString('utf8');

			const parsed = parseOutlineMarkdown(md, path.basename(outlinesMd));

			// ensure output directory exists
			const outDir = path.dirname(outlinesJson);
			await vscode.workspace.fs.createDirectory(vscode.Uri.file(outDir));
			await vscode.workspace.fs.writeFile(vscode.Uri.file(outlinesJson), Buffer.from(JSON.stringify({ document: parsed }, null, 2), 'utf8'));

			// Open the Outline Webview and pass the parsed JSON
			openOutlineWebview(context, vscode.Uri.file(outlinesJson), { document: parsed }, workspaceFolder.uri.fsPath);
		} catch (err) {
			console.error(err);
			vscode.window.showErrorMessage('Failed to parse Outlines.md: ' + String(err));
		}
	});

	context.subscriptions.push(startCmd);
}

// This method is called when your extension is deactivated
export function deactivate() {}

// Parse simple indented outline Markdown into a tree matching OutlineNode
function parseOutlineMarkdown(markdown: string, sourceName = 'Outlines.md') {
		const lines = markdown.split(/\r?\n/);
		type Node = { title: string; level: number; children: Node[] };
		const root: Node = { title: sourceName, level: 0, children: [] };
		const stack: Node[] = [root];

		for (const raw of lines) {
			const line = raw.replace(/\s+$/,'');
			if (!line.trim()) { continue; }
				// leading tabs or spaces define level; treat 4 spaces or 1 tab as one indent
				const indentMatch = line.match(/^[ \t]*/);
				const indent = indentMatch ? indentMatch[0] : '';
				const level = Math.floor(indent.replace(/\t/g, '    ').length / 4) + 1;
				const title = line.trim();

				const node: Node = { title, level, children: [] };

				// find parent
				while (stack.length && stack[stack.length-1].level >= level) {
						stack.pop();
				}
				const parent = stack[stack.length-1] || root;
				parent.children.push(node);
				stack.push(node);
		}

		return root;
}

function openOutlineWebview(context: vscode.ExtensionContext, jsonUri: vscode.Uri, outlines: any, workspaceRootPath?: string) {
		const panel = vscode.window.createWebviewPanel('outlineNavigator', 'Outline Navigator', vscode.ViewColumn.One, {
				enableScripts: true,
				localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'outnav-workspace'))]
		});

		const doc = outlines || { document: { title: 'Empty', level: 0, children: [] } };

		// pass the JSON data into the webview
		const data = JSON.stringify(doc);

		panel.webview.html = getWebviewHtml(panel.webview, context.extensionUri, data, workspaceRootPath);

		// handle messages from webview (if any)
		panel.webview.onDidReceiveMessage(msg => {
			if (msg === 'close') { panel.dispose(); }
		});
}
	function getWebviewHtml(webview: vscode.Webview, extensionUri: vscode.Uri, dataJson: string, workspaceRoot?: string) {
		// script will handle EARS behaviour, cycling titles, keyboard controls and image rendering via markdown
		return `<!doctype html>
	<html>
	<head>
		<meta charset="utf-8" />
		<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} file: https: data:; script-src 'unsafe-inline' ${webview.cspSource}; style-src 'unsafe-inline' ${webview.cspSource};">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<style>
			body { font-family: sans-serif; display:flex; align-items:center; justify-content:center; height:100vh; margin:0; }
			#title { font-size: 2.5rem; text-align:center; padding:1rem; }
			img { max-width: 60vw; max-height: 60vh; display:block; margin: 0.5rem auto; }
		</style>
	</head>
	<body>
		<div id="title">(loading)</div>
		<script>
			const vscode = acquireVsCodeApi();
			const workspaceRoot = ${JSON.stringify(workspaceRoot || '')};
			const data = ${dataJson};
			// flatten current level titles (start at document)
			let currentNode = data.document;
			let levelStack = [currentNode];
			let titles = (currentNode.children || []).map(n=>n.title);
			let idx = 0;
			let intervalMs = 2000;
			let playing = true;
			const titleEl = document.getElementById('title');

			function renderTitle() {
				if (!titles || titles.length===0) { titleEl.innerText = currentNode.title || '(empty)'; return; }
				const raw = titles[idx % titles.length];
				// render markdown-like images: simple replace of ![alt](src)
				const imgMatch = raw.match(/!\[[^\]]*\]\(([^)]+)\)/);
				if (imgMatch) {
					const src = imgMatch[1];
					// resolve relative to workspace root by using file: URI
					let resolved = src;
					if (!src.startsWith('http') && !src.startsWith('file:')) {
						if (workspaceRoot) {
							// normalize backslashes to forward for file URI
							resolved = 'file://' + (workspaceRoot + '/' + src).replace(/\\\\/g, '/');
						} else {
							resolved = 'file://' + src;
						}
					}
					titleEl.innerHTML = raw.replace(imgMatch[0], '') + '<br>';
					// remove existing images
					const existing = document.querySelectorAll('img');
					existing.forEach(e=>e.remove());
					const im = document.createElement('img');
					im.src = resolved;
					document.body.appendChild(im);
				} else {
					titleEl.innerText = raw;
					// remove images
					const existing = document.querySelectorAll('img');
					existing.forEach(e=>e.remove());
				}
			}

			function tick() {
				if (!playing) return;
				idx = (idx+1) % (titles.length || 1);
				renderTitle();
			}

			let timer = setInterval(tick, intervalMs);

			// initial render
			renderTitle();

			window.addEventListener('keydown', e=>{
				if (e.code === 'Space') { playing = !playing; }
				else if (e.key === 'Escape') { vscode.postMessage({ command: 'close' }); }
				else if (e.key === '=') { intervalMs = Math.max(200, intervalMs - 200); clearInterval(timer); timer = setInterval(tick, intervalMs); }
				else if (e.key === '-') { intervalMs = intervalMs + 200; clearInterval(timer); timer = setInterval(tick, intervalMs); }
				else if (e.key.toLowerCase() === 'a') { // go up a level
					if (levelStack.length>1) { levelStack.pop(); currentNode = levelStack[levelStack.length-1]; titles = (currentNode.children||[]).map(n=>n.title); idx = 0; renderTitle(); }
				}
				else if (e.key.toLowerCase() === 'd') { // go down a level: pick current title's node if exists
					const sel = currentNode.children && currentNode.children[idx % (currentNode.children.length||1)];
					if (sel) { levelStack.push(sel); currentNode = sel; titles = (currentNode.children||[]).map(n=>n.title); idx = 0; renderTitle(); }
				}
			});

			// listen for messages from extension
			window.addEventListener('message', event => {
				const msg = event.data;
				if (msg.command === 'update') {
					// replace data
				}
			});
		</script>
	</body>
	</html>`;
	}
