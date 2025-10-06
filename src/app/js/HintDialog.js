// HintDialog.js - Startup tips dialog reminiscent of classic Windows helpers
class HintDialog {
    static STORAGE_KEY = 'chromed_hint_dialog_settings_v1';
    static DEFAULT_SETTINGS = { dontShowAgain: false, lastIndex: 0, viewedTipIds: [] };

 // Add this small helper anywhere in the class (e.g., right above defaultHints)
static _isMacLike() {
    const ua = navigator.userAgent || '';
    const plat = navigator.platform || '';
    return /Mac|iPhone|iPad|iPod/.test(plat) || /Mac OS X/.test(ua);
}

// Replace the whole defaultHints getter with this:
static get defaultHints() {
    const mac = HintDialog._isMacLike();

    return [
        {
            id: 'tab-switcher',
            title: 'Jump between tabs instantly',
            body: mac
                ? '<p>Press <kbd>Option</kbd>+<kbd>Down</kbd> or <kbd>Option</kbd>+<kbd>Up</kbd> to pop open the tab switcher and fly through your documents.</p>'
                : '<p>Press <kbd>Alt</kbd>+<kbd>Down</kbd> or <kbd>Alt</kbd>+<kbd>Up</kbd> to pop open the tab switcher and fly through your documents.</p>'
        },
        {
            id: 'find-what-you-need',
            title: 'Find what you need',
            body: mac
                ? '<p>Hit <kbd>Cmd</kbd>+<kbd>F</kbd> to open Find. Use <kbd>Cmd</kbd>+<kbd>G</kbd> and <kbd>Cmd</kbd>+<kbd>Shift</kbd>+<kbd>G</kbd> to jump to the next or previous match.</p>'
                : '<p>Hit <kbd>Ctrl</kbd>+<kbd>F</kbd> to open Find. Use <kbd>F3</kbd> and <kbd>Shift</kbd>+<kbd>F3</kbd> to jump to the next or previous match.</p>'
        },
        {
            id: 'right-click-tab-bar',
            title: 'Right-click the tab bar',
            body: '<p>Right-click any tab title for quick actions like Save, Reload, or Move left/right—perfect for mouse-friendly workflows.</p>'
        },
        {
            id: 'shortcuts-at-your-fingertips',
            title: 'Shortcuts at your fingertips',
            body: '<p>Press <kbd>F1</kbd> anytime to open the complete ChromEd keyboard shortcut reference sheet.</p>'
        },
        {   
            id: 'workspace-remembered',
            title: 'Your workspace is remembered',
            body: '<p>ChromEd automatically preserves open tabs and layout every few seconds so you can pick up right where you left off.</p>'
        },
        {   
            id: 'find-and-replace',
            title: 'Find and Replace',
            body: mac
                ? '<p>Press <kbd>Cmd</kbd>+<kbd>H</kbd> to open the Find and Replace dialog. Use <kbd>Option</kbd>+<kbd>Enter</kbd> to replace all occurrences in one go.</p>'
                : '<p>Press <kbd>Ctrl</kbd>+<kbd>H</kbd> to open the Find and Replace dialog. Use <kbd>Alt</kbd>+<kbd>Enter</kbd> to replace all occurrences in one go.</p>'
        },
        {   
            id: 'open-google-drive',
            title: 'Open files from Google Drive',
            body: mac
                ? '<p>Click the folder icon in the toolbar or press <kbd>Cmd</kbd>+<kbd>Option</kbd>+<kbd>O</kbd> to open files directly from your Google Drive.</p>'
                : '<p>Click the folder icon in the toolbar or press <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>O</kbd> to open files directly from your Google Drive.</p>'
        },
        {   
            id: 'set-highlighting-mode',
            title: 'Set Highlighting For Language',
            body: mac
                ? '<p>Press <kbd>Ctrl</kbd>+<kbd>Option</kbd>+<kbd>L</kbd> then use arrow keys to set the language.</p>'
                : '<p>Press <kbd>Alt</kbd>+<kbd>L</kbd> then use arrow keys to set the language.</p>'
        },
    ];
}


    //if we see that user has viewed all hints, we can stop showing the dialog
    //to define that we can use lastIndex in settings and compare it to hints.length
    //if lastIndex >= hints.length, we know user has seen all hints
    //we can then set dontShowAgain to true automatically
    static async showOnStartup(options = {}) {
        const settings = await HintDialog.loadSettings();
        //HintDialog.saveSettings({}); // Save defaults if nothing was stored yet
        console.debug('[HintDialog] Loaded settings on startup:', settings);
        if (settings.dontShowAgain) {
            return null;
        }

        const dialog = new HintDialog({
            settings
        });

        if (!dialog.isRenderable()) {
            return null;
        }

        if (dialog.hints.length === 0) {
            console.debug('[HintDialog] No new hints to show, all have been viewed.');
            return null;
        }

        const delay = typeof options.delay === 'number' ? Math.max(0, options.delay) : 400;
        if (delay > 0) {
            setTimeout(() => dialog.show(), delay);
        } else {
            dialog.show();
        }
        return dialog;
    }

