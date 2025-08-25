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



        // if (!window.__outnav_message_handler_installed) {
        //     const __outnav_message_handler = (event) => {
        //         const payload = event.data.payload;

        //         outlinesWebviewJSONel.textContent = JSON.stringify(payload, null, 2);
        //         parentsBreadcrumbEl.textContent = payload.parents.join(" > ") + " > ";
        //         currentItemEl.textContent = payload.currentLineContent;

        //         // outlinesTree.innerHTML = '';
        //         // const renderedResult = renderNode(payload);
        //         // if (renderedResult && renderedResult.el) outlinesTree.appendChild(renderedResult.el);


        //         siblingsEl.innerHTML = '';
        //         payload.siblings.forEach(element => {
        //             const treeItem = document.createElement("vscode-tree-item");
        //             treeItem.textContent = element;
        //             siblingsEl.appendChild(treeItem);
        //         });
        //     };
        //     window.addEventListener("message", __outnav_message_handler);
        //     window.__outnav_message_handler_installed = true;
        // }
    





// function renderNode(payload) {
//     const node = payload.outlinesJson;
//     if (!node) return { el: null, found: false };

//     // If an array is provided, return a DocumentFragment with each child appended
//     if (Array.isArray(node)) {
//         const frag = document.createDocumentFragment();
//         let anyFound = false;
//         node.forEach(n => {
//             const { el, found } = renderNode(n);
//             if (el) frag.appendChild(el);
//             if (found) anyFound = true;
//         });
//         return { el: frag, found: anyFound };
//     }

//     // unwrap document wrapper if present
//     if (node.document) return renderNode(node.document);

//     const title = (node.title || node.text || '').toString();
//     const current = (payload.currentLineContent || '').toString();

//     // Create a tree item and nest children inside it (matches the example structure)
//     const treeItem = document.createElement('vscode-tree-item');
//     const countSuffix = (node.children && node.children.length) ? ' (' + node.children.length + ')' : '';
//     treeItem.textContent = title + countSuffix;

//     // Render children and detect if any descendant matches
//     let descendantFound = false;
//     if (node.children && node.children.length) {
//         node.children.forEach(child => {
//             const { el, found } = renderNode(child);
//             if (el) treeItem.appendChild(el);
//             if (found) descendantFound = true;
//         });
//     }

//     // Determine if this node matches the current line. Use a few sensible
//     // matching heuristics: exact match, trimmed equality, or containment.
//     const matches = (title === current)
//         || (title.trim() === current.trim())
//         || (title.includes(current) && current.length > 0)
//         || (current.includes(title) && title.length > 0);

//     const found = matches || descendantFound;

//     // If found anywhere in this subtree, mark this tree item as `open`
//     // so ancestors are opened. For an exact match, also mark the item
//     // `selected` so it is visually highlighted by the component.
//     if (found) {
//         try { treeItem.setAttribute('open', ''); } catch (e) { }
//         try { treeItem.open = true; } catch (e) { }
//     }
//     if (matches) {
//         try { treeItem.setAttribute('selected', ''); } catch (e) { }
//         try { treeItem.setAttribute('aria-selected', 'true'); } catch (e) { }
//         try { treeItem.selected = true; } catch (e) { }
//     }

//     return { el: treeItem, found };
// }