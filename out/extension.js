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
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs_1 = require("fs");
function activate(context) {
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(editor => openCorrespondingWebview(editor, context)));
    // Send cursor line updates to the matching webview when the selection changes
    context.subscriptions.push(vscode.window.onDidChangeTextEditorSelection(e => {
        const editor = e.textEditor;
        if (!editor || !editor.document) {
            return;
        }
        const fileName = path.basename(editor.document.uri.fsPath);
        const mapping = fileWebviews[fileName];
        if (mapping && mapping.panel) {
            const currentLineNumber = editor.selection.active.line + 1;
            const currentLineContent = editor.document.lineAt(editor.selection.active.line).text;
            const currentIndentationLevel = (currentLineContent.match(/\t/g) || []).length;
            const parents = [];
            if (currentIndentationLevel > 0) {
                let targetIndent = currentIndentationLevel - 1;
                let searchIndex = editor.selection.active.line - 1;
                while (targetIndent >= 0 && searchIndex >= 0) {
                    let found = false;
                    for (let i = searchIndex; i >= 0; i--) {
                        const candidate = editor.document.lineAt(i).text;
                        if (candidate.trim().length === 0) {
                            continue;
                        }
                        ;
                        const candidateIndent = (candidate.match(/\t/g) || []).length;
                        if (candidateIndent === targetIndent) {
                            parents.unshift(candidate);
                            searchIndex = i - 1;
                            targetIndent--;
                            found = true;
                            break;
                        }
                    }
                    if (!found) {
                        break;
                    }
                    ;
                }
            }
            const payload = {
                currentLineNumber,
                currentLineContent,
                currentIndentationLevel,
                parents
            };
            console.log(`Cursor update: ${JSON.stringify(payload)}`);
            mapping.panel.webview.postMessage({ type: 'cursorUpdate', payload });
        }
    }));
    openCorrespondingWebview(vscode.window.activeTextEditor, context);
    // console.log(`Active file (name): ${getActiveEditor(vscode.window.activeTextEditor)}`);
    console.log('Last line of activate()');
}
const fileWebviews = {
    "Outlines.txt": {
        htmlFileName: "outlinesWebview.html",
        scriptFileName: "outlinesWebview.js",
        title: "Outlines",
        panel: undefined
    },
    "Premises.md": {
        htmlFileName: "premisesWebview.html",
        scriptFileName: "premisesWebview.js",
        title: "Premises",
        panel: undefined
    },
    "Questions.md": {
        htmlFileName: "questionsWebview.html",
        scriptFileName: "questionsWebview.js",
        title: "Questions",
        panel: undefined
    }
};
async function openCorrespondingWebview(editor, context) {
    const fileName = getActiveEditor(editor);
    if (!fileName) {
        // console.log("No active editor to open webview");
        return;
    }
    const mapping = fileWebviews[fileName];
    if (!mapping.panel) {
        mapping.panel = vscode.window.createWebviewPanel(fileName, mapping.title, vscode.ViewColumn.Two, { enableScripts: true });
        // Clear the reference when disposed so it can be recreated later
        mapping.panel.onDidDispose(() => { mapping.panel = undefined; });
    }
    let htmlPath = path.join(context.extensionPath, "src", "webviews", mapping.htmlFileName);
    let html = await fs_1.promises.readFile(htmlPath, 'utf8');
    const scriptUri = mapping.panel.webview.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath, 'src', 'webviews', mapping.scriptFileName)));
    const csp = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src ${mapping.panel.webview.cspSource}; style-src ${mapping.panel.webview.cspSource} 'unsafe-inline';">`;
    html = html.replace('%%SCRIPT_URI%%', scriptUri.toString())
        .replace('%%CSP%%', csp);
    console.log(`Opening webview for: ${fileName}`);
    mapping.panel.reveal(mapping.panel.viewColumn, true);
    mapping.panel.webview.html = html;
}
function getActiveEditor(editor) {
    if (editor && editor.document) {
        const fullPath = editor.document.uri.fsPath;
        const fileName = path.basename(fullPath);
        // console.log(`Active file (name): ${fileName}`);
        return `${fileName}`;
    }
    else {
        return undefined;
    }
}
//# sourceMappingURL=extension.js.map