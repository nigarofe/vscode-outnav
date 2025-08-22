window.addEventListener('DOMContentLoaded', () => {
    const outlinesWebviewJSONel = document.getElementById("outlinesWebviewJSON");
    const parentsBreadcrumbEl = document.getElementById("parentsBreadcrumb");
    const currentItemEl = document.getElementById("currentItem");
    const indentationOrderingExerciseEl = document.getElementById("indentationOrderingExercise");
    const outlinesTree = document.getElementById("outlinesTree");
    const siblingsTree = document.getElementById("siblingsTree");

    window.addEventListener("message", (event) => {
        const payload = event.data.payload;

        outlinesWebviewJSONel.style.whiteSpace = 'pre-wrap'; // preserve line breaks and wrapping
        outlinesWebviewJSONel.textContent = JSON.stringify(payload, null, 2);
        parentsBreadcrumbEl.textContent = payload.parents.join(" > ") + " > ";
        currentItemEl.textContent = payload.currentLineContent;

        indentationOrderingExerciseEl.style.whiteSpace = 'pre-wrap'; // preserve line breaks and wrapping
        const raw = JSON.stringify(payload.indentationOrderingExercise, null, 2).replace(/[\[\]",]/g, '');
        indentationOrderingExerciseEl.textContent = raw.split('\n').map(line => line.trim()).join('\n');

        outlinesTree.innerHTML = '';

        // Recursive renderer for outline nodes. Handles:
        // - payload.outlinesJson being an array
        // - payload.outlinesJson being an object with a `document` wrapper
        // - nodes with `title`, `level`, and `children`
        // Render node and return a nested <vscode-tree-item> element (or DocumentFragment)
        function renderNode(node) {
            if (!node) return null;

            // If an array is provided, return a DocumentFragment with each child appended
            if (Array.isArray(node)) {
                const frag = document.createDocumentFragment();
                node.forEach(n => {
                    const el = renderNode(n);
                    if (el) frag.appendChild(el);
                });
                return frag;
            }

            // unwrap document wrapper if present
            if (node.document) return renderNode(node.document);

            const title = node.title || node.text || '';

            // Create a tree item and nest children inside it (matches the example structure)
            const treeItem = document.createElement('vscode-tree-item');
            const countSuffix = (node.children && node.children.length) ? ' (' + node.children.length + ')' : '';
            treeItem.textContent = title + countSuffix;

            if (node.children && node.children.length) {
                node.children.forEach(child => {
                    const childEl = renderNode(child);
                    if (childEl) treeItem.appendChild(childEl);
                });
            }

            return treeItem;
        }

        // Render whatever shape the payload provides and append it to the container
        const rendered = renderNode(payload.outlinesJson);
        if (rendered) outlinesTree.appendChild(rendered);

        siblingsTree.innerHTML = '';
        payload.siblings.forEach(element => {
            const treeItem = document.createElement("vscode-tree-item");
            treeItem.textContent = element;
            siblingsTree.appendChild(treeItem);
        });
    });
});
