const lineEl = document.getElementById("line-number");

window.addEventListener("message", (event) => {
    if (event.data.type === "cursorLine") {
        console.log(`Received event: ${JSON.stringify(event.data)}`);
        lineEl.textContent = event.data.line.toString();
    }
});