const lineNumberEl = document.getElementById("line-number");
const lineContentEl = document.getElementById("line-content");

window.addEventListener("message", (event) => {
    console.log("Received message in outlinesWebview.js:", event.data);
    if (event.data.type === "cursorLine") {
        lineNumberEl.textContent = event.data.line.toString();
    } else if (event.data.type === "lineContent") {
        lineContentEl.textContent = event.data.lineContent;
    }
});