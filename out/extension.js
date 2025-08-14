"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
function activate(context) {
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
        }
        catch (err) {
            console.error(err);
            vscode.window.showErrorMessage('Failed to parse Outlines.md: ' + String(err));
        }
    });
    context.subscriptions.push(startCmd);
}
// This method is called when your extension is deactivated
function deactivate() { }
// Parse simple indented outline Markdown into a tree matching OutlineNode
function parseOutlineMarkdown(markdown, sourceName = 'Outlines.md') {
    const lines = markdown.split(/\r?\n/);
    const root = { title: sourceName, level: 0, children: [] };
    const stack = [root];
    for (const raw of lines) {
        const line = raw.replace(/\s+$/, '');
        if (!line.trim()) {
            continue;
        }
        // leading tabs or spaces define level; treat 4 spaces or 1 tab as one indent
        const indentMatch = line.match(/^[ \t]*/);
        const indent = indentMatch ? indentMatch[0] : '';
        const level = Math.floor(indent.replace(/\t/g, '    ').length / 4) + 1;
        const title = line.trim();
        const node = { title, level, children: [] };
        // find parent
        while (stack.length && stack[stack.length - 1].level >= level) {
            stack.pop();
        }
        const parent = stack[stack.length - 1] || root;
        parent.children.push(node);
        stack.push(node);
    }
    return root;
}
function openOutlineWebview(context, jsonUri, outlines, workspaceRootPath) {
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
        if (msg && msg.command === 'close') {
            panel.dispose();
        }
    });
}
function getWebviewHtml(webview, extensionUri, dataJson, workspaceRoot) {
    // script will handle EARS behaviour, cycling titles, keyboard controls and image rendering via markdown
    return `<!doctype html>
	<html>
	<head>
		<meta charset="utf-8" />
		<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} file: https: data:; script-src 'unsafe-inline' ${webview.cspSource}; style-src 'unsafe-inline' ${webview.cspSource};">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<style>
			:root {
				--bg: var(--vscode-editor-background, #f6f8fa);
				--card: var(--vscode-sideBar-background, #ffffff);
				--muted: var(--vscode-descriptionForeground, #6b6b6b);
				--accent: var(--vscode-textLink-foreground, #0066cc);
				--fg: var(--vscode-editor-foreground, #24292e);
			}
			html,body { height:100%; margin:0; }
			body { font-family: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; background: linear-gradient(180deg, rgba(0,0,0,0.02), transparent); color:var(--fg); display:flex; align-items:center; justify-content:center; padding:2rem; box-sizing:border-box; }
			.container { width:100%; max-width:980px; background:var(--card); border-radius:12px; box-shadow:0 8px 30px rgba(0,0,0,0.08); padding:1.2rem 1.6rem; position:relative; box-sizing:border-box; }
			.header { display:flex; align-items:center; justify-content:space-between; gap:1rem; }
			#breadcrumb { font-size:0.9rem; color:var(--muted); text-align:left; }
			.crumb { cursor:pointer; color:var(--accent); margin-right:0.5rem; padding:0.18rem 0.4rem; border-radius:6px; }
			.crumb:hover { background:rgba(0,0,0,0.03); text-decoration:none; }
			.crumb-current { font-weight:600; color:var(--fg); cursor:default; background:transparent; }
			.main { display:flex; flex-direction:column; align-items:center; padding:1rem 0.5rem; }
			#title { font-size:1.9rem; line-height:1.15; text-align:center; padding:0.8rem 0.6rem; min-height:3.6rem; }
			.siblings { width:100%; display:flex; flex-direction:column; align-items:center; gap:0.15rem; color:var(--muted); }
			.sibling { font-size:0.95rem; cursor:pointer; padding:0.18rem 0.25rem; border-radius:6px; opacity:0.95; }
			.sibling:hover { background:rgba(0,0,0,0.03); color:var(--fg); }
			.sibling.current { font-weight:600; color:var(--fg); cursor:default; }
			img.outline-image { max-width:78vw; max-height:58vh; margin:0.8rem auto 0.2rem; border-radius:8px; box-shadow:0 6px 20px rgba(0,0,0,0.08); display:block; }
			.footer { margin-top:0.6rem; font-size:0.85rem; color:var(--muted); text-align:center; }
			.controls { display:inline-block; padding:0.28rem 0.6rem; background:rgba(0,0,0,0.03); border-radius:999px; }
			@media (max-width:600px) { .container { padding:0.8rem; } #title { font-size:1.4rem; } }
		</style>
	</head>
	<body>
		<div class="container">
			<div class="header">
				<nav id="breadcrumb">(loading)</nav>
				<div style="font-size:0.9rem;color:var(--muted)">Outline Navigator</div>
			</div>
			<div class="main">
				<div id="siblings-above" class="siblings" aria-hidden="true"></div>
				<div id="title">(loading)</div>
				<div id="siblings-below" class="siblings" aria-hidden="true"></div>
				<img id="outline-image" class="outline-image" style="display:none" />
			</div>
			<div class="footer"> <span class="controls">Space: play/pause • Esc: close • =/- speed • A/D level • J/L prev/next</span></div>
		</div>
	<script>
		const vscode = acquireVsCodeApi();
		const workspaceRoot = ${JSON.stringify(workspaceRoot || '')};
		const data = ${dataJson};

		let currentNode = data.document;
		let levelStack = [currentNode];
		let titles = (currentNode.children || []).map(n=>n.title);
		let idx = 0;
		let intervalMs = 2000;
		let playing = true;

		const titleEl = document.getElementById('title');
		const breadcrumbEl = document.getElementById('breadcrumb');
		const siblingsAboveEl = document.getElementById('siblings-above');
		const siblingsBelowEl = document.getElementById('siblings-below');
		const imgEl = document.getElementById('outline-image');

		function renderBreadcrumbs() {
			breadcrumbEl.innerHTML = '';
			levelStack.forEach((n, i) => {
				const span = document.createElement('span');
				span.textContent = n.title || '(untitled)';
				span.dataset.idx = String(i);
				span.className = (i === levelStack.length - 1) ? 'crumb-current' : 'crumb';
				breadcrumbEl.appendChild(span);
				if (i < levelStack.length - 1) {
					const sep = document.createElement('span'); sep.textContent = ' › '; sep.style.color = 'var(--muted)'; breadcrumbEl.appendChild(sep);
				}
			});
		}

		function stripImages(text) { return text ? text.replace(/!\[[^\]]*\]\([^)]*\)/g, '').trim() : text; }

		function showTitleText(raw) {
			// instant swap (no animation)
			titleEl.innerText = stripImages(raw) || '(untitled)';
		}

		function renderTitle() {
			renderBreadcrumbs();
			if (!titles || titles.length===0) {
				showTitleText(currentNode.title || '(empty)', animate);
				siblingsAboveEl.innerHTML = ''; siblingsBelowEl.innerHTML = ''; imgEl.style.display='none'; return;
			}
			const raw = titles[idx % titles.length];
			const imgMatch = raw.match(/!\[[^\]]*\]\(([^)]+)\)/);
			if (imgMatch) {
				const src = imgMatch[1];
				let resolved = src;
				if (!src.startsWith('http') && !src.startsWith('file:')) {
					if (workspaceRoot) { resolved = 'file://' + (workspaceRoot + '/' + src).replace(/\\\\/g, '/'); }
					else { resolved = 'file://' + src; }
				}
				imgEl.src = resolved; imgEl.style.display = 'block';
				showTitleText(raw.replace(imgMatch[0], ''));
			} else {
				imgEl.style.display='none';
				showTitleText(raw);
			}

			// siblings
			siblingsAboveEl.innerHTML = '';
			siblingsBelowEl.innerHTML = '';
			titles.forEach((t, i) => {
				const displayText = stripImages(t) || '(untitled)';
				const span = document.createElement('div');
				span.className = 'sibling' + (i === (idx % titles.length) ? ' current' : '');
				span.textContent = displayText;
				span.dataset.i = String(i);
				span.addEventListener('click', () => { const ii = parseInt(span.dataset.i, 10); if (isNaN(ii)) return; idx = ii; renderTitle(); });
				if (i < (idx % titles.length)) siblingsAboveEl.appendChild(span);
				else if (i > (idx % titles.length)) siblingsBelowEl.appendChild(span);
			});
		}

		function tick() { if (!playing) return; idx = (idx+1) % (titles.length || 1); renderTitle(); }

		let timer = setInterval(tick, intervalMs);
		renderTitle();

		// breadcrumb click
		breadcrumbEl.addEventListener('click', (ev) => {
			const target = ev.target; if (!target || !target.dataset) return; const i = parseInt(target.dataset.idx, 10); if (isNaN(i)) return;
			levelStack = levelStack.slice(0, i+1); currentNode = levelStack[levelStack.length - 1]; titles = (currentNode.children || []).map(n=>n.title); idx = 0; renderTitle();
		});

		window.addEventListener('keydown', e=>{
			if (e.code === 'Space') { playing = !playing; }
			else if (e.key === 'Escape') { vscode.postMessage({ command: 'close' }); }
			else if (e.key === '=') { intervalMs = Math.max(200, intervalMs - 200); clearInterval(timer); timer = setInterval(tick, intervalMs); }
			else if (e.key === '-') { intervalMs = intervalMs + 200; clearInterval(timer); timer = setInterval(tick, intervalMs); }
			else if (e.key.toLowerCase() === 'a') { if (levelStack.length>1) { levelStack.pop(); currentNode = levelStack[levelStack.length-1]; titles = (currentNode.children||[]).map(n=>n.title); idx = 0; renderTitle(); } }
			else if (e.key.toLowerCase() === 'd') { const sel = currentNode.children && currentNode.children[idx % (currentNode.children.length||1)]; if (sel) { levelStack.push(sel); currentNode = sel; titles = (currentNode.children||[]).map(n=>n.title); idx = 0; renderTitle(); } }
			else if (e.key.toLowerCase() === 'j') { if (titles && titles.length) { idx = (idx - 1 + titles.length) % titles.length; renderTitle(); } }
			else if (e.key.toLowerCase() === 'l') { if (titles && titles.length) { idx = (idx + 1) % titles.length; renderTitle(); } }
		});

		window.addEventListener('message', event => { const msg = event.data; if (msg && msg.command === 'update') { /* noop for now */ } });
	</script>
	</body>
	</html>`;
}
//# sourceMappingURL=extension.js.map