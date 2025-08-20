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
        
        const payload = {
            currentLineNumber,
            selectedRange: editor.selection,
            currentLineContent,
            currentIndentationLevel,
            parents: getParents(editor, currentIndentationLevel),
            simblings: getSimblings(editor, currentIndentationLevel),
            selectedLines: getSelectedLines(editor),
            indentationOrderingExercise: getIndentationOrderingExercise(editor)
        };

        // console.log(`Cursor update: ${JSON.stringify(payload)}`);

        mapping.panel.webview.postMessage({ type: 'cursorUpdate', payload });
    }
}

function getIndentationOrderingExercise(editor: vscode.TextEditor) {
    const lines = getSelectedLines(editor);
    
    const processed = lines
        .map(line => line.replace(/\t/g, ''))
        .filter(line => line.trim().length > 0);

    // Fisher–Yates shuffle
    for (let i = processed.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = processed[i];
        processed[i] = processed[j];
        processed[j] = tmp;
    }

    return processed;
}

function getSelectedLines(editor: vscode.TextEditor) {
    const selectedLines: string[] = [];
    const startLine = editor.selection.start.line;
    const endLine = editor.selection.end.line;

    for (let i = startLine; i <= endLine; i++) {
        selectedLines.push(editor.document.lineAt(i).text);
    }

    return selectedLines;
}

function getParents(editor: vscode.TextEditor, currentIndentationLevel: number) {
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
       return parents;
}

function getSimblings(editor: vscode.TextEditor, currentIndentationLevel: number) {
    const simblings: string[] = [];
    const currentLine = editor.selection.active.line;

    // Look upward for earlier siblings until we hit the first parent (indentation < current)
    for (let i = currentLine - 1; i >= 0; i--) {
        const line = editor.document.lineAt(i);
        if (line.text.trim().length === 0) { continue; }
        const lineIndentationLevel = (line.text.match(/\t/g) || []).length;

        if (lineIndentationLevel === currentIndentationLevel) {
            simblings.unshift(line.text);
        } else if (lineIndentationLevel < currentIndentationLevel) {
            break;
        }
    }

    // Look downward for later siblings (original behavior)
    for (let i = currentLine + 1; i < editor.document.lineCount; i++) {
        const line = editor.document.lineAt(i);
        const lineIndentationLevel = (line.text.match(/\t/g) || []).length;

        if (lineIndentationLevel === currentIndentationLevel) {
            simblings.push(line.text);
        } else if (lineIndentationLevel < currentIndentationLevel) {
            break;
        }
    }

    // remove empty/whitespace-only simblings in-place
    for (let i = simblings.length - 1; i >= 0; i--) {
        if (simblings[i].trim().length === 0) {
            simblings.splice(i, 1);
        }
    }
    return simblings;
}