import * as fs from 'fs/promises';
import * as path from 'path';
import { possibleWebviews } from '../webviews-config';

export async function parseOutlinesToJson() {
    const mapping = possibleWebviews['Outlines.txt'];
    const raw = await fs.readFile(mapping.filePath, 'utf8');

    // Split the outlines by lines and filter out empty lines
    const lines = raw.split(/\r?\n/).map(l => l.replace(/\r$/, ''))
        .map(l => l.replace(/\uFEFF/g, '')) // strip BOM if present
        .map(l => l.replace(/\s+$/g, ''))
        .filter(l => l.trim().length > 0);

    interface OutlineNode { title: string; level: number; children?: OutlineNode[] }

    // Create a synthetic root that will hold all top-level entries. Root.level = 0.
    const root: OutlineNode = { title: 'Document', level: 0, children: [] };

    // stack[level] = last node seen at that level. seed with root at level 0.
    const stack: OutlineNode[] = [];
    stack[0] = root;

    function countIndent(s: string) {
        const m = s.match(/^([\t ]*)/);
        if (!m) return 0;
        const indent = m[1] || '';
        // The outlines format expresses indentation as tabs. Count tabs only.
        // Mixing spaces and tabs can produce unexpected levels; prefer tabs per spec.
        const tabs = (indent.match(/\t/g) || []).length;
        return tabs;
    }

    for (const rawLine of lines) {
        const indentLevel = countIndent(rawLine);
        const title = rawLine.replace(/^([\t ]*)/, '').trim();
        // Map file indent to node.level where root=0, so top-level items become level 1.
        let nodeLevel = indentLevel + 1;

        // If stack doesn't have parent at nodeLevel-1, clamp to nearest existing parent.
        while (nodeLevel - 1 > stack.length - 1) {
            nodeLevel -= 1;
        }

        const node: OutlineNode = { title, level: nodeLevel, children: [] };

        const parent = stack[nodeLevel - 1] || root;
        if (!parent.children) parent.children = [];
        parent.children.push(node);

        // set/replace stack entry for this level and truncate deeper levels
        stack[nodeLevel] = node;
        stack.length = nodeLevel + 1;
    }

    const out = { document: root };

    await fs.mkdir(path.dirname(mapping.jsonExportPath), { recursive: true });
    await fs.writeFile(mapping.jsonExportPath, JSON.stringify(out, null, 2), 'utf8');

    return mapping.jsonExportPath;
}
