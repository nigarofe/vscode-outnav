import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

type OutlineNode = {
		title: string;
		level: number;
		children: OutlineNode[];
		annotations?: any;
};

export function activate(context: vscode.ExtensionContext) {
		context.subscriptions.push(
				vscode.commands.registerCommand('vscode-outnav.startOutlineNavigator', async () => {
						const workspaceFolder = await findWorkspaceFolderWithOutlines();
						if (!workspaceFolder) {
								vscode.window.showErrorMessage('Could not find a workspace folder containing Outlines.md');
								return;
						}

						try {
								const outlines = await parseOutlinesMd(path.join(workspaceFolder, 'Outlines.md'));
								const outDir = path.join(workspaceFolder, 'json_exports');
								await fs.promises.mkdir(outDir, { recursive: true });
								const outlinesPath = path.join(outDir, 'outlines.json');
								await fs.promises.writeFile(outlinesPath, JSON.stringify({ document: outlines }, null, 2), 'utf8');
								// Open webview and pass the outlines, converting any local src to webview URIs
								openOutlineWebview(context, outlines, workspaceFolder);
						} catch (err: any) {
								vscode.window.showErrorMessage('Error parsing Outlines.md: ' + String(err.message || err));
						}
				})
		);
}

export function deactivate() {}

async function findWorkspaceFolderWithOutlines(): Promise<string | undefined> {
		const folders = vscode.workspace.workspaceFolders;
		if (!folders || folders.length === 0) { return undefined; }

		// Prefer a folder that contains Outlines.md at its root
		for (const f of folders) {
				const candidate = path.join(f.uri.fsPath, 'Outlines.md');
				try {
						await fs.promises.access(candidate);
						return f.uri.fsPath;
				} catch {}
		}

		// fallback to first folder
		return folders[0].uri.fsPath;
}

async function parseOutlinesMd(filePath: string): Promise<OutlineNode> {
		const raw = await fs.promises.readFile(filePath, 'utf8');
		// Remove leading/trailing code fences if present
		let content = raw.replace(/^```[\s\S]*?\n/, '').replace(/\n```\s*$/,'');
		const lines = content.split(/\r?\n/);

		const root: OutlineNode = { title: 'root', level: 0, children: [] };
		const stack: OutlineNode[] = [root];

		for (let rawLine of lines) {
			const line = rawLine.replace(/\t+/g, (m) => '\t'.repeat(m.length));
			if (!line.trim()) { continue; }

				// Determine indent level: tabs count as 1, groups of 4 spaces count as 1
				let i = 0;
				let indentCount = 0;
				while (i < line.length) {
						if (line[i] === '\t') { indentCount++; i++; }
						else if (line.substr(i,4) === '    ') { indentCount++; i += 4; }
						else if (line[i] === ' ') { // single spaces not forming group of 4 -> skip
							i++;
						} else { break; }
				}

				const level = indentCount + 1; // top-level items are level 1

				// extract trailing JSON annotation if present
				let title = line.slice(i).trim();
				let annotations: any = undefined;
				const m = title.match(/(\{[\s\S]*\})\s*$/);
				if (m) {
					const jsonText = m[1];
					try {
						annotations = JSON.parse(jsonText);
						title = title.slice(0, title.length - jsonText.length).trim();
					} catch (e) {
						// leave as-is if JSON parse fails
					}
				}

			const node: OutlineNode = { title, level, children: [] };
			if (annotations) { node.annotations = annotations; }

				// attach to proper parent based on level
				while (stack.length > 0 && stack[stack.length - 1].level >= node.level) {
						stack.pop();
				}
				const parent = stack[stack.length - 1] || root;
				parent.children.push(node);
				stack.push(node);
		}

		return root;
}

