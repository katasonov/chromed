// ViewMenu.js - uses ContextMenuDropdown
// Assumes ContextMenuDropdown, MenuItem, and MenuItemSeparator are available in scope.

class ViewMenu extends ContextMenuDropdown {
    static label = 'View';

    /**
     * @param {object} opts
     * @param {object} opts.editor - Editor instance
     * @param {string} [opts.id] - Optional menu id
     * @param {function} [opts.onHide] - Optional hide callback
     * @param {function} [opts.onLeftArrowPressed]
     * @param {function} [opts.onRightArrowPressed]
     */
    constructor({ editor, id = 'view-menu', onHide = null, onLeftArrowPressed = null, onRightArrowPressed = null } = {}) {
        // Helper to wrap handlers so they close the menu first
        const wrapHandler = (fn, menuInstance) => () => {
            menuInstance.hide();
            fn();
        };

        // Build items (don't use `this` before super)
        let zoomInItem, zoomOutItem, zoomResetItem, lineNumbersItem, wordWrapItem, fullscreenItem, darkModeItem;
        const menuItems = [
            (zoomInItem     = new MenuItem('zoom-in',              'Zoom In',     function () {}, 'Ctrl+=')),
            (zoomOutItem    = new MenuItem('zoom-out',             'Zoom Out',    function () {}, 'Ctrl+-')),
            (zoomResetItem  = new MenuItem('zoom-reset',           'Reset Zoom',  function () {}, 'Ctrl+0')),
            new MenuItemSeparator(),
            (lineNumbersItem= new MenuItem('toggle-line-numbers',  'Line Numbers',function () {})),
            (wordWrapItem   = new MenuItem('toggle-word-wrap',     'Word Wrap',   function () {})),
            new MenuItemSeparator(),
            (darkModeItem   = new MenuItem('toggle-dark-mode',     'Dark Mode',   function () {})),
            (fullscreenItem = new MenuItem('fullscreen',           'Full Screen', function () {}, 'F11'))
        ];

        super({ id, items: menuItems, onHide, onLeftArrowPressed, onRightArrowPressed });

        // Keep refs for updates
        this.editor          = editor;
        this.zoomInItem      = zoomInItem;
        this.zoomOutItem     = zoomOutItem;
        this.zoomResetItem   = zoomResetItem;
        this.lineNumbersItem = lineNumbersItem;
        this.wordWrapItem    = wordWrapItem;
        this.fullscreenItem  = fullscreenItem;
        this.darkModeItem    = darkModeItem;

        // Wire actions
        zoomInItem.action     = wrapHandler(() => editor.handleAction('zoom-in'), this);
        zoomOutItem.action    = wrapHandler(() => editor.handleAction('zoom-out'), this);
        zoomResetItem.action  = wrapHandler(() => editor.handleAction('zoom-reset'), this);
        lineNumbersItem.action= wrapHandler(() => editor.handleAction('toggle-line-numbers'), this);
        wordWrapItem.action   = wrapHandler(() => editor.handleAction('toggle-word-wrap'), this);
        fullscreenItem.action = wrapHandler(() => editor.handleAction('fullscreen'), this);

        // --- Dark mode: tri-state model: 'system' | 'dark' | 'light'
        this._browserDarkQuery = window.matchMedia('(prefers-color-scheme: dark)');
        this._onSystemChange = (e) => {
            if (this.darkModeState === 'system') {
                this.applyDarkMode(e.matches);
                this.updateMenuState();
            }
        };

        // Load saved mode or default to 'system'
        this.darkModeState = localStorage.getItem('theme-mode') || 'system';

        // Listen to OS changes only when following system
        this._bindSystemListener(this.darkModeState === 'system');

        // Apply on boot
        this.applyDarkMode(this.getEffectiveDarkMode());
        this.updateMenuState();

        // Single handler: cycle System → Dark → Light
        darkModeItem.action = wrapHandler(() => {
            this.smartToggleTheme();
        }, this);
    }

    smartToggleTheme() {
        const effectiveIsDark = this.getEffectiveDarkMode();

        console.log(`[ViewMenu] Smart toggle from "${this.darkModeState}" (effective ${effectiveIsDark ? 'dark' : 'light'})`);
        if (this.darkModeState === 'system' || this.darkModeState !== effectiveIsDark) {
            // System says dark? Force LIGHT. System says light? Force DARK.
            this.setThemeMode(effectiveIsDark ? 'light' : 'dark');
        } else {
            // If user already forced a theme, go back to following system.
            this.setThemeMode('system');
        }
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

    /** Cycle: system -> dark -> light -> system */
    cycleThemeMode() {
        const order = ['system', 'dark', 'light'];
        const next = order[(order.indexOf(this.darkModeState) + 1) % order.length];
        this.setThemeMode(next);
    }

    setThemeMode(mode) {
        this.darkModeState = mode;
        localStorage.setItem('theme-mode', mode);
        this._bindSystemListener(mode === 'system');
        this.applyDarkMode(this.getEffectiveDarkMode());
        this.updateMenuState();
    }

    /** Returns true for dark, false for light */
    getEffectiveDarkMode() {
        if (this.darkModeState === 'system') return this._browserDarkQuery.matches;
        return this.darkModeState === 'dark';
    }

    /** Toggle .dark on <body> and set native color-scheme for form controls/scrollbars */
    applyDarkMode(isDark) {
        document.body.classList.toggle('dark', !!isDark);
        document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
    }

    /** Update checkmarks + Dark Mode label */
    updateMenuState() {
        // Update Line Numbers / Word Wrap indicators
        const activeTab = this.editor.getActiveTab && this.editor.getActiveTab();
        let lineNumbers = false, wordWrap = false;
        if (activeTab && activeTab.getEditor) {
            const cm = activeTab.getEditor();
            lineNumbers = !!cm.getOption('lineNumbers');
            wordWrap    = !!cm.getOption('lineWrapping');
        }
        if (this.lineNumbersItem?.element) {
            const iconSpan = this.lineNumbersItem.element.querySelector('.menu-item-icon');
            if (iconSpan) iconSpan.textContent = lineNumbers ? '✓' : '';
        }
        if (this.wordWrapItem?.element) {
            const iconSpan = this.wordWrapItem.element.querySelector('.menu-item-icon');
            if (iconSpan) iconSpan.textContent = wordWrap ? '✓' : '';
        }

        // Update Dark Mode check + label suffix + tooltip
        if (this.darkModeItem?.element) {
            const iconSpan = this.darkModeItem.element.querySelector('.menu-item-icon');
            const textSpan = this.darkModeItem.element.querySelector('.menu-item-text');
            const effective = this.getEffectiveDarkMode();

            if (iconSpan) iconSpan.textContent = effective ? '✓' : '';

            if (textSpan) {
                const suffix =
                    this.darkModeState === 'system' ? ' (Auto)' :
                    this.darkModeState === 'dark'   ? ' (On)'   : ' (Off)';
                textSpan.textContent = 'Dark Mode' + suffix;
            }

            this.darkModeItem.element.title =
                this.darkModeState === 'system'
                    ? 'Follows browser setting'
                    : (effective ? 'Dark mode forced' : 'Light mode forced');
        }
    }
}
