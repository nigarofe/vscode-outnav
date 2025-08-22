window.addEventListener('DOMContentLoaded', () => {
    const outlinesWebviewJSONel = document.getElementById("outlinesWebviewJSON");
    const parentsBreadcrumbEl = document.getElementById("parentsBreadcrumb");
    const currentItemEl = document.getElementById("currentItem");
    const indentationOrderingExerciseEl = document.getElementById("indentationOrderingExercise");
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

        siblingsTree.innerHTML = '';
        payload.siblings.forEach(element => {
            const treeItem = document.createElement("vscode-tree-item");
            treeItem.textContent = element;
            siblingsTree.appendChild(treeItem);
        });
    });
});
