// EditorContextMenu.js
// Floating context menu for editor view, using ContextMenuDropdown
// Accepts menu items with handlers from Tab.js

// Assumes ContextMenuDropdown is imported or available in scope
// Assumes MenuItem is imported or available in scope
class EditorContextMenu extends ContextMenuDropdown {
    /**
     * @param {Array<{itemName: string, itemHint?: string, handler: Function, id?: string, shortcut?: string}>} menuItems
     * @param {string} [id] Optional id for the menu
     */
    constructor({menuItems, id = 'editor-context-menu2', onHide = null} = {}) {
        // Convert to MenuItem instances for ContextMenuDropdown
        const items = menuItems.map(item => new MenuItem(
            item.id || item.itemName,
            item.itemName,
            () => {
                this.hide();
                item.handler();
            },
            item.shortcut || null,
            false
        ));
        super({id, items, onHide});
    }
    // All menu logic is handled by ContextMenuDropdown
}

// Export if using modules
// export default EditorContextMenu2;
