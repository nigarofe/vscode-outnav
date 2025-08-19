const outlinesWebviewJSONel = document.getElementById("outlinesWebviewJSON");
const parentsBreadcrumbEl = document.getElementById("parentsBreadcrumb");
const currentItemEl = document.getElementById("currentItem");

window.addEventListener("message", (event) => {
    if (event.data.type === "cursorUpdate") {
        outlinesWebviewJSONel.style.whiteSpace = 'pre-wrap'; // preserve line breaks and wrapping
        outlinesWebviewJSONel.textContent = JSON.stringify(event.data.payload, null, 2);
        parentsBreadcrumbEl.textContent = event.data.payload.parents.join(" > ") + " > ";
        currentItemEl.textContent = event.data.payload.currentLineContent;
    }
});