    static async loadSettings() {
        const defaults = { ...HintDialog.DEFAULT_SETTINGS };
        const storageKey = HintDialog.STORAGE_KEY;

        if (HintDialog._hasChromeStorage()) {
            return new Promise((resolve) => {
                try {
                    chrome.storage.local.get({ [storageKey]: defaults }, (result) => {
                        const stored = result && result[storageKey] ? result[storageKey] : defaults;
                        resolve({ ...defaults, ...stored });
                    });
                } catch (error) {
                    console.warn('[HintDialog] Failed to load settings from chrome.storage:', error);
                    resolve(defaults);
                }
            });
        }

        try {
            const raw = window.localStorage.getItem(storageKey);
            if (!raw) return defaults;
            const parsed = JSON.parse(raw);
            return { ...defaults, ...parsed };
        } catch (error) {
            console.warn('[HintDialog] Failed to parse settings from localStorage:', error);
            return defaults;
        }
    }

    static async saveSettings(settings) {
        const storageKey = HintDialog.STORAGE_KEY;
        const payload = { ...HintDialog.DEFAULT_SETTINGS, ...settings };

        if (HintDialog._hasChromeStorage()) {
            return new Promise((resolve) => {
                try {
                    console.debug('[HintDialog] Saving settings to chrome.storage:', payload);
                    chrome.storage.local.set({ [storageKey]: payload }, () => resolve());
                } catch (error) {
                    console.warn('[HintDialog] Failed to save settings to chrome.storage:', error);
                    resolve();
                }
            });
        }

        try {
            window.localStorage.setItem(storageKey, JSON.stringify(payload));
        } catch (error) {
            console.warn('[HintDialog] Failed to save settings to localStorage:', error);
        }
    }

    static _hasChromeStorage() {
        return typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;
    }

    constructor({ settings = {}, showAll = false } = {}) {
        settings = { ...HintDialog.DEFAULT_SETTINGS, ...settings };
        // Filter out viewed tips by id
        const viewedTipIds = Array.isArray(settings.viewedTipIds) ? settings.viewedTipIds : [];
        if (showAll) {
            this.hints = HintDialog.defaultHints;
        } else {
            this.hints = HintDialog._normalizeHints(HintDialog.defaultHints).filter(hint => !hint.id || !viewedTipIds.includes(hint.id));
        }
        this.overlay = document.getElementById('hint-dialog-overlay');
        this.dialog = this.overlay ? this.overlay.querySelector('.hint-dialog') : null;
        this.messageEl = document.getElementById('hint-dialog-message');
        this.indexLabel = document.getElementById('hint-index-label');
        this.prevBtn = document.getElementById('hint-prev-btn');
        this.nextBtn = document.getElementById('hint-next-btn');
        this.closeBtn = document.getElementById('hint-close-btn');
        this.hideCheckbox = document.getElementById('hint-hide-checkbox');
        this.focusableElements = [];
        this.visible = false;
        this.showAll = showAll;

        // Get a random index in range 0..hints.length-1
        this.currentIndex = Math.floor(Math.random() * this.hints.length);
        if (this.currentIndex === settings.lastIndex) {
            this.currentIndex = (this.currentIndex + 1) % (this.hints.length || 1);
        }
        //this._clampIndex(typeof settings.lastIndex === 'number' ? settings.lastIndex : 0);
        this.dontShowAgain = Boolean(settings.dontShowAgain);

        this.boundHandleKeydown = (event) => this._handleKeydown(event);
        this.boundTrapFocus = (event) => this._trapFocus(event);

        this._wireEvents();
        this._render();
    }

    isRenderable() {
        return Boolean(this.overlay && this.dialog && this.messageEl);
    }

    show() {
        if (!this.isRenderable()) {
            return;
        }
        this.visible = true;
        this.overlay.setAttribute('data-visible', 'true');
        this._render();
        this._syncCheckbox();
        this._updateFocusableElements();
        document.addEventListener('keydown', this.boundHandleKeydown, true);
        this.dialog.addEventListener('keydown', this.boundTrapFocus, true);

        // Focus the close button by default for quick dismissal
        Promise.resolve().then(() => {
            if (this.closeBtn && typeof this.closeBtn.focus === 'function') {
                this.closeBtn.focus();
            }
        });
    }

    hide() {
        if (!this.isRenderable()) {
            return;
        }
        this.visible = false;
        this.overlay.removeAttribute('data-visible');
        document.removeEventListener('keydown', this.boundHandleKeydown, true);
        this.dialog.removeEventListener('keydown', this.boundTrapFocus, true);
        this._markCurrentTipViewed();
        this._persistState();
    }

    next() {
        if (!this.hints.length) return;
        this._markCurrentTipViewed();
        this.currentIndex = (this.currentIndex + 1) % this.hints.length;
        this._render();
    }

