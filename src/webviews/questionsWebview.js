// Tab handler: uses data-target first (cleaner attribute name) and toggles tab panes
// Works without Bootstrap's JS: finds nav links and toggles the corresponding .tab-pane elements
const tabLinks = document.querySelectorAll('.nav-pills .nav-link, .nav-pills vscode-button.nav-link');
const tabPanes = document.querySelectorAll('.tab-pane');

function activateTab(link) {
    if (!link) { return; }
    // prefer data-target, fall back to data-bs-target for compatibility
    const targetSelector = link.dataset.target || link.getAttribute('data-target') || link.dataset.bsTarget || link.getAttribute('data-bs-target');
    const targetId = targetSelector && targetSelector.toString().startsWith('#') ? targetSelector.toString().slice(1) : targetSelector;

    tabLinks.forEach(l => {
        const isActive = l === link;
        l.classList.toggle('active', isActive);
        l.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    tabPanes.forEach(p => {
        const isTarget = p.id === targetId;
        p.classList.toggle('active', isTarget);
        p.classList.toggle('show', isTarget);
    });
}

document.addEventListener('click', (e) => {
    const link = e.target.closest('.nav-pills .nav-link, .nav-pills vscode-button.nav-link');
    if (!link) { return; }
    // Prevent default so hash doesn't jump in the webview
    e.preventDefault();
    activateTab(link);
});

// Initialize: activate existing marked active link, or the first nav link
const initial = document.querySelector('.nav-pills .nav-link.active') || document.querySelector('.nav-pills .nav-link');
if (initial) { activateTab(initial); }
