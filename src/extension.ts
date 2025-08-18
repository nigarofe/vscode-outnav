import * as vscode from 'vscode';

// Minimal Outlines.md -> outlines.json parser and webview implementation.

export function activate(context: vscode.ExtensionContext) {
    const disposable = vscode.commands.registerCommand('vscode-outnav.startOutlineNavigator', async () => {
        const workspaceFolder = getOutnavWorkspace();
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('Could not find workspace folder named "outnav-workspace".');
            return;
        }

        const mdUri = vscode.Uri.joinPath(workspaceFolder.uri, 'Outlines.md');
        try {
            const doc = await vscode.workspace.fs.readFile(mdUri);
            const text = Buffer.from(doc).toString('utf8');
            const json = parseOutlinesMd(text);

            const jsonUri = vscode.Uri.joinPath(workspaceFolder.uri, 'json_exports', 'outlines.json');
            await vscode.workspace.fs.writeFile(jsonUri, Buffer.from(JSON.stringify(json, null, 2), 'utf8'));

            vscode.window.showInformationMessage('Outlines.md parsed to json_exports/outlines.json');

            // Open webview
            openOutlineWebview(context, json, workspaceFolder.uri);
        } catch (err) {
            vscode.window.showErrorMessage('Failed to parse Outlines.md: ' + String(err));
        }
    });

    context.subscriptions.push(disposable);

    // On activation, attempt to read outlines.json for use when webview opens later
    (async () => {
        const workspaceFolder = getOutnavWorkspace();
        if (!workspaceFolder) { return; }
        const jsonUri = vscode.Uri.joinPath(workspaceFolder.uri, 'json_exports', 'outlines.json');
        try {
            const bytes = await vscode.workspace.fs.readFile(jsonUri);
            // keep a short-lived copy in extension context storage (not persisted across restarts)
            context.workspaceState.update('outlinesJson', Buffer.from(bytes).toString('utf8'));
        } catch {
            // ignore missing file
        }
    })();
}

export function deactivate() {}

function getOutnavWorkspace(): vscode.WorkspaceFolder | undefined {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) { return undefined; }
    // Prefer a folder named outnav-workspace
    for (const f of folders) {
        if (f.name === 'outnav-workspace' || f.uri.fsPath.endsWith('outnav-workspace')) { return f; }
    }
    // fallback to first
    return folders[0];
}

function parseOutlinesMd(text: string) {
    const lines = text.split(/\r?\n/);
    const root = { title: 'root', level: 0, children: [] as any[] };
    const stack: any[] = [root];

    for (let raw of lines) {
        // skip fence blocks in case the file contains triple backticks
        if (raw.trim().startsWith('```')) { continue; }

        // ignore empty or comment lines
        if (raw.trim() === '') { continue; }
        if (raw.trim().startsWith('//')) { continue; }

        // determine indentation: count leading tabs, and groups of 4 spaces
        const matchTabs = raw.match(/^\t+/);
        let indentTabs = matchTabs ? matchTabs[0].length : 0;
        const matchSpaces = raw.match(/^( +)/);
        let indentSpaces = 0;
        if (matchSpaces) {
            indentSpaces = matchSpaces[0].length;
            // if there are tabs and spaces we consider them additive
        }
        const indent = indentTabs + Math.floor(indentSpaces / 4);
        const level = indent + 1; // root=0, top-level items are level 1

        // trimmed content
        let content = raw.replace(/^\s+/, '').replace(/\s+$/, '');

        // ignore commented lines that start after indentation
        if (content.startsWith('//')) { continue; }

        const node: any = { title: '', level, children: [] };

        // parse trailing JSON annotation like: Title {"action":"display_image",...}
        const jsonTrailing = content.match(/(\{.*\})\s*$/);
        if (jsonTrailing) {
            const jsonPart = jsonTrailing[1];
            try {
                const ann = JSON.parse(jsonPart);
                node.annotations = ann;
                content = content.slice(0, content.length - jsonPart.length).trim();
            } catch {
                // ignore parse errors; leave JSON in title
            }
        }

        // parse markdown link-style annotation: [action:open_webpage key:O](https://example.com)
        const linkTrailing = content.match(/\[([^\]]+)\]\(([^)]+)\)\s*$/);
        if (linkTrailing) {
            const meta = linkTrailing[1];
            const url = linkTrailing[2];
            const actionObj: any = {};
            // meta is like "action:open_webpage key:O" -> parse key:value pairs
            meta.split(/\s+/).forEach(p => {
                const kv = p.split(':');
                if (kv.length === 2) { actionObj[kv[0]] = kv[1]; }
            });
            const act = actionObj['action'] || 'open_webpage';
            const key = actionObj['key'];
            node.actions = [ { type: act, param: url, key } ];
            content = content.slice(0, content.length - linkTrailing[0].length).trim();
        }

        node.title = content;

        // attach to correct parent
        // ensure stack has entry for parent level
        while (stack.length - 1 < level - 1) {
            // fill missing intermediate parents with empty nodes
            const filler = { title: '(empty)', level: stack.length, children: [] };
            stack[stack.length - 1].children.push(filler);
            stack.push(filler);
        }
        // pop back to parent at level-1
        stack.splice(level);
        const parent = stack[stack.length - 1];
        parent.children.push(node);
        stack.push(node);
    }

    return { document: root };
}

