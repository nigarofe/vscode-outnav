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
    openCorrespondingWebview(vscode.window.activeTextEditor, context);
    // console.log(`Active file (name): ${getActiveEditor(vscode.window.activeTextEditor)}`);
    console.log('Last line of activate()');
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
const fileWebviews = {
    "Outlines.txt": {
        htmlFileName: "outlines.html",
        panel: vscode.window.createWebviewPanel("outlines", "Outlines", vscode.ViewColumn.Two, {})
    },
    "Premises.md": {
        htmlFileName: "premises.html",
        panel: vscode.window.createWebviewPanel("premises", "Premises", vscode.ViewColumn.Two, {})
    },
    "Questions.md": {
        htmlFileName: "questions.html",
        panel: vscode.window.createWebviewPanel("questions", "Questions", vscode.ViewColumn.Two, {})
    }
};
async function openCorrespondingWebview(editor, context) {
    const fileName = getActiveEditor(editor);
    if (!fileName) {
        console.log("No active editor to open webview");
        return;
    }
    const mapping = fileWebviews[fileName];
    let htmlPath = path.join(context.extensionPath, "src", "webviews", mapping.htmlFileName);
    let html = await fs_1.promises.readFile(htmlPath, 'utf8');
    console.log(`Opening webview for: ${fileName}`);
    mapping.panel.reveal(vscode.ViewColumn.Beside, true);
    mapping.panel.webview.html = html;
}
//# sourceMappingURL=extension.js.map