// HelpMenu.js - Refactored to use ContextMenuDropdown and handler pattern
class HelpMenu extends ContextMenuDropdown {
    static label = '?';

    constructor({editor, id = 'help-menu', onHide = null, onLeftArrowPressed = null, onRightArrowPressed = null} = {}) {
        const wrapHandler = (fn, menuInstance) => () => {
            menuInstance.hide();
            fn();
        };

        // Construct menu items
        let chromeEdHomeItem, redditChannelItem, xChannelItem, shortcutsSheetItem, githubItem, supportItem;
        const menuItems = [
            (shortcutsSheetItem = new MenuItem('shortcuts-sheet', 'Keyboard Shortcuts', function() {})),
            new MenuItemSeparator(),
            (chromeEdHomeItem = new MenuItem('chromeed-home', 'ChromeEd Home', function() {})),
            (redditChannelItem = new MenuItem('reddit-channel', 'Reddit Community', function() {})),
            (xChannelItem = new MenuItem('x-channel', 'X (Twitter)', function() {})),
            (githubItem = new MenuItem('github', 'GitHub · Report Issues', function() {})),
            new MenuItemSeparator(),
            // 🌟 New Support item
            (supportItem = new MenuItem('support-chromed', '❤️ Support ChromEd…', function() {})),
        ];

        super({id, items: menuItems, onHide, onLeftArrowPressed, onRightArrowPressed});

        this.editor = editor;
        this.chromeEdHomeItem = chromeEdHomeItem;
        this.redditChannelItem = redditChannelItem;
        this.xChannelItem = xChannelItem;
        this.githubItem = githubItem;
        this.shortcutsSheetItem = shortcutsSheetItem;
        this.supportItem = supportItem;

        // Assign actions
        chromeEdHomeItem.action = wrapHandler(() => window.open('https://chrome.google.com/webstore/detail/gjpealfnbgbllonnhhcgmfbccedcjena'), this);
        redditChannelItem.action = wrapHandler(() => window.open('https://www.reddit.com/r/chromedapp'), this);
        xChannelItem.action = wrapHandler(() => window.open('https://x.com/chromedapp'), this);
        githubItem.action = wrapHandler(() => window.open('https://github.com/katasonov/chromed/issues'), this);
        shortcutsSheetItem.action = wrapHandler(() => window.open('shortcuts.html'), this);

        // inside constructor after creating supportItem...
        supportItem.action = wrapHandler(() => {        
            console.warn('SupportDialog not found on window. Did you include SupportDialog.js?');
            // Fallback: open your main link
            window.open('https://buymeacoffee.com/katasonov', '_blank', 'noopener');
            return null;            
        }, this);
    }

    updateMenuState() {
        // Help menu items are always enabled
        if (this.chromeEdHomeItem) this.chromeEdHomeItem.setEnabled(true);
        if (this.redditChannelItem) this.redditChannelItem.setEnabled(true);
        if (this.xChannelItem) this.xChannelItem.setEnabled(true);
        if (this.shortcutsSheetItem) this.shortcutsSheetItem.setEnabled(true);
        if (this.supportItem) this.supportItem.setEnabled(true);
    }
}
