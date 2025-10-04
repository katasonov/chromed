/**
 * ShortcutManager class
 * Centralizes all keyboard shortcuts handling throughout the application
 */
class ShortcutManager {
    constructor(editor) {
        this.editor = editor;
        this.shortcuts = new Map(); // Maps normalized shortcut string to handler function
        this.menuShortcuts = new Set(); // Keeps track of menu-registered shortcuts
        this.debug = true; // Set to true to enable additional debug logging

        // Simple platform flag
        this._isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform);

        console.log('[ShortcutManager] Initializing');

        // Make ShortcutManager globally available immediately
        window.shortcutManager = this;

        // Pretty labels for menus (fixed: show Ctrl as ⌃, not ⌘ on macOS)
        window.platformShortcutLabel = (shortcut) => {
            if (!this._isMac || !shortcut) return shortcut || '';
            return shortcut
                .replace(/Command/gi, '⌘')
                .replace(/Meta/gi, '⌘')
                .replace(/Ctrl/gi, '⌃')
                .replace(/Control/gi, '⌃')
                .replace(/Alt/gi, '⌥')
                .replace(/Option/gi, '⌥')
                .replace(/Shift/gi, '⇧');
        };

        this.init();

        // Debug: Check shortcuts after a short delay
        setTimeout(() => this.debugShortcuts(), 1000);
    }

    debugShortcuts() {
        console.debug('[ShortcutManager] Registered shortcuts:');
        console.debug('Total shortcuts:', this.shortcuts.size);
        console.debug('Shortcuts:', Array.from(this.shortcuts.keys()).join(', '));

        const ctrlS = this.normalizeShortcut('Ctrl+S');
        console.debug(`Looking for Ctrl+S (normalized: ${ctrlS})... ${this.shortcuts.has(ctrlS) ? 'FOUND' : 'NOT FOUND'}`);

        const ctrlShiftS = this.normalizeShortcut('Ctrl+Shift+S');
        console.debug(`Looking for Ctrl+Shift+S (normalized: ${ctrlShiftS})... ${this.shortcuts.has(ctrlShiftS) ? 'FOUND' : 'NOT FOUND'}`);
    }

    init() {
        // Register global keyboard event listener
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));

        // Register application-specific shortcuts that aren't in menus
        this.registerNonMenuShortcuts();
    }

    /**
     * Normalize a single key token to our canonical form
     */
    _normalizeKeyToken(part) {
        if (!part) return '';
        let p = part.trim().toLowerCase();

        // Modifiers synonyms
        if (p === 'control') p = 'ctrl';
        if (p === 'cmd' || p === 'command') p = 'meta';
        if (p === 'option') p = 'alt';

        // Arrow keys & common special keys
        const keyMap = {
            'arrowup': 'up',
            'arrowdown': 'down',
            'arrowleft': 'left',
            'arrowright': 'right',
            ' ': 'space',
            '+': 'plus',
            '-': 'minus'
        };
        if (keyMap[p]) p = keyMap[p];

        return p;
    }

    /**
     * Normalizes a shortcut string to a consistent format
     * @param {string} shortcut - e.g., "Ctrl+S", "F3", "Shift+F3", "Ctrl+-"
     * @returns {string} - e.g., "ctrl+s", "f3", "shift+f3", "ctrl+minus"
     */
    normalizeShortcut(shortcut) {
        if (!shortcut) return '';

        const parts = String(shortcut).split('+').map(this._normalizeKeyToken);
        const modifiers = [];
        const key = [];

        parts.forEach(part => {
            if (['ctrl', 'shift', 'alt', 'meta'].includes(part)) {
                modifiers.push(part);
            } else if (part) {
                key.push(part);
            }
        });

        // Sort modifiers in a consistent order
        modifiers.sort((a, b) => {
            const order = { 'ctrl': 0, 'shift': 1, 'alt': 2, 'meta': 3 };
            return order[a] - order[b];
        });

        const normalizedShortcut = [...modifiers, ...key].join('+');
        if (this.debug) {
            console.debug(`[ShortcutManager] Normalizing shortcut: "${shortcut}" to "${normalizedShortcut}"`);
        }
        return normalizedShortcut;
    }

    /**
     * Returns platform alternates for a given shortcut, including Ctrl<->Meta swaps
     * Also injects macOS-specific exceptions/remaps (Redo, Find Next/Prev, Replace, menu openers)
     */
    createPlatformAlternates(shortcut) {
        const base = this.normalizeShortcut(shortcut);
        if (!base) return [];

        const variants = new Set([base]);

        const swapCtrlMeta = (s) => {
            if (s.includes('ctrl+')) variants.add(s.replaceAll('ctrl+', 'meta+'));
            if (s.includes('meta+')) variants.add(s.replaceAll('meta+', 'ctrl+'));
        };

        swapCtrlMeta(base);

        // macOS remaps (from your spec), with Option A menu-opener changes
        if (this._isMac) {
            const macMap = {
                // editing / search
                'ctrl+y': 'meta+shift+z',     // Redo
                'f3': 'meta+g',               // Find Next
                'shift+f3': 'meta+shift+g',   // Find Previous
                'ctrl+h': 'meta+alt+f',       // Replace... (avoid Cmd+H which hides the app)

                // MENU OPENERS (Option A): Win/Linux Alt+[F/E/S/V/L] → macOS Ctrl+Alt+[...]
                'alt+f': 'ctrl+alt+f',
                'alt+e': 'ctrl+alt+e',
                'alt+s': 'ctrl+alt+s',
                'alt+v': 'ctrl+alt+v',
                'alt+l': 'ctrl+alt+l'
            };

            const extra = macMap[base];
            if (extra) variants.add(extra);
        }

        return Array.from(variants);
    }

    /**
     * Registers a shortcut and all its platform alternates
     * @param {string|string[]} shortcut - "Ctrl+S" or array of shortcuts
     * @param {Function} handler
     * @param {string} source - "menu" | "custom" | ...
     */
    register(shortcut, handler, source = 'custom') {
        console.debug(`[ShortcutManager] Attempting to register: "${shortcut}" from source: ${source}`);

        if (Array.isArray(shortcut)) {
            return shortcut.map(s => this.register(s, handler, source)).some(Boolean);
        }

        if (!handler || typeof handler !== 'function') {
            console.warn(`[ShortcutManager] Invalid handler for shortcut "${shortcut}"`);
            return false;
        }

        // Expand to platform alternates (cross-platform + mac exceptions)
        const alternates = this.createPlatformAlternates(shortcut);
        let any = false;

        for (const alt of alternates) {
            const normalizedShortcut = this.normalizeShortcut(alt);
            if (!normalizedShortcut) continue;

            const alreadyExists = this.shortcuts.has(normalizedShortcut);

            if (source === 'menu') {
                this.menuShortcuts.add(normalizedShortcut);
            } else if (this.menuShortcuts.has(normalizedShortcut)) {
                console.warn(`[ShortcutManager] Shortcut ${normalizedShortcut} is registered by a menu item and cannot be overridden`);
                continue;
            }

            this.shortcuts.set(normalizedShortcut, handler);
            console.log(`[ShortcutManager] ${alreadyExists ? 'Updated' : 'Registered'} shortcut: ${normalizedShortcut} (source: ${source})`);
            any = true;
        }

        if (!any) {
            console.warn(`[ShortcutManager] No alternates registered for "${shortcut}"`);
        }

        return any;
    }

    /**
     * Unregisters a shortcut (and its alternates)
     */
    unregister(shortcut, source = 'custom') {
        const alternates = this.createPlatformAlternates(shortcut);
        let removed = false;

        for (const alt of alternates) {
            const normalizedShortcut = this.normalizeShortcut(alt);
            if (!normalizedShortcut) continue;

            if (source === 'menu') {
                this.menuShortcuts.delete(normalizedShortcut);
            }

            const existed = this.shortcuts.has(normalizedShortcut);
            const result = this.shortcuts.delete(normalizedShortcut);
            if (result) {
                removed = true;
                console.log(`[ShortcutManager] Unregistered shortcut: ${normalizedShortcut} (source: ${source})`);
            } else if (existed) {
                console.warn(`[ShortcutManager] Failed to unregister shortcut: ${normalizedShortcut} (source: ${source})`);
            }
        }

        return removed;
    }

    /**
     * Registers application-specific shortcuts that aren't in menus
     */
    registerNonMenuShortcuts() {
        // Escape
        if (this.editor && typeof this.editor.handleEscapeKey === 'function') {
            this.register('Escape', () => this.editor.handleEscapeKey(), 'globalEscape');
        }

        // Tab switcher (Alt/Option + Up/Down)
        if (this.editor && typeof this.editor.showTabSwitcherDialog === 'function') {
            this.register('alt+down', () => { this.editor.showTabSwitcherDialog('down'); }, 'globalTabSwitch');
            this.register('alt+up', () => { this.editor.showTabSwitcherDialog('up'); }, 'globalTabSwitch');
        }
    }

    // Map KeyboardEvent.code -> our normalized printable key
    _codeToKey(code, shift) {
        if (code.startsWith('Key')) return code.slice(3).toLowerCase();
        if (code.startsWith('Digit')) return code.slice(5);
        if (code.startsWith('Numpad')) {
            const k = code.slice(6).toLowerCase();
            const map = { add: 'plus', subtract: 'minus', decimal: '.', divide: '/', multiply: '*' };
            return map[k] || k;
        }
        const map = {
            Minus: 'minus',
            Equal: shift ? 'plus' : '=',
            BracketLeft: '[',
            BracketRight: ']',
            Backslash: '\\',
            Semicolon: ';',
            Quote: "'",
            Backquote: '`',
            Comma: ',',
            Period: '.',
            Slash: '/'
        };
        if (map[code] !== undefined) return map[code];

        const lowers = {
            ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
            Space: 'space', Enter: 'enter', Escape: 'escape', Tab: 'tab',
            Home: 'home', End: 'end', PageUp: 'pageup', PageDown: 'pagedown', Insert: 'insert', Delete: 'delete'
        };
        if (lowers[code]) return lowers[code];
        if (/^F\d{1,2}$/.test(code)) return code.toLowerCase();

        return code.toLowerCase();
    }

    // Decide the best key identity for matching shortcuts
    _resolveEventKey(event) {
        let key = String(event.key || '').toLowerCase();

        const keyMappings = {
            ' ': 'space',
            'arrowup': 'up',
            'arrowdown': 'down',
            'arrowleft': 'left',
            'arrowright': 'right',
            '+': 'plus',
            '-': 'minus',
        };
        if (keyMappings[key]) return keyMappings[key];

        const anyModifier = event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;
        if (this._isMac && anyModifier && event.code) {
            return this._codeToKey(event.code, event.shiftKey);
        }
        return key;
    }

    /**
     * Handles keyboard events and triggers appropriate shortcut handlers
     * @param {KeyboardEvent} event
     */
    handleKeyDown(event) {
        if (['Control', 'Shift', 'Alt', 'Meta'].includes(event.key)) {
            return false;
        }

        const parts = [];
        if (event.ctrlKey) parts.push('ctrl');
        if (event.shiftKey) parts.push('shift');
        if (event.altKey) parts.push('alt');
        if (event.metaKey) parts.push('meta');

        const key = this._resolveEventKey(event);
        parts.push(key);

        const shortcutString = parts.join('+');

        if (this.debug) {
            console.debug(`[ShortcutManager] Key pressed: "${event.key}", code:"${event.code}", ctrl:${event.ctrlKey}, shift:${event.shiftKey}, alt:${event.altKey}, meta:${event.metaKey}`);
            console.debug(`[ShortcutManager] Checking shortcut "${shortcutString}"`);
        }

        if (this.shortcuts.has(shortcutString)) {
            event.preventDefault();
            event.stopPropagation();
            try {
                const result = this.shortcuts.get(shortcutString)();
                return result !== false;
            } catch (error) {
                console.error(`[ShortcutManager] Error executing shortcut ${shortcutString}:`, error);
                return true;
            }
        }
        return false;
    }
}

// Export the class
window.ShortcutManager = ShortcutManager;