function openOutlineWebview(context: vscode.ExtensionContext, json: any, workspaceRoot: vscode.Uri) {
    const panel = vscode.window.createWebviewPanel('outnav', 'Outline Navigator', vscode.ViewColumn.One, {
        enableScripts: true,
        localResourceRoots: [workspaceRoot]
    });

    const nonce = getNonce();

    panel.webview.html = getWebviewContent(panel.webview, nonce);

    // send data when ready
    const sendData = () => panel.webview.postMessage({ type: 'initialData', data: json });

    const disposables: vscode.Disposable[] = [];

  const out = vscode.window.createOutputChannel('Outnav Webview');
  panel.webview.onDidReceiveMessage(async message => {
    if (message.type === 'ready') { sendData(); return; }
    if (message.type === 'openExternal' && message.url) {
      try { await vscode.env.openExternal(vscode.Uri.parse(message.url)); } catch (err) { vscode.window.showErrorMessage('Failed to open url: ' + String(err)); }
      return;
    }
    if (message.type === 'close') { panel.dispose(); return; }
    if (message.type === 'webviewError') {
      out.appendLine('[webview] ' + (message.message || 'error') + (message.stack ? '\n' + message.stack : ''));
      out.show(true);
      return;
    }
  }, null, disposables);

    panel.onDidDispose(() => disposables.forEach(d => d.dispose()), null, context.subscriptions);
}

