import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

interface OutlineNode {
		title: string;
		level: number;
		children?: OutlineNode[];
		actions?: Array<{ type: string; param: string; key?: string }>;
}

function parseOutlines(content: string): OutlineNode {
		const root: OutlineNode = { title: 'root', level: 0, children: [] };
		const stack: OutlineNode[] = [root];

		const lines = content.split(/\r?\n/);
		for (let raw of lines) {
				const line = raw.replace(/\t/g, '    ');
			if (!/\S/.test(line)) { continue; }

				// count leading spaces (4 spaces == one level)
				const leading = line.match(/^\s*/)?.[0] ?? '';
				const level = Math.floor(leading.replace(/\t/g, '    ').length / 4) + 1;

				// extract title and optional action annotations like [action:open_webpage key:O](https://...)
				let title = line.trim();
				const actions: Array<{ type: string; param: string; key?: string }> = [];

				// find annotations of form [action:TYPE key:K](PARAM)
				const annRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
				let m: RegExpExecArray | null;
				while ((m = annRegex.exec(title)) !== null) {
						const meta = m[1];
						const param = m[2];
						const typeMatch = meta.match(/action:([^\s]+)/);
						const keyMatch = meta.match(/key:([^\s]+)/);
					if (typeMatch) {
						actions.push({ type: typeMatch[1], param, key: keyMatch ? keyMatch[1] : undefined });
					}
				}

				// remove annotations from title for display
				title = title.replace(annRegex, '').trim();

				const node: OutlineNode = { title, level, children: [] };
				if (actions.length) {node.actions = actions;}

				// find parent based on level
				while (stack.length && stack[stack.length - 1].level >= level) {
						stack.pop();
				}
				const parent = stack[stack.length - 1];
				parent.children = parent.children || [];
				parent.children.push(node);
				stack.push(node);
		}

		return root;
}

export function activate(context: vscode.ExtensionContext) {
		console.log('vscode-outnav activating');

		const disposable = vscode.commands.registerCommand('vscode-outnav.startOutlineNavigator', async () => {
				const workspaceFolders = vscode.workspace.workspaceFolders;
				if (!workspaceFolders || workspaceFolders.length === 0) {
						vscode.window.showErrorMessage('Please open the outnav-workspace folder in VS Code before starting the navigator.');
						return;
				}

				const root = workspaceFolders[0].uri.fsPath;

				// locate Outlines.md robustly: handle cases where the workspace root may already be the outnav-workspace
				function findOutlines(start: string): string | null {
					const candidates = [
						path.join(start, 'Outlines.md'),
						path.join(start, 'outnav-workspace', 'Outlines.md'),
						path.join(start, '..', 'outnav-workspace', 'Outlines.md')
					];
					for (const c of candidates) {
						if (fs.existsSync(c)) { return c; }
					}

					// shallow recursive search up to depth 3
					function searchDir(dir: string, depth: number): string | null {
						if (depth <= 0) { return null; }
						try {
							const items = fs.readdirSync(dir);
							for (const it of items) {
								const p = path.join(dir, it);
								try {
									const stat = fs.statSync(p);
									if (stat.isFile() && it.toLowerCase() === 'outlines.md') { return p; }
									if (stat.isDirectory()) {
										const found = searchDir(p, depth - 1);
										if (found) { return found; }
									}
								} catch (e) { /* ignore */ }
							}
						} catch (e) { /* ignore */ }
						return null;
					}

					return searchDir(start, 3);
				}

				const outlinesMd = findOutlines(root);
				if (!outlinesMd) {
					vscode.window.showErrorMessage('Could not find Outlines.md under workspace (' + root + ').');
					return;
				}

				const outlinesDir = path.dirname(outlinesMd);
				const exportsDir = path.join(outlinesDir, 'json_exports');
				const outlinesJson = path.join(exportsDir, 'outlines.json');

				try {
						const content = fs.readFileSync(outlinesMd, 'utf8');
						const parsed = parseOutlines(content);
						if (!fs.existsSync(exportsDir)) { fs.mkdirSync(exportsDir, { recursive: true }); }
						fs.writeFileSync(outlinesJson, JSON.stringify({ document: parsed }, null, 2), 'utf8');
						vscode.window.showInformationMessage('Parsed Outlines.md to json_exports/outlines.json');

						// open webview
						const panel = vscode.window.createWebviewPanel('outnav', 'Outline Navigator', vscode.ViewColumn.One, {
								enableScripts: true,
								localResourceRoots: [vscode.Uri.file(root)]
						});

						const data = JSON.stringify(parsed);

						panel.webview.html = getWebviewHtml(panel.webview, context.extensionUri, data);

						// handle messages from webview
						panel.webview.onDidReceiveMessage(msg => {
								if (msg.command === 'openUrl' && msg.url) {
										vscode.env.openExternal(vscode.Uri.parse(msg.url));
								} else if (msg.command === 'close') {
										panel.dispose();
								}
						});

				} catch (err: any) {
						vscode.window.showErrorMessage('Error parsing Outlines.md: ' + err.message);
				}
		});

		context.subscriptions.push(disposable);

		// auto-run when extension activates
		// (removed automatic execution to avoid launching the navigator on activation)
}

export function deactivate() {}

