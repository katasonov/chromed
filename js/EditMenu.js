// EditMenu.js - Specific edit menu implementation

// EditMenu.js - Refactored to use ContextMenuDropdown
// Assumes ContextMenuDropdown and MenuItem are imported or available in scope
class EditMenu extends ContextMenuDropdown {
    static label = 'Edit';
    /**
     * @param {object} opts
     * @param {object} opts.editor - Editor instance
     * @param {string} [opts.id] - Optional menu id
     * @param {function} [opts.onHide] - Optional hide callback
     */
    constructor({editor, id = 'edit-menu', onHide = null, onLeftArrowPressed = null, onRightArrowPressed = null} = {}) {
        // Helper to wrap handlers so they close the menu first
        const wrapHandler = (fn, menuInstance) => () => {
            menuInstance.hide();
            fn();
        };

        // Construct menu items (do not use 'this' before super)
        let undoItem, redoItem, pasteItem, selectAllItem;
        const menuItems = [
            (undoItem = new MenuItem('undo', 'Undo', function() {}, 'Ctrl+Z')),
            (redoItem = new MenuItem('redo', 'Redo', function() {}, 'Ctrl+Y')),
            new MenuItemSeparator(),
            new MenuItem('cut', 'Cut', function() {}, 'Ctrl+X'),
            new MenuItem('copy', 'Copy', function() {}, 'Ctrl+C'),
            (pasteItem = new MenuItem('paste', 'Paste', function() {}, 'Ctrl+V')),
            (selectAllItem = new MenuItem('select-all', 'Select All', function() {}, 'Ctrl+A'))
        ];
        super({id, items: menuItems, onHide, onLeftArrowPressed: onLeftArrowPressed, onRightArrowPressed: onRightArrowPressed});
        // Now assign handlers to menu items, using 'this' safely
        this.editor = editor;
        this.undoItem = undoItem;
        this.redoItem = redoItem;
        this.pasteItem = pasteItem;
        this.selectAllItem = selectAllItem;
        menuItems[0].action = wrapHandler(() => editor.handleAction('undo'), this);
        menuItems[1].action = wrapHandler(() => editor.handleAction('redo'), this);
        menuItems[3].action = wrapHandler(() => editor.handleAction('cut'), this);
        menuItems[4].action = wrapHandler(() => editor.handleAction('copy'), this);
        menuItems[5].action = wrapHandler(() => editor.handleAction('paste'), this);
        menuItems[6].action = wrapHandler(() => editor.handleAction('select-all'), this);
    }

    /**
     * Update menu state (enable/disable items)
     */
    updateMenuState() {
        const hasActiveTab = this.editor.getActiveTab() !== null;
        // Undo/Redo: enable only if there is a real content change to undo/redo
        let canUndo = false, canRedo = false;
        if (hasActiveTab) {
            const tab = this.editor.getActiveTab();
            if (tab && typeof tab.hasContentToUndo === 'function') {
                canUndo = tab.hasContentToUndo();
            }
            if (tab && typeof tab.hasContentToRedo === 'function') {
                canRedo = tab.hasContentToRedo();
            }
        }
        if (this.undoItem) this.undoItem.setEnabled(canUndo);
        if (this.redoItem) this.redoItem.setEnabled(canRedo);
        // Paste/select-all: enable if tab is active
        if (this.pasteItem) this.pasteItem.setEnabled(hasActiveTab);
        if (this.selectAllItem) this.selectAllItem.setEnabled(hasActiveTab);
    }
}