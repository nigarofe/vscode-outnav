window.addEventListener('DOMContentLoaded', () => {
    const payloadJsonEl = document.getElementById("payloadJson");

    const parentsBreadcrumbEl = document.getElementById("parentsBreadcrumb");
    const currentItemEl = document.getElementById("currentItem");
    const outlinesTree = document.getElementById("outlinesTree");
    const siblingsEl = document.getElementById("siblings");

    window.addEventListener("message", (event) => {
        const payload = event.data.payload;

        payloadJsonEl.textContent = JSON.stringify(payload, null, 2);
        parentsBreadcrumbEl.textContent = payload.parents.join(" > ") + " > ";
        currentItemEl.textContent = payload.currentLineContent;

        // outlinesTree.innerHTML = '';
        // const renderedResult = renderNode(payload);
        // if (renderedResult && renderedResult.el) outlinesTree.appendChild(renderedResult.el);


        siblingsEl.innerHTML = '';
        payload.siblings.forEach(element => {
            const treeItem = document.createElement("vscode-tree-item");
            treeItem.textContent = element;
            siblingsEl.appendChild(treeItem);
        });
    });
});


// --- Keyboard shortcuts for RSVP / navigation ---
(function () {
    // Avoid installing multiple times
    if (window.__outlines_keyboard_installed) return;
    window.__outlines_keyboard_installed = true;

    function isTyping(event) {
        const t = event.target;
        return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
    }

    const lpmInput = document.getElementById('lpm');

    function changeLpm(delta) {
        if (!lpmInput) return;
        const cur = parseInt(lpmInput.value || '200', 10) || 0;
        const next = Math.max(1, Math.min(5000, cur + delta));
        lpmInput.value = next;
        lpmInput.dispatchEvent(new CustomEvent('lpmChanged', { detail: { lpm: next } }));
    }

    function togglePlay() {
        const paused = document.body.dataset.rsvpPaused === 'true' ? 'false' : 'true';
        document.body.dataset.rsvpPaused = paused;
        document.body.dispatchEvent(new CustomEvent('rsvpToggle', { detail: { paused: paused === 'true' } }));
    }

    function changeIndent(delta) {
        document.body.dispatchEvent(new CustomEvent('indentChange', { detail: { delta } }));
    }

    function navigate(direction) {
        // dispatch on document so any panel can catch it
        document.dispatchEvent(new CustomEvent('navigate', { detail: { direction } }));
    }

    window.addEventListener('keydown', (e) => {
        if (isTyping(e)) return;

        const key = e.key;
        switch (key) {
            case ' ': // space -> pause/continue
                e.preventDefault();
                togglePlay();
                break;
            case '-':
            case '_':
                e.preventDefault();
                changeLpm(-10);
                break;
            case '=':
            case '+':
                e.preventDefault();
                changeLpm(10);
                break;
            case 'a':
            case 'A':
                e.preventDefault();
                changeIndent(-1);
                break;
            case 'd':
            case 'D':
                e.preventDefault();
                changeIndent(1);
                break;
            case 'j':
            case 'J':
                e.preventDefault();
                navigate('previous');
                break;
            case 'l':
            case 'L':
                e.preventDefault();
                navigate('next');
                break;
            default:
                break;
        }
    });

    // Small public API for tests / other scripts
    window.outlinesKeyboard = { changeLpm, togglePlay, changeIndent, navigate };
})();