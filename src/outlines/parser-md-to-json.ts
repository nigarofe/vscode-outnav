import { WORKSPACE_DIR, EXTENSION_SRC } from '../extension';
import * as fs from 'fs/promises';
import * as path from 'path';

export async function parseOutlinesToJson() {
    interface OutlineNode { title: string; line: number; level: number; children?: OutlineNode[] }
    const stack: OutlineNode[] = [];
    const roots: OutlineNode[] = []; // collect top-level nodes when parent is undefined

    const raw = await fs.readFile(path.join(WORKSPACE_DIR, 'Outlines.md'), 'utf8');
    const lines = raw.split(/\r?\n/).map(l => l.replace(/\r$/, ''))
        .map(l => l.replace(/\uFEFF/g, ''))
        .map(l => l.replace(/\s+$/g, ''))
        .filter(l => l.trim().length > 0);

    for (let i = 0; i < lines.length; i++) {
        const rawLine = lines[i];
        const indentLevel = countIndent(rawLine);
        const title = rawLine.replace(/^([\t ]*)/, '').trim();
        let nodeLevel = indentLevel + 1;

        while (nodeLevel - 1 > stack.length - 1) {
            nodeLevel -= 1;
        }

        const node: OutlineNode = { title, line: i+1, level: nodeLevel, children: [] };

        const parent = stack[nodeLevel - 1];
        if (parent) {
            if (!parent.children) parent.children = [];
            parent.children.push(node);
        } else {
            // no parent at that level => treat as top-level
            roots.push(node);
        }

        stack[nodeLevel] = node;
        stack.length = nodeLevel + 1;
    }

    const out = { outlines: roots };

    let data_path = path.join(EXTENSION_SRC, 'outlines', 'data-exported.json');
    await fs.writeFile(data_path, JSON.stringify(out, null, 2), 'utf8');

    return data_path
}


function countIndent(s: string) {
    const m = s.match(/^([\t ]*)/);
    if (!m) return 0;
    const indent = m[1] || '';
    const tabs = (indent.match(/\t/g) || []).length;
    return tabs;
}