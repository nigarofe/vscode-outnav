import * as vscode from 'vscode';
import { readJson } from './readJson';

export async function generateMessageForOutlines(editor: vscode.TextEditor) {
    const currentLineNumber = editor.selection.active.line + 1;
    const currentLineContent = editor.document.lineAt(editor.selection.active.line).text;
    const currentIndentationLevel = (currentLineContent.match(/\t/g) || []).length;

    const outlinesJson = await readJson('outlines.json', 'document');

    const payload = {
        currentLineNumber,
        selectedRange: editor.selection,
        currentLineContent,
        currentIndentationLevel,
        selectedLines: getSelectedLines(editor),
        indentationOrderingExercise: getIndentationOrderingExercise(editor),

        outlinesJson,
        siblings: getSiblings(outlinesJson, currentLineContent),
        parents: getParents(outlinesJson, currentLineContent),
    };

    console.log('Sent payload:', payload);
    return payload;
}

// readJson handles loading outlines.json from the exports directory

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

function getParents(outlinesJson: any[] | null, currentLineContent: string): string[] {
    const parents: string[] = [];
    if (!outlinesJson) console.error('No outlinesJson provided');
    if (!outlinesJson) return parents;

    const title = currentLineContent.replace(/\t/g, '').trim();
    const tabCount = (currentLineContent.match(/\t/g) || []).length;
    // JSON 'level' appears to be 1-based under the document root while tabs are 0-based
    const expectedLevel = tabCount + 1;

    // normalize root: if outlinesJson has a `document` root, start from it
    const roots: any[] = [];
    if ((outlinesJson as any).document) {
        roots.push((outlinesJson as any).document);
    } else if (Array.isArray(outlinesJson)) {
        roots.push(...outlinesJson);
    } else {
        roots.push(outlinesJson as any);
    }

    function findPath(node: any, targetTitle: string, path: any[]): any[] | null {
        const newPath = path.concat(node);
        if (node && node.title && node.title.trim() === targetTitle && (node.level == null || node.level === expectedLevel)) {
            return newPath;
        }

        if (!node || !Array.isArray(node.children)) return null;

        for (const child of node.children) {
            const found = findPath(child, targetTitle, newPath);
            if (found) return found;
        }

        return null;
    }

    for (const root of roots) {
        const path = findPath(root, title, []);
        if (path) {
            // drop the last element (the current node) and return titles of ancestors
            const ancestorNodes = path.slice(0, -1);
            return ancestorNodes.map(n => n.title);
        }
    }

    return parents;
}

function getSiblings(outlinesJson: any[] | null, currentLineContent: string): string[] {
    const siblings: string[] = [];
    if (!outlinesJson) return siblings;

    const title = currentLineContent.replace(/\t/g, '').trim();
    const tabCount = (currentLineContent.match(/\t/g) || []).length;
    const expectedLevel = tabCount + 1;

    const roots: any[] = [];
    if ((outlinesJson as any).document) {
        roots.push((outlinesJson as any).document);
    } else if (Array.isArray(outlinesJson)) {
        roots.push(...outlinesJson);
    } else {
        roots.push(outlinesJson as any);
    }

    function findPath(node: any, targetTitle: string, path: any[]): any[] | null {
        const newPath = path.concat(node);
        if (node && node.title && node.title.trim() === targetTitle && (node.level == null || node.level === expectedLevel)) {
            return newPath;
        }

        if (!node || !Array.isArray(node.children)) return null;

        for (const child of node.children) {
            const found = findPath(child, targetTitle, newPath);
            if (found) return found;
        }

        return null;
    }

    for (const root of roots) {
        const path = findPath(root, title, []);
        if (path) {
            // parent is previous element in the path (if any)
            const parent = path.length >= 2 ? path[path.length - 2] : null;
            const candidates = parent ? parent.children : (root.children || []);
            if (!Array.isArray(candidates)) return siblings;

            for (const c of candidates) {
                if (c && c.title && c.title.trim() !== title) siblings.push(c.title);
            }

            if (siblings.length === 0) {
                return ['No siblings found'];
            }
            return siblings;
        }
    }
    if (siblings.length === 0) {
        return ['No siblings found'];
    }
    return siblings;
}