// menuPositioning.js - Utility for positioning submenus to fit viewport

/**
 * Position a submenu so it fits within the viewport, adjusting top/left and max-height/width as needed.
 * @param {HTMLElement} menuItem - The menu item the submenu is attached to.
 * @param {HTMLElement} submenuContainer - The submenu DOM element.
 */
function positionSubmenu(menuItem, submenuContainer) {
    const rect = menuItem.getBoundingClientRect();
    submenuContainer.classList.add('show'); // Show first to measure
    let top = rect.top;
    let left = rect.right;
    const submenuRect = submenuContainer.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    // Adjust vertical position if submenu would overflow bottom
    if (top + submenuRect.height > viewportHeight) {
        const maxHeight = Math.min(submenuRect.height, viewportHeight - 20);
        submenuContainer.style.maxHeight = `${maxHeight}px`;
        submenuContainer.style.overflowY = 'auto';
        // Try to fit above if more space
        if (rect.bottom - submenuRect.height > 0) {
            top = Math.max(0, rect.bottom - submenuRect.height);
        } else {
            top = 10;
        }
    } else {
        submenuContainer.style.maxHeight = '';
        submenuContainer.style.overflowY = '';
    }

    // Adjust horizontal position if submenu would overflow right
    if (left + submenuRect.width > viewportWidth) {
        if (rect.left - submenuRect.width > 0) {
            left = rect.left - submenuRect.width;
        } else {
            left = viewportWidth - submenuRect.width - 10;
        }
    }

    submenuContainer.style.top = `${top}px`;
    submenuContainer.style.left = `${left}px`;

}
window.positionSubmenu = positionSubmenu;
