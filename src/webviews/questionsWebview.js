// Tab handler that mirrors the HTML's nav-pills + tab-pane structure
// Works without Bootstrap's JS: finds nav links with data-bs-target and toggles
// the corresponding .tab-pane elements (adds/removes `active` and `show`).
const tabLinks = document.querySelectorAll('.nav-pills .nav-link');
const tabPanes = document.querySelectorAll('.tab-pane');

function activateTab(link) {
    if (!link) { return; }
    // data-bs-target is used in the HTML (eg. "#pills-viewer")
    const targetSelector = link.dataset.bsTarget || link.getAttribute('data-bs-target') || link.dataset.target || link.getAttribute('data-target');
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
    const link = e.target.closest('.nav-pills .nav-link');
    if (!link) { return; }
    // Prevent default so hash doesn't jump in the webview
    e.preventDefault();
    activateTab(link);
});

// Initialize: activate existing marked active link, or the first nav link
const initial = document.querySelector('.nav-pills .nav-link.active') || document.querySelector('.nav-pills .nav-link');
if (initial) { activateTab(initial); }
