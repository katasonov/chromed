// SettingsMenu.js - Settings menu using ContextMenuDropdown
// Assumes ContextMenuDropdown, MenuItem, ExpandableMenuItem, and MenuItemSeparator are available in scope.

class SettingsMenu extends ContextMenuDropdown {
    static label = 'Settings';

    static get activeCharacterID() {
        return 2;
    }     

    /**
     * @param {object} opts
     * @param {object} opts.editor - Editor instance
     * @param {string} [opts.id] - Optional menu id
     * @param {function} [opts.onHide] - Optional hide callback
     * @param {function} [opts.onLeftArrowPressed]
     * @param {function} [opts.onRightArrowPressed]
     */
    constructor({ editor, id = 'settings-menu', onHide = null, onLeftArrowPressed = null, onRightArrowPressed = null } = {}) {
        // Helper to wrap handlers so they close the menu first
        const wrapHandler = (fn, menuInstance) => () => {
            menuInstance.hide();
            fn();
        };

        // Create Color Scheme submenu items
        let standardThemeItem, darkThemeItem, borlandThemeItem;
        const colorSchemeItems = [
            (standardThemeItem = new MenuItem('theme-standard', 'Standard', function() {})),
            (darkThemeItem = new MenuItem('theme-dark', 'Dark', function() {})),
            (borlandThemeItem = new MenuItem('theme-borland', 'Borland', function() {}))
        ];

        // Create Color Scheme submenu
        const colorSchemeSubmenu = new ContextMenuDropdown({
            id: 'color-scheme-submenu',
            items: colorSchemeItems
        });

        // Create the expandable menu item for Color Scheme
        const colorSchemeExpandable = new ExpandableMenuItem({
            id: 'color-scheme',
            text: 'Color Scheme',
            contextMenuDropdown: colorSchemeSubmenu
        });

        // Build main menu items
        const menuItems = [
            colorSchemeExpandable
        ];

        super({ id, items: menuItems, onHide, onLeftArrowPressed, onRightArrowPressed });

        // Keep refs for updates
        this.editor = editor;
        this.standardThemeItem = standardThemeItem;
        this.darkThemeItem = darkThemeItem;
        this.borlandThemeItem = borlandThemeItem;
        this.colorSchemeSubmenu = colorSchemeSubmenu;
        this.colorSchemeExpandable = colorSchemeExpandable;

        // --- Dark mode: tri-state model: 'system' | 'dark' | 'light'
        this._browserDarkQuery = window.matchMedia('(prefers-color-scheme: dark)');
        this._onSystemChange = (e) => {
            if (this.darkModeState === 'system') {
                this.applyTheme('system');
                this.updateMenuState();
            }
        };

        // Load saved mode or default to 'system'
        this.darkModeState = localStorage.getItem('theme-mode') || 'system';

        // Listen to OS changes only when following system
        this._bindSystemListener(this.darkModeState === 'system');

        // Wire actions for theme items
        standardThemeItem.action = () => {
            this.setThemeMode('light');
            colorSchemeSubmenu.hide();
            this.hide();
        };

        darkThemeItem.action = () => {
            this.setThemeMode('dark');
            colorSchemeSubmenu.hide();
            this.hide();
        };

        borlandThemeItem.action = () => {
            this.setThemeMode('borland');
            colorSchemeSubmenu.hide();
            this.hide();
        };

        // Apply on boot
        this.applyTheme(this.darkModeState);
        this.updateMenuState();
    }

    // ---------- Theme helpers ----------

    _bindSystemListener(enable) {
        const mq = this._browserDarkQuery;
        if (!mq) return;
        if (enable) {
            if (mq.addEventListener) mq.addEventListener('change', this._onSystemChange);
            else if (mq.addListener) mq.addListener(this._onSystemChange);
        } else {
            if (mq.removeEventListener) mq.removeEventListener('change', this._onSystemChange);
            else if (mq.removeListener) mq.removeListener(this._onSystemChange);
        }
    }

    /**
     * Set the theme mode
     * @param {string} mode - 'light', 'dark', 'borland', or 'system'
     */
    setThemeMode(mode) {
        console.log(`[SettingsMenu] Setting theme to "${mode}"`);
        this.darkModeState = mode;
        localStorage.setItem('theme-mode', mode);
        this._bindSystemListener(mode === 'system');
        this.applyTheme(mode);
        this.updateMenuState();
    }

    /** Returns true for dark, false for light */
    getEffectiveDarkMode() {
        if (this.darkModeState === 'system') return this._browserDarkQuery.matches;
        return this.darkModeState === 'dark';
    }

    /** Apply theme by toggling CSS classes on <body> and set native color-scheme */
    applyTheme(theme) {
        const effectiveTheme = theme === 'system' ? (this._browserDarkQuery.matches ? 'dark' : 'light') : theme;
        
        // Remove all theme classes
        document.body.classList.remove('dark', 'borland');
        
        // Apply the appropriate theme class
        if (effectiveTheme === 'dark') {
            document.body.classList.add('dark');
            document.documentElement.style.colorScheme = 'dark';
        } else if (effectiveTheme === 'borland') {
            document.body.classList.add('borland');
            document.documentElement.style.colorScheme = 'dark'; // Borland uses dark scrollbars
        } else {
            // light theme
            document.documentElement.style.colorScheme = 'light';
        }
    }

    /** Legacy method for compatibility */
    applyDarkMode(isDark) {
        if (isDark) {
            this.applyTheme('dark');
        } else {
            this.applyTheme('light');
        }
    }

    /**
     * Update menu state to show current theme selection
     */
    updateMenuState() {
        const currentTheme = this.darkModeState;
        const effectiveTheme = currentTheme === 'system' ? (this._browserDarkQuery.matches ? 'dark' : 'light') : currentTheme;
        
        // Update checkmarks for Standard, Dark, and Borland items
        if (this.standardThemeItem && this.standardThemeItem.element) {
            const iconSpan = this.standardThemeItem.element.querySelector('.menu-item-icon');
            if (iconSpan) {
                iconSpan.textContent = (currentTheme === 'light' || (currentTheme === 'system' && effectiveTheme === 'light')) ? '✓' : '';
            }
        }
        if (this.darkThemeItem && this.darkThemeItem.element) {
            const iconSpan = this.darkThemeItem.element.querySelector('.menu-item-icon');
            if (iconSpan) {
                iconSpan.textContent = (currentTheme === 'dark') ? '✓' : '';
            }
        }
        if (this.borlandThemeItem && this.borlandThemeItem.element) {
            const iconSpan = this.borlandThemeItem.element.querySelector('.menu-item-icon');
            if (iconSpan) {
                iconSpan.textContent = (currentTheme === 'borland') ? '✓' : '';
            }
        }

        // Update Color Scheme label to show current state
        if (this.colorSchemeExpandable && this.colorSchemeExpandable.element) {
            const textSpan = this.colorSchemeExpandable.element.querySelector('.menu-item-text');
            if (textSpan) {
                const suffix =
                    currentTheme === 'system' ? ' (Auto)' :
                    currentTheme === 'dark'   ? ' (Dark)' :
                    currentTheme === 'borland' ? ' (Borland)' : ' (Light)';
                textSpan.textContent = 'Color Scheme' + suffix;
            }
        }
    }
}
