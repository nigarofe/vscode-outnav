let RVSP_lpm = 200;
let RVSP_indentation = 0;
let RVSP_childNumber = 1;

const payloadJsonEl = document.getElementById("payloadJson");

const parentsBreadcrumbEl = document.getElementById("parentsBreadcrumb");
const currentItemEl = document.getElementById("currentItem");
const siblingsEl = document.getElementById("siblings");

const lpmValueEl = document.getElementById('lpmValue');
const indentationValueEl = document.getElementById('indentationValue');
const childNumberValueEl = document.getElementById('childNumberValue');

window.addEventListener('DOMContentLoaded', () => {
    window.addEventListener("message", (event) => {
        const payload = event.data.payload;

        payloadJsonEl.textContent = JSON.stringify(payload, null, 2);
        parentsBreadcrumbEl.textContent = payload.parents.join(" > ") + " > ";
        currentItemEl.textContent = payload.currentLineContent;

        siblingsEl.innerHTML = '';
        payload.siblings.forEach(element => {
            const treeItem = document.createElement("vscode-tree-item");
            treeItem.textContent = element;
            siblingsEl.appendChild(treeItem);
        });
    });

});

function changeLpm(delta) {
    const next = Math.max(1, Math.min(5000, RVSP_lpm + delta));
    RVSP_lpm = next;
    lpmValueEl.textContent = next;
    lpmValueEl.dispatchEvent(new CustomEvent('lpmChanged', { detail: { lpm: next } }));
}

function changeIndent(delta) {
    const next = Math.max(0, Math.min(20, RVSP_indentation + delta));
    RVSP_indentation = next;
    indentationValueEl.textContent = next;
    indentationValueEl.dispatchEvent(new CustomEvent('indentationChanged', { detail: { indentation: next } }));
}

function changeChildNumber(delta) {
    const next = Math.max(1, RVSP_childNumber + delta);
    RVSP_childNumber = next;
    childNumberValueEl.textContent = next;
    childNumberValueEl.dispatchEvent(new CustomEvent('childNumberChanged', { detail: { childNumber: next } }));
}


// --- Keyboard shortcuts for RSVP  ---
window.addEventListener('keydown', (e) => {
    const key = e.key;
    switch (key) {
        case ' ': // space -> pause/continue
            e.preventDefault();
            togglePlay();
            break;
        case '-':
            e.preventDefault();
            changeLpm(-10);
            break;
        case '=':
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
            changeChildNumber(-1);
            navigate('previous');
            break;
        case 'l':
        case 'L':
            e.preventDefault();
            changeChildNumber(1);
            navigate('next');
            break;
        default:
            break;
    }
});