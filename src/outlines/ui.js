let RVSP_lpm = 200;
let RVSP_indentation = 0;
let RVSP_itemNumber = 1;

const payloadJsonEl = document.getElementById("payloadJson");

const parentsBreadcrumbEl = document.getElementById("parentsBreadcrumb");
const currentItemEl = document.getElementById("currentItem");
const siblingsEl = document.getElementById("siblings");

const lpmValueEl = document.getElementById('lpmValue');
const indentationValueEl = document.getElementById('indentationValue');
const itemNumberValueEl = document.getElementById('itemNumberValue');

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

function changeItemNumber(delta) {
    const next = Math.max(1, RVSP_itemNumber + delta);
    RVSP_itemNumber = next;
    itemNumberValueEl.textContent = next;
    itemNumberValueEl.dispatchEvent(new CustomEvent('itemNumberChanged', { detail: { itemNumber: next } }));
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
            changeItemNumber(-1);
            navigate('previous');
            break;
        case 'l':
        case 'L':
            e.preventDefault();
            changeItemNumber(1);
            navigate('next');
            break;
        default:
            break;
    }
});