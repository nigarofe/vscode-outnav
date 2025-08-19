const lineNumberEl = document.getElementById("line-number");
const lineContentEl = document.getElementById("line-content");
const indentationLevelEl = document.getElementById("indentation-level");
const parentsEl = document.getElementById("parents");

window.addEventListener("message", (event) => {
    console.log("Received message in outlinesWebview.js:", event.data);
    if (event.data.type === "currentLineNumber") {
        lineNumberEl.textContent = event.data.currentLineNumber.toString();
    } else if (event.data.type === "currentLineContent") {
        lineContentEl.textContent = event.data.currentLineContent;
    } else if (event.data.type === "currentIndentationLevel") {
        indentationLevelEl.textContent = event.data.currentIndentationLevel.toString();
    } else if (event.data.type === "parents") {
        parentsEl.textContent = event.data.parents.join(" > ");
    }
});