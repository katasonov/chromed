
// SearchMenu.js - Refactored to use ContextMenuDropdown
// Assumes ContextMenuDropdown and MenuItem are imported or available in scope
class SearchMenu extends ContextMenuDropdown {
    static label = 'Search';
    /**
     * @param {object} opts
     * @param {object} opts.editor - Editor instance
     * @param {string} [opts.id] - Optional menu id
     * @param {function} [opts.onHide] - Optional hide callback
     */
    constructor({editor, id = 'search-menu', onHide = null, onLeftArrowPressed = null, onRightArrowPressed = null} = {}) {
        // Helper to wrap handlers so they close the menu first
        const wrapHandler = (fn, menuInstance) => () => {
            menuInstance.hide();
            fn();
        };

        // Construct menu items (do not use 'this' before super)
        let findItem, findNextItem, findPrevItem, replaceItem, clearSearchItem;
        const menuItems = [
            (findItem = new MenuItem('find', 'Find...', function() {}, 'Ctrl+F')),
            (findNextItem = new MenuItem('find-next', 'Find Next', function() {}, 'F3')),
            (findPrevItem = new MenuItem('find-prev', 'Find Previous', function() {}, 'Shift+F3')),
            (replaceItem = new MenuItem('replace', 'Replace...', function() {}, 'Ctrl+H')),
            (clearSearchItem = new MenuItem('clear-search', 'Clear Search', function() {}))
        ];
        super({id, items: menuItems, onHide, onLeftArrowPressed: onLeftArrowPressed, onRightArrowPressed: onRightArrowPressed});
        this.editor = editor;
        this.findItem = findItem;
        this.findNextItem = findNextItem;
        this.findPrevItem = findPrevItem;
        this.replaceItem = replaceItem;
        this.clearSearchItem = clearSearchItem;
        // Now assign handlers to menu items, using 'this' safely
        findItem.action = wrapHandler(() => editor.handleAction('find'), this);
        findNextItem.action = wrapHandler(() => editor.handleAction('findNext'), this);
        findPrevItem.action = wrapHandler(() => editor.handleAction('findPrevious'), this);
        replaceItem.action = wrapHandler(() => editor.handleAction('replace'), this);
        clearSearchItem.action = wrapHandler(() => editor.handleAction('clear-search'), this);
    }

    /**
     * Update menu state (enable/disable items)
     */
    updateMenuState() {
        const hasActiveTab = this.editor.getActiveTab() !== null;
        // Enable/disable search-related items based on having an active tab
        [this.findItem, this.findNextItem, this.findPrevItem, this.replaceItem, this.clearSearchItem].forEach(item => {
            if (item) {
                item.setEnabled(hasActiveTab);
            }
        });
        // Special handling for clear-search - only enable if there's an active search
        if (this.clearSearchItem && hasActiveTab) {
            const activeTab = this.editor.getActiveTab();
            const editor = activeTab.getEditor();
            const hasActiveSearch = editor && editor.state && editor.state.search && editor.state.search.query;
            this.clearSearchItem.setEnabled(hasActiveSearch);
        }
    }
}