    prev() {
        if (!this.hints.length) return;
        this._markCurrentTipViewed();
        this.currentIndex = (this.currentIndex - 1 + this.hints.length) % this.hints.length;
        this._render();
    }
    _markCurrentTipViewed() {
        // Mark the current tip as viewed by id
        const hint = this.hints[this.currentIndex];
        if (!hint || !hint.id) return;
        let viewedTipIds = Array.isArray(this._getViewedTipIds()) ? this._getViewedTipIds() : [];
        if (!viewedTipIds.includes(hint.id)) {
            viewedTipIds.push(hint.id);
            this._setViewedTipIds(viewedTipIds);
        }
    }

    _getViewedTipIds() {
        // Try to get from localStorage or chrome.storage
        const storageKey = HintDialog.STORAGE_KEY;
        if (window.localStorage) {
            try {
                const raw = window.localStorage.getItem(storageKey);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    return parsed.viewedTipIds || [];
                }
            } catch {}
        }
        return [];
    }

    _setViewedTipIds(ids) {        
        if (this.showAll) return; //Don't override if showing all hints

        console.debug('[HintDialog] Marking viewed tip ids:', ids);
        // Save viewedTipIds to localStorage or chrome.storage
        const storageKey = HintDialog.STORAGE_KEY;
        if (window.localStorage) {
            try {
                const raw = window.localStorage.getItem(storageKey);
                let parsed = raw ? JSON.parse(raw) : {};
                parsed.viewedTipIds = ids;
                window.localStorage.setItem(storageKey, JSON.stringify(parsed));
            } catch {}
        }
    }

    setDontShowAgain(value) {
        this.dontShowAgain = Boolean(value);
    }

    _persistState() {
        // Also persist viewedTipIds
        const viewedTipIds = this._getViewedTipIds();
        console.debug('[HintDialog] Persisting state. dontShowAgain:', this.dontShowAgain, 'lastIndex:', this.currentIndex, 'viewedTipIds:', viewedTipIds);
        const settings = { ...HintDialog.DEFAULT_SETTINGS, dontShowAgain: this.dontShowAgain, lastIndex: this.currentIndex, viewedTipIds };
        HintDialog.saveSettings(settings);
    }

    _render() {
        if (!this.hints.length || !this.messageEl) {
            if (this.messageEl) {
                this.messageEl.textContent = 'No hints available.';
            }
            return;
        }
        const hint = this.hints[this.currentIndex];
        const parts = [];
        if (hint.title) {
            parts.push(`<div class="hint-title">${hint.title}</div>`);
        }
        parts.push(`<div class="hint-body">${hint.body}</div>`);
        this.messageEl.innerHTML = parts.join('');
        if (this.indexLabel) {
            this.indexLabel.textContent = `${this.currentIndex + 1} / ${this.hints.length}`;
        }
    }

    _syncCheckbox() {
        if (!this.hideCheckbox) return;
        this.hideCheckbox.checked = Boolean(this.dontShowAgain);
    }

    _wireEvents() {
        if (this.nextBtn) {
            this.nextBtn.addEventListener('click', () => this.next());
        }
        if (this.prevBtn) {
            this.prevBtn.addEventListener('click', () => this.prev());
        }
        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', () => this.hide());
        }
        if (this.hideCheckbox) {
            this.hideCheckbox.addEventListener('change', (event) => {
                this.setDontShowAgain(event.target.checked);
            });
        }
        if (this.overlay) {
            this.overlay.addEventListener('click', (event) => {
                if (event.target === this.overlay) {
                    this.hide();
                }
            });
        }
    }

    _handleKeydown(event) {
        if (!this.visible) return;
        if (event.key === 'Escape' || event.key === 'Esc') {
            event.preventDefault();
            this.hide();
        } else if (event.key === 'ArrowRight') {
            event.preventDefault();
            this.next();
        } else if (event.key === 'ArrowLeft') {
            event.preventDefault();
            this.prev();
        }
    }

    _trapFocus(event) {
        if (!this.visible || event.key !== 'Tab') return;
        this._updateFocusableElements();
        const focusables = this.focusableElements;
        if (!focusables.length) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement;

        if (event.shiftKey && active === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && active === last) {
            event.preventDefault();
            first.focus();
        }
    }

    _updateFocusableElements() {
        if (!this.dialog) return;
        const selector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
        this.focusableElements = Array.from(this.dialog.querySelectorAll(selector))
            .filter((el) => !el.disabled && el.offsetParent !== null);
    }

    _clampIndex(index) {
        if (!this.hints.length) return 0;
        if (index < 0) return 0;
        if (index >= this.hints.length) return this.hints.length - 1;
        return index;
    }

    static _normalizeHints(hints) {
        const source = Array.isArray(hints) && hints.length ? hints : HintDialog.defaultHints;
        return source.map((hint) => {
            if (typeof hint === 'string') {
                return { title: '', body: hint };
            }
            if (hint && typeof hint === 'object') {
                return {
                    id: hint.id || undefined,
                    title: hint.title || '',
                    body: hint.body || ''
                };
            }
            return { title: '', body: '' };
        }).filter((hint) => hint.body);
    }
}

window.HintDialog = HintDialog;
