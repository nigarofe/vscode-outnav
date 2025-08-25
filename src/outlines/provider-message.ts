import * as vscode from 'vscode';
import { readJson } from '../common/json-reader';

function normalizeTitle(s: string) {
    return (s || '').toLowerCase().replace(/\s+/g, ' ').replace(/["'`{}\[\]\(\)]/g, '').trim();
}

export async function generateMessageForOutlines(editor: vscode.TextEditor) {
    const currentLineNumber = editor.selection.active.line + 1;
    const currentLineContent = editor.document.lineAt(editor.selection.active.line).text;
    const currentIndentationLevel = (currentLineContent.match(/\t/g) || []).length;

    const outlinesJson = await readJson('outlines');
    if (!outlinesJson) {
        console.error('No outlinesJson provided');
        return null;
    }

    const payload = {
        siblings: getSiblings(outlinesJson, currentLineContent),
        parents: getParents(outlinesJson, currentLineContent),

        currentLineNumber,
        currentLineContent,
        currentIndentationLevel,
        selectedLines: getSelectedLines(editor),

        selectedRange: editor.selection,
        outlinesJson
    };

    // console.log('Sent payload:', payload);
    return payload;
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

    const title = currentLineContent.replace(/\t/g, '').trim();
    const tabCount = (currentLineContent.match(/\t/g) || []).length;
    // parser now writes level as zero-based indent counts; be tolerant and accept either
    const expectedLevel = tabCount;

    // normalize root: support several shapes: { outlines: [...] }, { document: ... }, array, or single object
    const roots: any[] = [];
    if ((outlinesJson as any).outlines && Array.isArray((outlinesJson as any).outlines)) {
        roots.push(...(outlinesJson as any).outlines);
    } else if ((outlinesJson as any).document) {
        roots.push((outlinesJson as any).document);
    } else if (Array.isArray(outlinesJson)) {
        roots.push(...outlinesJson);
    } else {
        roots.push(outlinesJson as any);
    }

    function normalizeTitle(s: string) {
        return (s || '').toLowerCase().replace(/\s+/g, ' ').replace(/["'`{}\[\]\(\)]/g, '').trim();
    }

    const targetNorm = normalizeTitle(title);

    function findPath(node: any, targetTitle: string, path: any[]): any[] | null {
        const newPath = path.concat(node);
        const nodeTitleNorm = node && node.title ? normalizeTitle(node.title) : '';
        if (node && node.title && nodeTitleNorm === targetNorm && (node.level == null || node.level === expectedLevel || node.level === expectedLevel + 1)) {
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
    const expectedLevel = tabCount;

    // normalize roots: support { outlines: [...] }, { document: ... }, array, single object
    const roots: any[] = [];
    if ((outlinesJson as any).outlines && Array.isArray((outlinesJson as any).outlines)) {
        roots.push(...(outlinesJson as any).outlines);
    } else if ((outlinesJson as any).document) {
        roots.push((outlinesJson as any).document);
    } else if (Array.isArray(outlinesJson)) {
        roots.push(...outlinesJson);
    } else {
        roots.push(outlinesJson as any);
    }

    const targetNorm = normalizeTitle(title);

    function findPath(node: any, targetTitle: string, path: any[]): any[] | null {
        const newPath = path.concat(node);
        const nodeTitleNorm = node && node.title ? normalizeTitle(node.title) : '';
        if (node && node.title && nodeTitleNorm === targetNorm && (node.level == null || node.level === expectedLevel || node.level === expectedLevel + 1)) {
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
            // if parent is null the node is a top-level root; siblings are other roots
            const candidates = parent ? parent.children : roots;
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