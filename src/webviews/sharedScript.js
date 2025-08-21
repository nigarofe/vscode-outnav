// expose renderKatex on the global window so other module scripts can call it
window.renderKatex = function renderKatex() {
    renderMathInElement(document.body, {
        // customised options
        // • auto-render specific keys, e.g.:
        delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false },
            { left: '\\(', right: '\\)', display: false },
            { left: '\\[', right: '\\]', display: true }
        ],
        // • rendering keys, e.g.:
        throwOnError: false
    });
};

window.markdownToHtml = function markdownToHtml(markdown) {
    const md = window.markdownit({
        html: true,        // allows raw HTML in markdown (use cautiously)
        linkify: true,
        typographer: true
    });

    let html = md.render(String(markdown));
    html = html.replace(/<hr\s*\/?>/gi, '<vscode-divider></vscode-divider>');

    return html;
};