function openOutlineWebview(context: vscode.ExtensionContext, outlines: OutlineNode, workspaceFolder: string) {
		const panel = vscode.window.createWebviewPanel('outlineNavigator', 'Outline Navigator', vscode.ViewColumn.One, {
				enableScripts: true,
				localResourceRoots: [vscode.Uri.file(workspaceFolder)]
		});

		// Convert local image src in annotations to webview URIs
		function convertLocalSrcs(node: OutlineNode) {
				if (node.annotations && node.annotations.src && typeof node.annotations.src === 'string') {
						const src = node.annotations.src;
						if (!/^https?:\/\//i.test(src)) {
								const filePath = path.join(workspaceFolder, src.replace(/^\/+/, ''));
								try {
										const uri = panel.webview.asWebviewUri(vscode.Uri.file(filePath));
										node.annotations._webviewSrc = uri.toString();
								} catch (e) {
										// ignore
								}
						}
				}
			if (node.children) { node.children.forEach(convertLocalSrcs); }
		}
		convertLocalSrcs(outlines);

		panel.webview.html = getWebviewContent(panel.webview, outlines);

		// handle messages from webview
		panel.webview.onDidReceiveMessage(msg => {
			if (msg.command === 'close') { panel.dispose(); }
		}, undefined, context.subscriptions);
}