function escapeHtml(s: string) {
		return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function getWebviewHtml(webview: vscode.Webview, extensionUri: vscode.Uri, dataJson: string) {
		// UI: breadcrumb + a dropdown/select that lists every option at the current level.
		// Keeps keyboard shortcuts and actions. Double-clicking or Enter/D will descend into the selected item.
			return `<!doctype html>
<html>
<head>
	<meta charset="utf-8" />
	<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src vscode-resource: data: https: http:; script-src 'unsafe-inline' 'unsafe-eval'; style-src 'unsafe-inline'"> 
	<style>
		body { font-family: sans-serif; padding: 10px }
		#breadcrumb { margin-bottom: 8px }
		#controls { margin-top: 10px; color: #666 }
		#levelSelect { width: 100%; font-size: 18px; padding: 6px; box-sizing: border-box }
		#actions { margin-top: 8px; font-size: 14px; color: #007acc }
		.empty { color: #999; font-style: italic }
	</style>
</head>
<body>
	<div id="breadcrumb"></div>
	<select id="levelSelect" size="6" aria-label="Options at current level"></select>
	<div id="actions"></div>
	<div id="controls">Space=play/pause Esc=close J/L=prev/next A/D=level -/= speed</div>

	<script>
		const root = ${dataJson};
		let currentLevelNode = root;
		let levelStack = [root];
		function nodesAtCurrentLevel() { return (currentLevelNode.children || []).map(n => n); }

		let index = 0;
		let paused = false;
		let interval = 1000;
		let timer = null;

		const selectEl = document.getElementById('levelSelect');
		const actionsEl = document.getElementById('actions');

		function render() {
			const bc = levelStack.map(function(n){ return n.title; }).slice(1).map(function(t,i){ return '<a href="#" data-idx="'+i+'">'+escape(t)+'</a>'; }).join(' / ');
			document.getElementById('breadcrumb').innerHTML = bc || '(root)';

			const nodes = nodesAtCurrentLevel();
			// build options list
			selectEl.innerHTML = '';
			if(!nodes.length){
				const opt = document.createElement('option'); opt.text = '(empty)'; opt.className = 'empty'; selectEl.add(opt);
				actionsEl.innerHTML = '';
				return;
			}

			nodes.forEach((n, i) => {
				const opt = document.createElement('option');
				opt.value = String(i);
				opt.text = n.title || '(untitled)';
				selectEl.add(opt);
			});

			// normalize index
			index = ((index % nodes.length) + nodes.length) % nodes.length;
			selectEl.selectedIndex = index;

			// render actions for selected
			const sel = nodes[index];
			if(sel && sel.actions){
				actionsEl.innerHTML = sel.actions.map(function(a){ return '[' + (a.key || '') + ' - ' + a.type + ']'; }).join(' ');
			} else {
				actionsEl.innerHTML = '';
			}
		}

		function escape(s){ return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

		function startTimer(){ stopTimer(); timer = setInterval(()=>{ if(!paused){ next(); } }, interval); }
		function stopTimer(){ if(timer) { clearInterval(timer); timer = null; } }

		function next(){ const nodes = nodesAtCurrentLevel(); if(nodes.length){ index = (index+1) % nodes.length; render(); }}
		function prev(){ const nodes = nodesAtCurrentLevel(); if(nodes.length){ index = (index-1 + nodes.length) % nodes.length; render(); }}

		// change selection via mouse
		selectEl.addEventListener('change', (e)=>{
			index = selectEl.selectedIndex;
			render();
		});

		// double-click to go down
		selectEl.addEventListener('dblclick', (e)=>{ goDown(); });

		// keyboard handling
		document.addEventListener('keydown', (e)=>{
			const key = e.key.toUpperCase();
			if(key === ' '){ paused = !paused; e.preventDefault(); }
			else if(key === 'ESCAPE'){ vscodeClose(); }
			else if(key === 'J'){ prev(); }
			else if(key === 'L'){ next(); }
			else if(key === 'A'){ // go up a level
				if(levelStack.length>1){ levelStack.pop(); currentLevelNode = levelStack[levelStack.length-1]; index = 0; render(); }
			}
			else if(key === 'D' || key === 'ENTER'){ // go down into selected
				goDown();
			}
			else if(key === '=' ){ interval = Math.max(100, interval - 200); restartTimer(); }
			else if(key === '-' ){ interval = interval + 200; restartTimer(); }
			else {
				// check for action keys on current item
				const nodes = nodesAtCurrentLevel();
				if(nodes.length){ const sel = nodes[index % nodes.length]; if(sel.actions){ const act = sel.actions.find(a => (a.key||'').toUpperCase()===key); if(act){ if(act.type==='open_webpage'){ vscodeOpen(act.param); } else if(act.type==='run_command'){ vscodeExec(act.param); } } } }
			}
			render();
		});

		function goDown(){ const nodes = nodesAtCurrentLevel(); if(!nodes.length) return; const sel = nodes[index % nodes.length]; if(sel && sel.children && sel.children.length){ levelStack.push(sel); currentLevelNode = sel; index = 0; render(); } }

		function restartTimer(){ stopTimer(); startTimer(); }

		function vscodeOpen(url){ window.parent.postMessage({ command: 'openUrl', url: url }, '*'); }
		function vscodeExec(cmd){ window.parent.postMessage({ command: 'exec', cmd }, '*'); }
		function vscodeClose(){ window.parent.postMessage({ command: 'close' }, '*'); }

		// clickable breadcrumb
		document.getElementById('breadcrumb').addEventListener('click', (ev)=>{
			const a = ev.target; if(a && a.dataset && a.dataset.idx){ const idx = parseInt(a.dataset.idx); const target = levelStack[1+idx]; if(target){ levelStack = [root].concat(levelStack.slice(1,2+idx)); currentLevelNode = target; index = 0; render(); } }
		});

		// initial render
		render(); startTimer();
	</script>
</body>
</html>`;
}
