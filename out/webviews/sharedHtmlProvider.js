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
exports.openCorrespondingWebview = openCorrespondingWebview;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs_1 = require("fs");
const possibleWebviews = {
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
async function openCorrespondingWebview(context, fileName) {
    // console.log(`Opening webview for: ${fileName}`);
    const mapping = possibleWebviews[fileName];
    if (!mapping.panel) {
        mapping.panel = vscode.window.createWebviewPanel(fileName, mapping.title, vscode.ViewColumn.Two, { enableScripts: true });
        mapping.panel.onDidDispose(() => { mapping.panel = undefined; });
    }
    const htmlPath = path.join(context.extensionPath, "src", "webviews", mapping.htmlFileName);
    const jsPath = path.join(context.extensionPath, "src", "webviews", mapping.scriptFileName);
    let html = await fs_1.promises.readFile(htmlPath, 'utf8');
    const scriptUri = mapping.panel.webview.asWebviewUri(vscode.Uri.file(jsPath));
    const csp = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src ${mapping.panel.webview.cspSource}; style-src ${mapping.panel.webview.cspSource} 'unsafe-inline';">`;
    html = html.replace('%%SCRIPT_URI%%', scriptUri.toString()).replace('%%CSP%%', csp);
    mapping.panel.webview.html = html;
    mapping.panel.reveal(mapping.panel.viewColumn, true);
}
//# sourceMappingURL=sharedHtmlProvider.js.map