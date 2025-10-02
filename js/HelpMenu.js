
// HelpMenu.js - Refactored to use ContextMenuDropdown and handler pattern
class HelpMenu extends ContextMenuDropdown {
    static label = '?';
    /**
     * @param {object} opts
     * @param {object} opts.editor - Editor instance
     * @param {string} [opts.id] - Optional menu id
     * @param {function} [opts.onHide] - Optional hide callback
     */
    constructor({editor, id = 'help-menu', onHide = null, onLeftArrowPressed = null, onRightArrowPressed = null} = {}) {
        // Helper to wrap handlers so they close the menu first
        const wrapHandler = (fn, menuInstance) => () => {
            menuInstance.hide();
            fn();
        };

        // Construct menu items
        let chromeEdHomeItem, redditChannelItem, xChannelItem, shortcutsSheetItem, githubItem;
        const menuItems = [
            (shortcutsSheetItem = new MenuItem('shortcuts-sheet', 'Keyboard Shortcuts', function() {})),
            new MenuItemSeparator(),
            (chromeEdHomeItem = new MenuItem('chromeed-home', 'ChromeEd Home', function() {})),
            (redditChannelItem = new MenuItem('reddit-channel', 'Reddit Community', function() {})),            
            (xChannelItem = new MenuItem('x-channel', 'X (Twitter)', function() {})),
            (githubItem = new MenuItem('github', 'GitHub · Report Issues', function() {})),
        ];
        super({id, items: menuItems, onHide, onLeftArrowPressed, onRightArrowPressed});
        this.editor = editor;
        this.chromeEdHomeItem = chromeEdHomeItem;
        this.redditChannelItem = redditChannelItem;
        this.xChannelItem = xChannelItem;
        this.githubItem = githubItem;
        this.shortcutsSheetItem = shortcutsSheetItem;
        // Assign actions using handler pattern
        chromeEdHomeItem.action = wrapHandler(() => window.open('https://chrome.google.com/webstore/detail/gjpealfnbgbllonnhhcgmfbccedcjena'), this);
        redditChannelItem.action = wrapHandler(() => window.open('https://www.reddit.com/r/chromedapp'), this);
        xChannelItem.action = wrapHandler(() => window.open('https://x.com/chromedapp'), this);
        githubItem.action = wrapHandler(() => window.open('https://github.com/katasonov/chromed/issues'), this);
        shortcutsSheetItem.action = wrapHandler(() => window.open('shortcuts.html'), this);
    }

    /**
     * Update menu state (enable/disable items)
     */
    updateMenuState() {
        // Help menu items are always enabled
        if (this.chromeEdHomeItem) this.chromeEdHomeItem.setEnabled(true);
        if (this.redditChannelItem) this.redditChannelItem.setEnabled(true);
        if (this.xChannelItem) this.xChannelItem.setEnabled(true);
        if (this.shortcutsSheetItem) this.shortcutsSheetItem.setEnabled(true);
    }
}
