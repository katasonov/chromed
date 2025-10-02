// FileMenu.js - Specific file menu implementation

// FileMenu.js - Refactored to use ContextMenuDropdown
// Assumes ContextMenuDropdown and MenuItem are imported or available in scope
class FileMenu extends ContextMenuDropdown {
    static label = 'File';
    /**
     * @param {object} opts
     * @param {object} opts.editor - Editor instance
     * @param {string} [opts.id] - Optional menu id
     * @param {function} [opts.onHide] - Optional hide callback
     */
    constructor({
        editor, id = 'file-menu', onHide = null, onLeftArrowPressed = null, onRightArrowPressed = null} = {}) {
        // Helper to wrap handlers so they close the menu first
        const wrapHandler = (fn, menuInstance) => () => {
            menuInstance.hide();
            fn();
        };

        // Construct menu items (do not use 'this' before super)
        let saveItem, closeItem;
        const menuItems = [
            new MenuItem('new', 'New', function() {}, 'Ctrl+Alt+N'),
            new MenuItem('open', 'Open (Local)', function() {}, 'Ctrl+O'),
            new MenuItem('open-gdrive', 'Open (Google Drive)', function() {}, 'Ctrl+Alt+O'),
            new MenuItemSeparator(),
            (saveItem = new MenuItem('save', 'Save', function() {}, 'Ctrl+S')),
            new MenuItem('saveas', 'Save As', function() {}, 'Ctrl+Shift+S'),
            new MenuItem('reload', 'Reload', function() {}, 'F5'),
            new MenuItemSeparator(),
            (closeItem = new MenuItem('close', 'Close', function() {}, 'Ctrl+Alt+W'))
        ];
        super({id, items: menuItems, onHide, onLeftArrowPressed: onLeftArrowPressed, onRightArrowPressed: onRightArrowPressed});
        this.editor = editor;
        // Now assign handlers to menu items, using 'this' safely
        menuItems[0].action = wrapHandler(() => {
            console.debug(`File menu: Executing 'new' action`);
            editor.handleAction('new');
        }, this);
        menuItems[1].action = wrapHandler(() => {
            console.debug(`File menu: Executing 'open' action`);
            editor.handleAction('open');
        }, this);
        menuItems[2].action = wrapHandler(() => {
            console.debug(`File menu: Executing 'open-gdrive' action`);
            editor.handleAction('open-gdrive');
        }, this);
        saveItem.action = wrapHandler(() => {
            console.debug(`File menu: Executing 'save' action at ${new Date().toISOString()}`);
            editor.handleAction('save');
        }, this);
        menuItems[5].action = wrapHandler(() => {
            console.debug(`File menu: Executing 'saveas' action`);
            editor.handleAction('saveas');
        }, this);
        menuItems[6].action = wrapHandler(() => {
            console.debug(`File menu: Executing 'reload' action`);
            editor.handleAction('reload');
        }, this);
        closeItem.action = wrapHandler(() => {
            console.debug(`File menu: Executing 'close' action`);
            editor.handleAction('close');
        }, this);
        this.saveItem = saveItem;
        this.closeItem = closeItem;
    }

    /**
     * Update menu state (enable/disable items)
     */
    updateMenuState() {
        const hasActiveTab = this.editor.getActiveTab() !== null;
        const hasModifiedTab = hasActiveTab && this.editor.getActiveTab().getFile().isModified();
        // Enable/disable save based on whether file is modified
        
        console.debug(`[FileMenu] updateMenuState: hasActiveTab=${hasActiveTab}, hasModifiedTab=${hasModifiedTab}`);
        if (this.saveItem) {
            this.saveItem.setEnabled(hasModifiedTab);
        }
        // Enable/disable close based on whether there's an active tab
        if (this.closeItem) {
            this.closeItem.setEnabled(hasActiveTab);
        }
    }
}