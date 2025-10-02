
// ViewMenu.js - Refactored to use ContextMenuDropdown
// Assumes ContextMenuDropdown and MenuItem are imported or available in scope
class ViewMenu extends ContextMenuDropdown {
    static label = 'View';
    /**
     * @param {object} opts
     * @param {object} opts.editor - Editor instance
     * @param {string} [opts.id] - Optional menu id
     * @param {function} [opts.onHide] - Optional hide callback
     */
    constructor({editor, id = 'view-menu', onHide = null, onLeftArrowPressed = null, onRightArrowPressed = null} = {}) {
        // Helper to wrap handlers so they close the menu first
        const wrapHandler = (fn, menuInstance) => () => {
            menuInstance.hide();
            fn();
        };

        // Construct menu items (do not use 'this' before super)
        let zoomInItem, zoomOutItem, zoomResetItem, lineNumbersItem, wordWrapItem, fullscreenItem;
        const menuItems = [
            (zoomInItem = new MenuItem('zoom-in', 'Zoom In', function() {}, 'Ctrl+=')),
            (zoomOutItem = new MenuItem('zoom-out', 'Zoom Out', function() {}, 'Ctrl+-')),
            (zoomResetItem = new MenuItem('zoom-reset', 'Reset Zoom', function() {}, 'Ctrl+0')),
            new MenuItemSeparator(),
            (lineNumbersItem = new MenuItem('toggle-line-numbers', 'Line Numbers', function() {})),
            (wordWrapItem = new MenuItem('toggle-word-wrap', 'Word Wrap', function() {})),
            new MenuItemSeparator(),
            (fullscreenItem = new MenuItem('fullscreen', 'Full Screen', function() {}, 'F11'))
        ];
        super({id, items: menuItems, onHide, onLeftArrowPressed: onLeftArrowPressed, onRightArrowPressed: onRightArrowPressed});
        this.editor = editor;
        this.zoomInItem = zoomInItem;
        this.zoomOutItem = zoomOutItem;
        this.zoomResetItem = zoomResetItem;
        this.lineNumbersItem = lineNumbersItem;
        this.wordWrapItem = wordWrapItem;
        this.fullscreenItem = fullscreenItem;
        // Now assign handlers to menu items, using 'this' safely
        zoomInItem.action = wrapHandler(() => editor.handleAction('zoom-in'), this);
        zoomOutItem.action = wrapHandler(() => editor.handleAction('zoom-out'), this);
        zoomResetItem.action = wrapHandler(() => editor.handleAction('zoom-reset'), this);
        lineNumbersItem.action = wrapHandler(() => editor.handleAction('toggle-line-numbers'), this);
        wordWrapItem.action = wrapHandler(() => editor.handleAction('toggle-word-wrap'), this);
        fullscreenItem.action = wrapHandler(() => editor.handleAction('fullscreen'), this);
    }

    /**
     * Update menu state (enable/disable items and icons)
     */
    updateMenuState() {
        // Update bird sign for line numbers and word wrap
        const activeTab = this.editor.getActiveTab && this.editor.getActiveTab();
        let lineNumbers = false, wordWrap = false;
        if (activeTab && activeTab.getEditor) {
            const editor = activeTab.getEditor();
            lineNumbers = !!editor.getOption('lineNumbers');
            wordWrap = !!editor.getOption('lineWrapping');
        }
        if (this.lineNumbersItem && this.lineNumbersItem.element) {
            const iconSpan = this.lineNumbersItem.element.querySelector('.menu-item-icon');
            iconSpan.textContent = lineNumbers ? '✓' : '';
        }
        if (this.wordWrapItem && this.wordWrapItem.element) {
            const iconSpan = this.wordWrapItem.element.querySelector('.menu-item-icon');
            iconSpan.textContent = wordWrap ? '✓' : '';
        }
    }
}