function getWebviewContent(webview: vscode.Webview, nonce: string) {
    // Minimal UI: breadcrumb bar and main content. The webview will request initial data.
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https:; script-src 'nonce-${nonce}' https:; style-src 'unsafe-inline' https: ${webview.cspSource};" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Outline Navigator</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet" crossorigin="anonymous">
  <style>
    body{font-family: sans-serif;margin:0;height:100vh;display:flex;flex-direction:column}
    #breadcrumbBar{padding:8px}
    #main{flex:1;padding:16px;overflow:auto}
    .title{font-size:1.2em;margin-bottom:8px}
    .dropdown-menu{max-height:300px;overflow:auto}
  </style>
</head>
<body>
  <nav id="breadcrumbBar" class="navbar navbar-dark bg-dark">
    <div class="container-fluid">
      <ol id="crumbs" class="breadcrumb mb-0">
        <!-- breadcrumbs populated here -->
      </ol>
      <div class="d-flex align-items-center">
        <div class="dropdown me-3">
          <button id="levelDropdownBtn" class="btn btn-secondary dropdown-toggle" type="button">Level 1</button>
          <ul id="levelDropdownMenu" class="dropdown-menu dropdown-menu-end"></ul>
        </div>
        <div class="text-white">Interval: <span id="interval">1.0s</span></div>
      </div>
    </div>
  </nav>

  <div id="main" class="container-fluid"><div id="content">Loading…</div></div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    let data = null;
    let currentPath = [];
    let level = 1;
    let intervalMs = 1000;
    let cycling = true;
    let cycleTimer = null;

    window.onerror = function(message, source, lineno, colno, error) { try { vscode.postMessage({ type: 'webviewError', message: String(message), source, lineno, colno, stack: error && error.stack }); } catch(e) {} return false; };
    window.addEventListener('unhandledrejection', function(ev){ try { vscode.postMessage({ type: 'webviewError', message: 'UnhandledRejection', reason: String(ev.reason) }); } catch(e) {} });

    window.addEventListener('message', e => { const msg = e.data; if (msg.type === 'initialData') { data = msg.data; render(); } });
    function sendReady(){ vscode.postMessage({type:'ready'}); }
    sendReady();

    function safeGetNodeByPath(path){ if (!data || !data.document) return null; let node = data.document; for (let idx of path) { if (!node.children || typeof node.children[idx] === 'undefined') return null; node = node.children[idx]; } return node; }
    function getCurrentNodes() { const parent = safeGetNodeByPath(currentPath); if (!parent) return (data && data.document && data.document.children) ? data.document.children : []; return parent.children || []; }

    function render(){ try{ if (!data) return; renderBreadcrumb(); renderMain(); restartCycling(); } catch (err) { vscode.postMessage({ type: 'webviewError', message: 'render error', stack: err && err.stack }); } }

    function renderBreadcrumb(){ const crumbs = document.getElementById('crumbs'); crumbs.innerHTML = ''; let node = data && data.document; addBreadcrumbItem('root', 0); for (let i=0;i<currentPath.length;i++){ const idx = currentPath[i]; if (!node || !node.children || typeof node.children[idx] === 'undefined') break; node = node.children[idx]; addBreadcrumbItem(node.title || '(untitled)', i+1); } updateDropdownLabel(); }

    function addBreadcrumbItem(title, depth){ const li = document.createElement('li'); li.className = 'breadcrumb-item'; const a = document.createElement('a'); a.href='#'; a.textContent = title; a.onclick = (e)=>{ e.preventDefault(); currentPath = currentPath.slice(0, depth); level = depth; render(); }; li.appendChild(a); document.getElementById('crumbs').appendChild(li); }

    function updateDropdownLabel(){ document.getElementById('levelDropdownBtn').textContent = 'Level ' + level; populateDropdown(); }

    function populateDropdown(){ try{ const menu = document.getElementById('levelDropdownMenu'); menu.innerHTML = ''; const nodes = getCurrentNodes() || []; if (nodes.length===0){ const li=document.createElement('li'); li.className='dropdown-item disabled'; li.textContent='(no items)'; menu.appendChild(li); return; } nodes.forEach((n,i)=>{ const li=document.createElement('li'); const a=document.createElement('a'); a.className='dropdown-item'; a.href='#'; a.textContent = n.title || '(untitled)'; a.onclick = (ev)=>{ ev.preventDefault(); currentPath.push(i); level++; render(); hideDropdown(); }; li.appendChild(a); menu.appendChild(li); }); } catch(err){ vscode.postMessage({type:'webviewError', message:'populateDropdown error', stack: err && err.stack}); } }

    function hideDropdown(){ const menu=document.getElementById('levelDropdownMenu'); menu.classList.remove('show'); }
    function showDropdown(){ const menu=document.getElementById('levelDropdownMenu'); menu.classList.add('show'); }
    document.getElementById('levelDropdownBtn').addEventListener('click', ()=>{ const menu=document.getElementById('levelDropdownMenu'); if (menu.classList.contains('show')) hideDropdown(); else showDropdown(); });

    function renderMain(){ try{ const content = document.getElementById('content'); const nodes = getCurrentNodes(); content.innerHTML = ''; const title = document.createElement('div'); title.className='title'; title.textContent = (nodes && nodes.length)? nodes[0].title : '(no items)'; content.appendChild(title); const sel = nodes && nodes[0]; if (sel && sel.actions){ sel.actions.forEach(a=>{ const btn = document.createElement('button'); btn.className='btn btn-primary me-2'; btn.textContent = a.type + (a.key? ' ['+a.key+']':''); btn.onclick = ()=> { if (a.type==='open_webpage') vscode.postMessage({type:'openExternal', url: a.param}); }; content.appendChild(btn); }); } if (sel && sel.annotations && sel.annotations.action==='display_image' && sel.annotations.src){ const img = document.createElement('img'); img.src = sel.annotations.src; img.alt = sel.annotations.alt || ''; img.style.maxWidth = '100%'; if (sel.annotations.width) img.style.width = sel.annotations.width + 'px'; content.appendChild(document.createElement('hr')); content.appendChild(img); } } catch (err) { vscode.postMessage({ type: 'webviewError', message: 'renderMain error', stack: err && err.stack }); } }

    function restartCycling(){ stopCycling(); if (!cycling) return; cycleTimer = setInterval(()=>{ cycleOnce(); }, intervalMs); }
    function stopCycling(){ if (cycleTimer) { clearInterval(cycleTimer); cycleTimer = null; } }

    function cycleOnce(){ try{ const nodes = getCurrentNodes(); if (!nodes || nodes.length===0) return; if (currentPath.length===0){ currentPath[0] = (currentPath[0]||0) + 1; } else { currentPath[currentPath.length-1] = (currentPath[currentPath.length-1]||0) + 1; } const parentPath = currentPath.slice(0, Math.max(0, currentPath.length-1)); const parent = safeGetNodeByPath(parentPath) || data.document; const lastIdx = currentPath.length? currentPath[currentPath.length-1] : 0; if ((parent.children || []).length && (lastIdx >= (parent.children||[]).length)) { currentPath[currentPath.length-1] = 0; } render(); } catch (err) { vscode.postMessage({ type: 'webviewError', message: 'cycleOnce error', stack: err && err.stack }); } }

    window.addEventListener('keydown', (ev)=>{ try{ if (ev.key === ' ') { cycling = !cycling; if (cycling) restartCycling(); else stopCycling(); ev.preventDefault(); } if (ev.key === 'Escape') { vscode.postMessage({type:'close'}); } if (ev.key === '=') { intervalMs = Math.max(100, intervalMs - 200); document.getElementById('interval').textContent = (intervalMs/1000).toFixed(1)+'s'; restartCycling(); } if (ev.key === '-') { intervalMs = intervalMs + 200; document.getElementById('interval').textContent = (intervalMs/1000).toFixed(1)+'s'; restartCycling(); } if (ev.key === 'a' || ev.key === 'A') { if (level>1) { level--; currentPath.pop(); render(); } } if (ev.key === 'd' || ev.key === 'D') { const nodes = getCurrentNodes(); if (nodes && nodes.length>0) { currentPath.push(0); level++; render(); } } if (ev.key === 'j' || ev.key === 'J') { if (currentPath.length>0) { currentPath[currentPath.length-1] = Math.max(0, (currentPath[currentPath.length-1]||0)-1); render(); } } if (ev.key === 'l' || ev.key === 'L') { if (currentPath.length>0) { const pnodes=(function(){let n=data.document; for(let i=0;i<currentPath.length-1;i++){ n=n.children[currentPath[i]];} return n.children||[];})(); const idx=currentPath[currentPath.length-1]||0; if (idx+1 < pnodes.length) { currentPath[currentPath.length-1]=idx+1; render(); } } } } catch (err) { vscode.postMessage({ type: 'webviewError', message: 'keydown handler error', stack: err && err.stack }); } });

    window.addEventListener('focus', ()=>{ if (cycling) restartCycling(); });
    window.addEventListener('blur', ()=>{ stopCycling(); });

    window.vscode_injected = { render };
  </script>
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js" crossorigin="anonymous"></script>
</body>
</html>`;
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) { text += possible.charAt(Math.floor(Math.random() * possible.length)); }
    return text;
}
