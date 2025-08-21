window.renderKatex = function renderKatex() {
    renderMathInElement(document.body, {
        delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false },
            { left: '\\(', right: '\\)', display: false },
            { left: '\\[', right: '\\]', display: true }
        ],
        throwOnError: false
    });
};

window.markdownToHtml = function markdownToHtml(markdown) {
    const md = window.markdownit({
        html: true,        // allows raw HTML in markdown (use cautiously)
        linkify: true,
        typographer: true
    });

    const mathBlocks = [];
    const PLACEHOLDER_PREFIX = '%%KATEX_MATH_BLOCK_';

    const protectedMarkdown = String(markdown).replace(/(\$\$[\s\S]*?\$\$)|(\$[^\n][\s\S]*?\$)/g, (match) => {
        const idx = mathBlocks.length;
        mathBlocks.push(match);
        return `${PLACEHOLDER_PREFIX}${idx}%%`;
    });

    let html = md.render(protectedMarkdown);

    html = html.replace(new RegExp(PLACEHOLDER_PREFIX + "(\\d+)%%", 'g'), (m, idx) => {
        return mathBlocks[Number(idx)];
    });

    html = html.replace(/<hr\s*\/?\s*>/gi, '<vscode-divider></vscode-divider>');

    return html;
};