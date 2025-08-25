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

    // Protect math expressions from markdown processing
    const protectedMarkdown = String(markdown).replace(/(\$\$[\s\S]*?\$\$)|(\$[^\n][\s\S]*?\$)/g, (match) => {
        const idx = mathBlocks.length;
        mathBlocks.push(match);
        return `${PLACEHOLDER_PREFIX}${idx}%%`;
    });

    let html = md.render(protectedMarkdown);

    // Restore protected math expressions
    html = html.replace(new RegExp(PLACEHOLDER_PREFIX + "(\\d+)%%", 'g'), (m, idx) => {
        return mathBlocks[Number(idx)];
    });

    // Convert horizontal rules to vscode-divider components
    html = html.replace(/<hr\s*\/?\s*>/gi, '<vscode-divider></vscode-divider>');

    // Convert relative image paths to webview URIs
    html = convertImagePaths(html);

    return html;
};

function convertImagePaths(html) {
    // Check if image URI mappings are available
    if (!window.imageUriMappings) {
        return html;
    }

    // Replace img src attributes with webview URIs
    return html.replace(/<img([^>]*)\ssrc=["']([^"']+)["']([^>]*)>/gi, (match, beforeSrc, srcPath, afterSrc) => {
        // Skip if it's already a full URI (http or vscode-webview)
        if (srcPath.startsWith('http') || srcPath.startsWith('vscode-webview://')) {
            return match;
        }

        // Look up the webview URI in our mappings
        const webviewUri = window.imageUriMappings[srcPath];
        if (webviewUri) {
            return `<img${beforeSrc} src="${webviewUri}"${afterSrc}>`;
        }

        // If no mapping found, leave unchanged (this may cause access errors)
        return match;
    });
}