function escapeHtml(s: string) {
		return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function getWebviewContent(webview: vscode.Webview, outlines: OutlineNode) {
		// Serialize outlines safely into the HTML; avoid embedding HTML-escaped JSON which breaks JSON.parse in the webview.
		// Replace '<' with '\u003c' to prevent closing </script> tags from appearing in the serialized JSON.
		const safeJson = JSON.stringify(outlines).replace(/</g, '\\u003c');

		const bootstrapCss = 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css';

		return `<!doctype html>
<html>
<head>
	<meta charset="utf-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<link href="${bootstrapCss}" rel="stylesheet" />
	<style>
		body { padding: 8px; }
		#breadcrumb { margin-bottom: 12px; }
		#main { border: 1px solid #ddd; padding: 12px; min-height: 300px; }
		.dropdown-list { display:none; position:absolute; background:white; border:1px solid #ccc; z-index:10; }
		.dropdown-list.open { display:block; }
		.crumb { display:inline-block; margin-right:6px; }
	</style>
</head>
<body>
	<div id="breadcrumb" class="d-flex align-items-center"></div>
	<div id="main"></div>

	<script>
	const vscode = acquireVsCodeApi();
	const outlines = ${safeJson};

		// Flatten tree helper
		function findNodeByPath(path) {
			let node = outlines;
			for (const idx of path) {
				if (!node.children || !node.children[idx]) return null;
				node = node.children[idx];
			}
			return node;
		}

		// default path: first top-level node
		let currentPath = [];
		if (outlines.children && outlines.children.length > 0) currentPath = [0];

		function getAncestors(path) {
			const ancestors = [];
			for (let i = 0; i < path.length - 1; i++) {
				const slice = path.slice(0, i+1);
				ancestors.push({ node: findNodeByPath(slice), path: slice });
			}
			return ancestors;
		}

		function getSiblings(path) {
			if (path.length === 0) return outlines.children || [];
			const parentPath = path.slice(0, -1);
			const parent = parentPath.length===0 ? outlines : findNodeByPath(parentPath);
			return parent && parent.children ? parent.children : [];
		}

		// Breadcrumb and dropdown UI
		const breadcrumbEl = document.getElementById('breadcrumb');
		const mainEl = document.getElementById('main');

		let cycleInterval = 1000;
		let cycleTimer = null;
		let cycleIndex = 0;
		let cycling = true;

		function render() {
			breadcrumbEl.innerHTML = '';
			const ancestors = getAncestors(currentPath);
			ancestors.forEach((a, i) => {
				const el = document.createElement('a');
				el.className = 'crumb';
				el.href = '#';
				el.textContent = a.node.title;
				el.onclick = (e) => { e.preventDefault(); currentPath = a.path.slice(); render(); };
				breadcrumbEl.appendChild(el);
			});

			// final item as dropdown
			const siblings = getSiblings(currentPath);
			const dropdownWrap = document.createElement('span');
			dropdownWrap.style.position = 'relative';
			const btn = document.createElement('button');
			btn.className = 'btn btn-secondary btn-sm';
			btn.textContent = (siblings[currentPath[currentPath.length-1]] || { title: 'Home' }).title || 'Home';
			dropdownWrap.appendChild(btn);

			const list = document.createElement('div');
			list.className = 'dropdown-list';
			siblings.forEach((s, idx) => {
				const item = document.createElement('div');
				item.style.padding = '6px 10px';
				item.style.cursor = 'pointer';
				item.textContent = s.title;
				item.onclick = () => {
					// navigate to sibling
					const newPath = currentPath.slice(0, -1).concat([idx]);
					currentPath = newPath;
					btn.textContent = s.title;
					list.classList.remove('open');
					render();
				};
				list.appendChild(item);
			});
			dropdownWrap.appendChild(list);
			breadcrumbEl.appendChild(dropdownWrap);

			// toggle on button click
			btn.addEventListener('click', (e) => { list.classList.toggle('open'); });

			// cycling behavior
			btn.addEventListener('mouseenter', pauseCycling);
			btn.addEventListener('mouseleave', resumeCycling);
			btn.addEventListener('mousedown', pauseCycling);

			// start cycle
			if (cycleTimer) { clearInterval(cycleTimer); cycleTimer = null; }
			cycleIndex = 0;
			if (cycling && siblings.length > 0) {
				cycleTimer = setInterval(() => {
					cycleIndex = (cycleIndex + 1) % siblings.length;
					btn.textContent = siblings[cycleIndex].title;
				}, cycleInterval);
			}

			renderMain();
		}

		function renderMain() {
			const node = findNodeByPath(currentPath);
			mainEl.innerHTML = '';
			if (!node) return;
			if (node.annotations) {
				if (node.annotations.action === 'display_image') {
					const img = document.createElement('img');
					img.src = node.annotations._webviewSrc || node.annotations.src || '';
					if (node.annotations.alt) img.alt = node.annotations.alt;
					if (node.annotations.width) img.width = node.annotations.width;
					mainEl.appendChild(img);
					return;
				} else if (node.annotations.action === 'open_webpage') {
					const a = document.createElement('a');
					a.href = node.annotations.url;
					a.textContent = node.title + ' (open web)';
					a.target = '_blank';
					mainEl.appendChild(a);
					return;
						} else if (node.annotations.action === 'generate_outline_question') {
							// Full Outline Question Generator
							const container = document.createElement('div');
							container.className = 'outline-generator';

							const titleH = document.createElement('h4');
							titleH.textContent = 'Outline Question Generator';
							container.appendChild(titleH);

							// Mode selector
							const modes = document.createElement('div');
							modes.style.marginBottom = '8px';
							const levelBtn = document.createElement('button');
							levelBtn.className = 'btn btn-outline-primary btn-sm me-2';
							levelBtn.textContent = 'Level Identification';
							const reconBtn = document.createElement('button');
							reconBtn.className = 'btn btn-outline-primary btn-sm';
							reconBtn.textContent = 'Outline Reconstruction';
							modes.appendChild(levelBtn);
							modes.appendChild(reconBtn);
							container.appendChild(modes);

							const area = document.createElement('div');
							container.appendChild(area);

							// helper: collect all nodes with their paths and ids
							const allNodes = [];
							let nextId = 1;
							function walk(node, path) {
								if (!node) return;
								if (path.length>0) { // skip root
									allNodes.push({ id: nextId++, title: node.title, level: node.level, path: path.slice() });
								}
								if (node.children) {
									node.children.forEach((c, idx) => walk(c, path.concat([idx])));
								}
							}
							walk(outlines, []);

							function pickRandomNodeWithDescendants(minCount=2) {
								const candidates = [];
								function countDesc(n) { let c=0; if (!n) return 0; if (n.children) { n.children.forEach(ch=>{ c+=1+countDesc(ch); }); } return c; }
								function walk2(n,path){ if (path.length>0 && countDesc(n) >= minCount) candidates.push({ node:n, path: path.slice() }); if (n.children) n.children.forEach((ch,idx)=>walk2(ch,path.concat([idx]))); }
								walk2(outlines, []);
								if (candidates.length===0) return null;
								return candidates[Math.floor(Math.random()*candidates.length)];
							}

							// --- Level Identification Mode ---
							function renderLevelIdentification() {
								area.innerHTML = '';
								const box = document.createElement('div');
								box.className = 'p-2';

								const pick = allNodes[Math.floor(Math.random()*allNodes.length)];
								const q = document.createElement('div');
								q.innerHTML = '<strong>Identify the level of this title:</strong>';
								const titleEl = document.createElement('div');
								titleEl.className = 'my-2';
								titleEl.textContent = '"' + pick.title + '"';
								box.appendChild(q);
								box.appendChild(titleEl);

								// compute max level
								const maxLevel = Math.max(...allNodes.map(n=>n.level));
								const select = document.createElement('select');
								select.className = 'form-select form-select-sm w-auto';
								for (let i=1;i<=maxLevel;i++){
									const opt = document.createElement('option'); opt.value = String(i); opt.text = String(i); select.appendChild(opt);
								}
								box.appendChild(select);

								const controls = document.createElement('div'); controls.className = 'mt-2';
								const submit = document.createElement('button'); submit.className='btn btn-primary btn-sm me-2'; submit.textContent = 'Submit';
								const next = document.createElement('button'); next.className='btn btn-secondary btn-sm'; next.textContent='Next';
								controls.appendChild(submit); controls.appendChild(next);
								box.appendChild(controls);

								const feedback = document.createElement('div'); feedback.className='mt-2'; box.appendChild(feedback);

								submit.onclick = () => {
									const val = Number(select.value);
									if (val === pick.level) {
										feedback.innerHTML = '<div class="text-success">Correct — level '+pick.level+'</div>';
									} else {
										feedback.innerHTML = '<div class="text-danger">Incorrect — correct level is '+pick.level+'</div>';
									}
								};
								next.onclick = () => renderLevelIdentification();

								area.appendChild(box);
							}

							// --- Outline Reconstruction Mode ---
							function renderOutlineReconstruction() {
								area.innerHTML = '';
								const rootChoice = pickRandomNodeWithDescendants(2);
								if (!rootChoice) {
									area.textContent = 'Not enough structure in the outline to build a reconstruction exercise.';
									return;
								}

								const exerciseRoot = rootChoice.node;

								// gather positions (preorder) up to depth 2 from this root
								const positions = [];
								function gather(n, path, depth){
									const id = positions.length;
									positions.push({ id, expectedTitle: n.title, path: path.slice() });
									if (depth>0 && n.children) {
										n.children.forEach((ch,idx)=>gather(ch, path.concat([idx]), depth-1));
									}
								}
								gather(exerciseRoot, [], 2);

								// draggable items: shuffle the titles
								const items = positions.map(p => ({ id: p.id, title: p.expectedTitle }));
								// shuffle
								for (let i = items.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [items[i],items[j]]=[items[j],items[i]]; }

								const topRow = document.createElement('div'); topRow.className='d-flex gap-3';
								const targetsCol = document.createElement('div'); targetsCol.style.minWidth='40%';
								const itemsCol = document.createElement('div'); itemsCol.style.flex='1';

								// render nested targets reflecting the structure
								const targetsContainer = document.createElement('div');
								targetsContainer.style.border='1px solid #ddd'; targetsContainer.style.padding='8px';

								// We'll render positions as a flat list with labels showing hierarchy for simplicity
								positions.forEach(p => {
									const t = document.createElement('div');
									t.className = 'recon-target mb-2 p-2';
									t.style.border='1px dashed #bbb';
									t.style.minHeight='34px';
									t.dataset.posId = String(p.id);
									t.textContent = 'Drop here for: ' + p.path.map(x=>x+1).join('.') || 'root';
									t.addEventListener('dragover', (ev)=>{ ev.preventDefault(); t.style.background='#f8f9fa'; });
									t.addEventListener('dragleave', ()=>{ t.style.background=''; });
									t.addEventListener('drop', (ev)=>{ ev.preventDefault(); t.style.background=''; const dragId = ev.dataTransfer.getData('text/plain'); const dragEl = document.getElementById('drag-'+dragId); if (dragEl) { t.innerHTML=''; t.appendChild(dragEl); dragEl.style.cursor='default'; } });
									targetsContainer.appendChild(t);
								});

								// render draggable items
								const itemsContainer = document.createElement('div'); itemsContainer.style.border='1px solid #ddd'; itemsContainer.style.padding='8px'; itemsContainer.style.minHeight='120px';
								items.forEach(it => {
									const el = document.createElement('div');
									el.id = 'drag-'+it.id;
									el.className='recon-item btn btn-light btn-sm mb-2';
									el.draggable = true;
									el.textContent = it.title;
									el.style.display='block'; el.style.textAlign='left'; el.style.width='100%';
									el.addEventListener('dragstart', (ev)=>{ ev.dataTransfer.setData('text/plain', String(it.id)); });
									itemsContainer.appendChild(el);
								});

								itemsCol.appendChild(document.createElement('div')).textContent = 'Drag these titles into the correct positions:';
								itemsCol.appendChild(itemsContainer);
								targetsCol.appendChild(document.createElement('div')).textContent = 'Target positions (hierarchy):';
								targetsCol.appendChild(targetsContainer);

								topRow.appendChild(targetsCol); topRow.appendChild(itemsCol);
								area.appendChild(topRow);

								const controls = document.createElement('div'); controls.className='mt-2';
								const checkBtn = document.createElement('button'); checkBtn.className='btn btn-primary btn-sm me-2'; checkBtn.textContent='Check';
								const resetBtn = document.createElement('button'); resetBtn.className='btn btn-secondary btn-sm me-2'; resetBtn.textContent='Reset';
								const nextBtn = document.createElement('button'); nextBtn.className='btn btn-outline-secondary btn-sm'; nextBtn.textContent='Next';
								controls.appendChild(checkBtn); controls.appendChild(resetBtn); controls.appendChild(nextBtn);
								area.appendChild(controls);

								const feedback = document.createElement('div'); feedback.className='mt-2'; area.appendChild(feedback);

								checkBtn.onclick = () => {
									let correct = 0;
									positions.forEach(p => {
										const target = targetsContainer.querySelector('[data-pos-id="'+p.id+'"]');
										if (!target) return;
										const child = target.querySelector('.recon-item');
										if (child) {
											const id = Number(child.id.replace('drag-',''));
											if (positions[id] && positions[id].expectedTitle === p.expectedTitle) {
												child.style.background='#d4edda'; child.style.border='1px solid #c3e6cb'; correct++;
											} else {
												child.style.background='#f8d7da'; child.style.border='1px solid #f5c6cb';
											}
										}
									});
									feedback.innerHTML = '<div>' + correct + ' / ' + positions.length + ' correct</div>';
								};

								resetBtn.onclick = () => { renderOutlineReconstruction(); };
								nextBtn.onclick = () => { renderOutlineReconstruction(); };
							}

							// wire mode buttons
							levelBtn.onclick = () => { levelBtn.classList.add('btn-primary'); levelBtn.classList.remove('btn-outline-primary'); reconBtn.classList.remove('btn-primary'); reconBtn.classList.add('btn-outline-primary'); renderLevelIdentification(); };
							reconBtn.onclick = () => { reconBtn.classList.add('btn-primary'); reconBtn.classList.remove('btn-outline-primary'); levelBtn.classList.remove('btn-primary'); levelBtn.classList.add('btn-outline-primary'); renderOutlineReconstruction(); };

							// start with Level Identification
							levelBtn.click();

							mainEl.appendChild(container);
							return;
						}
			}
			// empty if no annotations
		}

		function pauseCycling() { cycling = false; if (cycleTimer) { clearInterval(cycleTimer); cycleTimer = null; } }
		function resumeCycling() { if (!cycling) { cycling = true; render(); } }

		// Keyboard controls
		window.addEventListener('keydown', (ev) => {
			if (ev.code === 'Space') { ev.preventDefault(); if (cycling) pauseCycling(); else resumeCycling(); }
			else if (ev.key === 'Escape') { vscode.postMessage({ command: 'close' }); }
			else if (ev.key === '=') { cycleInterval = cycleInterval + 200; if (cycleTimer) { clearInterval(cycleTimer); cycleTimer = null; } render(); }
			else if (ev.key === '-') { cycleInterval = Math.max(200, cycleInterval - 200); if (cycleTimer) { clearInterval(cycleTimer); cycleTimer = null; } render(); }
			else if (ev.key.toLowerCase() === 'j') { // previous sibling
				const siblings = getSiblings(currentPath);
				const idx = currentPath[currentPath.length-1];
				const prev = (idx - 1 + siblings.length) % siblings.length;
				currentPath[currentPath.length-1] = prev; render();
			}
			else if (ev.key.toLowerCase() === 'l') { // next sibling
				const siblings = getSiblings(currentPath);
				const idx = currentPath[currentPath.length-1];
				const nxt = (idx + 1) % siblings.length;
				currentPath[currentPath.length-1] = nxt; render();
			}
			else if (ev.key.toLowerCase() === 'a') { // go to parent
				if (currentPath.length > 1) { currentPath = currentPath.slice(0, -1); render(); }
			}
			else if (ev.key.toLowerCase() === 'd') { // go to first child
				const node = findNodeByPath(currentPath);
				if (node && node.children && node.children.length>0) { currentPath = currentPath.concat([0]); render(); }
			}
		});

		render();
	</script>
</body>
</html>`;
}

