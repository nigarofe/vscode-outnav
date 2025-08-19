import * as vscode from 'vscode';
import * as path from "path";
import {possibleWebviews} from './sharedHtmlProvider';

export function generateMessageForOutlines(editor: vscode.TextEditor){
    const fileName = path.basename(editor.document.uri.fsPath);
    const mapping = possibleWebviews[fileName];
    if (mapping && mapping.panel) {
        const currentLineNumber = editor.selection.active.line + 1;
        const currentLineContent = editor.document.lineAt(editor.selection.active.line).text;
        const currentIndentationLevel = (currentLineContent.match(/\t/g) || []).length;

        const parents: string[] = [];
        if (currentIndentationLevel > 0) {
            let targetIndent = currentIndentationLevel - 1;
            let searchIndex = editor.selection.active.line - 1;

            while (targetIndent >= 0 && searchIndex >= 0) {
                let found = false;
                for (let i = searchIndex; i >= 0; i--) {
                    const candidate = editor.document.lineAt(i).text;
                    if (candidate.trim().length === 0) {continue;};
                    const candidateIndent = (candidate.match(/\t/g) || []).length;
                    if (candidateIndent === targetIndent) {
                        parents.unshift(candidate);
                        searchIndex = i - 1;
                        targetIndent--;
                        found = true;
                        break;
                    }
                }
                if (!found) {break;};
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
}