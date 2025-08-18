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
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
let cachedOutline = null;
let panel;
function activate(context) {
    // Determine workspace folder. Requirement: extension assumes user opened VS Code from the outnav-workspace folder.
    // Fallback: if workspace root is not outnav-workspace, look for a subfolder named outnav-workspace.
    const wf = (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0]) || undefined;
    const workspaceRoot = wf ? wf.uri.fsPath : undefined;
    // Paths relative to workspace root
    function outnavFolder() {
        if (!workspaceRoot) {
            return undefined;
        }
        const candidate = path.join(workspaceRoot, 'outnav-workspace');
        if (fs.existsSync(candidate)) {
            return candidate;
        }
        // maybe workspace is already the outnav-workspace folder
        if (path.basename(workspaceRoot) === 'outnav-workspace') {
            return workspaceRoot;
        }
        return workspaceRoot; // last resort
    }
    const outnav = outnavFolder();
    // Read outlines.json on activation as required
    if (outnav) {
        const outlinesJsonPath = path.join(outnav, 'json_exports', 'outlines.json');
        try {
            if (fs.existsSync(outlinesJsonPath)) {
                const txt = fs.readFileSync(outlinesJsonPath, 'utf8');
                cachedOutline = JSON.parse(txt);
            }
        }
        catch (e) {
            // ignore
            cachedOutline = null;
        }
    }
    // Register command
    const disposable = vscode.commands.registerCommand('vscode-outnav.startOutlineNavigator', async () => {
        if (!outnav) {
            vscode.window.showErrorMessage('Cannot find outnav-workspace folder in the workspace.');
            return;
        }
        const mdPath = path.join(outnav, 'Outlines.md');
        const jsonOutPath = path.join(outnav, 'json_exports', 'outlines.json');
        try {
            const md = fs.readFileSync(mdPath, 'utf8');
            const doc = parseOutlinesMarkdown(md);
            const wrapper = { document: doc };
            // ensure directory exists
            const dir = path.dirname(jsonOutPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(jsonOutPath, JSON.stringify(wrapper, null, 2), 'utf8');
            cachedOutline = wrapper;
            // open webview
            openWebview(context, cachedOutline, outnav);
        }
        catch (err) {
            vscode.window.showErrorMessage('Error parsing Outlines.md: ' + err.message);
        }
    });
    context.subscriptions.push(disposable);
}
function deactivate() {
    if (panel) {
        panel.dispose();
    }
}
function parseOutlinesMarkdown(md) {
    const lines = md.split(/\r?\n/);
    const root = { title: 'root', level: 0, children: [] };
    const stack = [root];
    for (let raw of lines) {
        if (!raw) {
            continue;
        }
        // detect comment lines starting with // (possibly after indentation)
        if (/^\s*\/\//.test(raw)) {
            continue;
        }
        // count leading tabs and spaces
        const leadingMatch = raw.match(/^(\t+| +)?(.*)$/s);
        let indent = 0;
        if (leadingMatch) {
            const leading = raw.match(/^(\t+)|( +)/);
            if (leading) {
                const t = leading[0];
                if (t.indexOf('\t') >= 0) {
                    indent = t.split('\t').length - 1 + 0;
                }
                else {
                    indent = Math.floor(t.length / 4);
                }
            }
            else {
                indent = 0;
            }
        }
        // compute level: 0 indent -> level 1
        const level = indent + 1;
        // extract content without leading whitespace
        const content = raw.replace(/^\s+/, '').trim();
        if (!content) {
            continue;
        }
        const node = { title: content, level, children: [] };
        // try parse trailing JSON annotation
        const jsonMatch = content.match(/^(.*?)(\s*(\{[\s\S]*\}))\s*$/s);
        if (jsonMatch) {
            const t = jsonMatch[1].trim();
            const js = jsonMatch[3];
            try {
                node.title = t;
                node.annotations = JSON.parse(js);
            }
            catch (e) {
                // ignore parse error
            }
        }
        else {
            // try bracket-style action [action:open_webpage key:F](url)
            const bracket = content.match(/^(.*?)\s*\[([^\]]+)\]\(([^)]+)\)\s*$/s);
            if (bracket) {
                node.title = bracket[1].trim();
                const inside = bracket[2];
                const url = bracket[3];
                const ann = {};
                // parse tokens like action:open_webpage key:F
                inside.split(/\s+/).forEach(token => {
                    const kv = token.split(':');
                    if (kv.length === 2) {
                        ann[kv[0]] = kv[1];
                    }
                });
                // map param url
                if (ann['action'] && ann['action'] === 'open_webpage') {
                    ann['url'] = url;
                }
                node.annotations = ann;
            }
        }
        // attach node in stack
        while (stack.length > 0 && stack[stack.length - 1].level >= level) {
            stack.pop();
        }
        const parent = stack[stack.length - 1] || root;
        parent.children.push(node);
        stack.push(node);
    }
    return root;
}
function openWebview(context, outlines, outnavPath) {
    if (panel) {
        panel.reveal(vscode.ViewColumn.One);
        panel.webview.postMessage({ type: 'update', outlines });
        return;
    }
    panel = vscode.window.createWebviewPanel('outnav', 'Outline Navigator', vscode.ViewColumn.One, {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.file(outnavPath)]
    });
    panel.webview.html = getWebviewHtml(panel.webview, context.extensionUri, outlines, outnavPath);
    panel.webview.onDidReceiveMessage(async (msg) => {
        if (msg.command === 'openExternal' && msg.url) {
            try {
                await vscode.env.openExternal(vscode.Uri.parse(msg.url));
            }
            catch (e) { }
        }
        else if (msg.command === 'close') {
            panel?.dispose();
        }
    }, undefined, context.subscriptions);
    panel.onDidDispose(() => { panel = undefined; }, null, context.subscriptions);
}
function getWebviewHtml(webview, extensionUri, outlines, outnavPath) {
    // Use Bootstrap CDN
    const bootstrapCss = 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css';
    // Make a copy of outlines where any local annotation.src is converted to a webview URI
    function makeSafeForWebview(srcOutlines) {
        if (!srcOutlines || !srcOutlines.document) {
            return { document: { title: 'root', level: 0, children: [] } };
        }
        function cloneNode(n) {
            const copy = { title: n.title, level: n.level, children: [] };
            if (n.annotations) {
                copy.annotations = Object.assign({}, n.annotations);
                if (copy.annotations.src && typeof copy.annotations.src === 'string' && !/^https?:\/\//.test(copy.annotations.src)) {
                    try {
                        const abs = path.isAbsolute(copy.annotations.src) ? copy.annotations.src : path.join(outnavPath, copy.annotations.src);
                        const uri = webview.asWebviewUri(vscode.Uri.file(abs));
                        copy.annotations.src = uri.toString();
                    }
                    catch (e) {
                        // leave original if conversion fails
                    }
                }
            }
            if (n.children && Array.isArray(n.children)) {
                copy.children = n.children.map((c) => cloneNode(c));
            }
            return copy;
        }
        return { document: cloneNode(srcOutlines.document) };
    }
    const safeOutlines = makeSafeForWebview(outlines || { document: { title: 'root', level: 0, children: [] } });
    const initialData = JSON.stringify(safeOutlines);
    // Basic webview with breadcrumb, dropdown cycling siblings, and main content area
    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link href="${bootstrapCss}" rel="stylesheet">
  <style>
    body { padding: 8px; }
    #breadcrumb { margin-bottom: 8px; }
    #main { border: 1px solid #ddd; padding: 12px; min-height: 300px; }
    .dropdown-toggle::after { margin-left: .5rem; }
  </style>
</head>
<body>
  <nav id="breadcrumb" aria-label="breadcrumb">
    <ol class="breadcrumb">
      <li class="breadcrumb-item"><a href="#" data-path="">Home</a></li>
      <li class="breadcrumb-item" id="level-crumb">/</li>
      <li class="breadcrumb-item dropdown">
        <a class="dropdown-toggle btn btn-sm btn-outline-secondary" href="#" role="button" id="dropdownMenuLink" data-bs-toggle="dropdown" aria-expanded="false">Current</a>
        <ul class="dropdown-menu" aria-labelledby="dropdownMenuLink" id="dropdown-list"></ul>
      </li>
    </ol>
  </nav>

  <div id="main">Select a page from the breadcrumb.</div>

  <script>
    const vscode = acquireVsCodeApi();
    const data = ${initialData};
    let currentPath = [];
    let currentNode = data.document;
    let cycleInterval = 1000;
    let cycleTimer = null;
    let cycling = true;
    let dropdownList = [];
    let dropdownIndex = 0;

    function findNodeByPath(path) {
      let node = data.document;
      for (const idx of path) {
        if (!node.children || node.children.length <= idx) return null;
        node = node.children[idx];
      }
      return node;
    }

    function renderBreadcrumb() {
      // show current path as chain of titles and populate dropdown with siblings of last level
      const levelCrumb = document.getElementById('level-crumb');
      // map indexes in currentPath to node titles (show only ancestors in the breadcrumb;
      // the final/current title is rendered in the dropdown button to avoid duplication)
      const titles = [];
      let node = data.document;
      for (let idx of currentPath) {
        if (!node.children || node.children.length <= idx) break;
        node = node.children[idx];
        titles.push(node.title);
      }
      const ancestors = titles.length > 0 ? titles.slice(0, -1) : [];
      levelCrumb.textContent = ancestors.length ? ancestors.join(' > ') : '/';
      const dropdown = document.getElementById('dropdown-list');
      dropdown.innerHTML = '';
      const parent = findNodeByPath(currentPath.slice(0, -1)) || data.document;
      dropdownList = parent.children || [];
      dropdownList.forEach((n, i) => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.className = 'dropdown-item';
        a.href = '#';
        a.textContent = n.title;
        a.addEventListener('click', (e) => { e.preventDefault(); selectSibling(i); pauseCycle(); });
        li.appendChild(a);
        dropdown.appendChild(li);
      });
  // set dropdown button text to the current node's title (avoid duplicating it in the breadcrumb)
  const btn = document.getElementById('dropdownMenuLink');
  btn.textContent = (currentNode && currentNode.title) ? currentNode.title : (dropdownList[0]?.title || 'Current');

      // hover/click pause behavior and custom toggle so Bootstrap JS isn't required
      const btnEl = document.getElementById('dropdownMenuLink');
      btnEl.onmouseenter = pauseCycle;
      // toggle dropdown visibility manually
      btnEl.addEventListener('click', (ev) => { ev.preventDefault(); pauseCycle(); toggleDropdown(); });
      // ensure dropdown is hidden when rendered
      hideDropdown();
    }

    function selectSibling(index) {
      if (currentPath.length===0) return;
      currentPath[currentPath.length-1] = index;
      currentNode = findNodeByPath(currentPath) || currentNode;
      renderMain();
      resetDropdownText();
      hideDropdown();
    }

    function resetDropdownText() {
      const btn = document.getElementById('dropdownMenuLink');
      btn.textContent = currentNode.title;
    }

    function toggleDropdown() {
      const dropdown = document.getElementById('dropdown-list');
      const parent = dropdown.parentElement;
      const isOpen = dropdown.classList.contains('show');
      if (isOpen) {
        dropdown.classList.remove('show');
        parent.classList.remove('show');
        btnSetExpanded(false);
      } else {
        dropdown.classList.add('show');
        parent.classList.add('show');
        btnSetExpanded(true);
      }
    }

    function hideDropdown() {
      const dropdown = document.getElementById('dropdown-list');
      const parent = dropdown.parentElement;
      dropdown.classList.remove('show');
      parent.classList.remove('show');
      btnSetExpanded(false);
    }

    function btnSetExpanded(v) {
      const btn = document.getElementById('dropdownMenuLink');
      btn.setAttribute('aria-expanded', v ? 'true' : 'false');
    }

    // close dropdown when clicking outside
    document.addEventListener('click', (ev) => {
      const btn = document.getElementById('dropdownMenuLink');
      const dropdown = document.getElementById('dropdown-list');
      if (!btn.contains(ev.target) && !dropdown.contains(ev.target)) {
        hideDropdown();
      }
    });

    function renderMain() {
      const main = document.getElementById('main');
      // Requirement: if there aren't any annotations on the title, the main content shall be empty
      if (!currentNode.annotations) {
        main.innerHTML = '';
        return;
      }

      main.innerHTML = '';
      const h = document.createElement('h4');
      h.textContent = currentNode.title;
      main.appendChild(h);

      const ann = currentNode.annotations;
      if (ann) {
        if (ann.action === 'display_image' && ann.src) {
          const img = document.createElement('img');
          // convert to webview resource
          img.src = ann.src;
          img.alt = ann.alt || ann.src;
          if (ann.width) img.width = ann.width;
          main.appendChild(img);
        } else if (ann.action === 'open_webpage' && ann.url) {
          const btn = document.createElement('button');
          btn.className = 'btn btn-primary';
          btn.textContent = 'Open link';
          btn.onclick = () => { vscode.postMessage({ command: 'openExternal', url: ann.url }); };
          main.appendChild(btn);
        }
      }

      // children list is not part of main content per new requirement; do not render children here
    }

    function pauseCycle() {
      cycling = false;
      if (cycleTimer) { clearInterval(cycleTimer); cycleTimer = null; }
    }

    function resumeCycle() {
      if (cycleTimer) clearInterval(cycleTimer);
      cycling = true;
      cycleTimer = setInterval(() => {
        if (!dropdownList || dropdownList.length===0) return;
        dropdownIndex = (dropdownIndex + 1) % dropdownList.length;
        const btn = document.getElementById('dropdownMenuLink');
        btn.textContent = dropdownList[dropdownIndex].title;
      }, cycleInterval);
    }

    function togglePlay() {
      if (cycling) pauseCycle(); else resumeCycle();
    }

    // keyboard controls
    window.addEventListener('keydown', (e) => {
      if (e.key === ' ') { e.preventDefault(); togglePlay(); }
      else if (e.key === 'Escape') { vscode.postMessage({ command: 'close' }); }
      else if (e.key === '=') { cycleInterval = Math.min(10000, cycleInterval + 250); if (cycling) resumeCycle(); }
      else if (e.key === '-') { cycleInterval = Math.max(100, cycleInterval - 250); if (cycling) resumeCycle(); }
      else if (e.key === 'A' || e.key === 'a') { // go up a level
        if (currentPath.length>0) { currentPath.pop(); currentNode = findNodeByPath(currentPath) || data.document; renderBreadcrumb(); renderMain(); }
      }
      else if (e.key === 'D' || e.key === 'd') { // go down to first child
        if (currentNode.children && currentNode.children.length) { currentPath.push(0); currentNode = currentNode.children[0]; renderBreadcrumb(); renderMain(); }
      }
      else if (e.key === 'J' || e.key === 'j') { // prev sibling
        if (currentPath.length>0) {
          const idx = currentPath[currentPath.length-1];
          if (idx>0) { currentPath[currentPath.length-1] = idx-1; currentNode = findNodeByPath(currentPath); renderBreadcrumb(); renderMain(); }
        }
      }
      else if (e.key === 'L' || e.key === 'l') { // next sibling
        if (currentPath.length>0) {
          const idx = currentPath[currentPath.length-1];
          const parent = findNodeByPath(currentPath.slice(0, -1)) || data.document;
          if (parent.children && idx < parent.children.length-1) { currentPath[currentPath.length-1] = idx+1; currentNode = findNodeByPath(currentPath); renderBreadcrumb(); renderMain(); }
        }
      }
    });

    // initialize
    // default to first top-level child
    if (data.document.children && data.document.children.length) {
      currentPath = [0];
      currentNode = data.document.children[0];
    } else { currentPath = []; currentNode = data.document; }
    renderBreadcrumb(); renderMain();
    resumeCycle();

    // messages from extension
    window.addEventListener('message', event => {
      const msg = event.data;
      if (msg.type === 'update') {
        // not implemented: could update data
      }
    });
  </script>
</body>
</html>`;
}
//# sourceMappingURL=extension.js.map