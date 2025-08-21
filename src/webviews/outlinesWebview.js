const outlinesWebviewJSONel = document.getElementById("outlinesWebviewJSON");
const parentsBreadcrumbEl = document.getElementById("parentsBreadcrumb");
const currentItemEl = document.getElementById("currentItem");
const indentationOrderingExerciseEl = document.getElementById("indentationOrderingExercise");

window.addEventListener("message", (event) => {
    if (event.data.type === "onDidChangeTextEditorSelection") {
        outlinesWebviewJSONel.style.whiteSpace = 'pre-wrap'; // preserve line breaks and wrapping
        outlinesWebviewJSONel.textContent = JSON.stringify(event.data.payload, null, 2);
        parentsBreadcrumbEl.textContent = event.data.payload.parents.join(" > ") + " > ";
        currentItemEl.textContent = event.data.payload.currentLineContent;

        indentationOrderingExerciseEl.style.whiteSpace = 'pre-wrap'; // preserve line breaks and wrapping
        const raw = JSON.stringify(event.data.payload.indentationOrderingExercise, null, 2).replace(/[\[\]",]/g, '');
        indentationOrderingExerciseEl.textContent = raw.split('\n').map(line => line.trim()).join('\n');
    }
});
