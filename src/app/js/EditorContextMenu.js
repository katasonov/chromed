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
    constructor({parent, id = 'editor-context-menu2', onHide = null} = {}) {

        const toolsSubItems = [];
        toolsSubItems.push(new MenuItem('tools-protect', 'Protect Text', async () => {
            this.hide();
            await parent.protectSelection();
        }));
        toolsSubItems.push(new MenuItem('tools-unprotect', 'Unprotect', async () => {
            this.hide();
            await parent.unprotectSelection();
        }));

        const toolsMenu = new ContextMenuDropdown({
            id: 'editor-tools-submenu', 
            items: toolsSubItems,
            // onHide: () => { this.hide(); }
        });


        const items = [];
        items.push(new MenuItem(
            'editor-cut',
            'Cut',
            () => {
                if (parent && typeof parent.cutSelection === 'function') {
                    parent.cutSelection();
                }
                this.hide();
            }
        ));       
        items.push(new MenuItem(
            'editor-copy',
            'Copy',
            () => {
                if (parent && typeof parent.copySelection === 'function') {
                    parent.copySelection();
                }
                this.hide();
            }
        ));       
        items.push(new MenuItem(
            'editor-paste',
            'Paste',
            () => {
                if (parent && typeof parent.paste === 'function') {
                    parent.paste();
                }
                this.hide();
            }
        ));       
        items.push(new MenuItem(
            'editor-delete',
            'Delete',
            () => {
                if (parent && typeof parent.deleteSelection === 'function') parent.deleteSelection();
                this.hide();
            }
        ));
        items.push(new MenuItem(
            'editor-select-all',
            'Select All',
            () => {
                if (parent && typeof parent.selectAll === 'function') {
                    parent.selectAll();
                }
                this.hide();
            }
        ));
        items.push(new ExpandableMenuItem({
            id: 'editor-tools',
            text: 'Tools',
            contextMenuDropdown: toolsMenu
        }));
        super({id, items, onHide});
    }
    // All menu logic is handled by ContextMenuDropdown
}

// Export if using modules
// export default EditorContextMenu2;
