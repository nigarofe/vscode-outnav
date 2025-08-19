const outlinesWebviewJSONel = document.getElementById("outlinesWebviewJSON");

window.addEventListener("message", (event) => {
    console.log("Received message in outlinesWebview.js:", event.data);
    if (event.data.type === "cursorUpdate") {
        outlinesWebviewJSONel.style.whiteSpace = 'pre-wrap'; // preserve line breaks and wrapping
        outlinesWebviewJSONel.textContent = JSON.stringify(event.data.payload, null, 2);
    }
});