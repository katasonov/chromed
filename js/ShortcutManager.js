/**
 * ShortcutManager class
 * Centralizes all keyboard shortcuts handling throughout the application
 */
class ShortcutManager {
    constructor(editor) {
        this.editor = editor;
        this.shortcuts = new Map(); // Maps shortcut string to handler function
        this.menuShortcuts = new Set(); // Keeps track of menu-registered shortcuts
        this.debug = true; // Set to true to enable additional debug logging
        
        console.log('[ShortcutManager] Initializing');
        
        // Make ShortcutManager globally available immediately
        window.shortcutManager = this;
        
        this.init();
        
        // Debug: Check shortcuts after a short delay
        setTimeout(() => this.debugShortcuts(), 1000);
    }
    
    debugShortcuts() {
        console.debug('[ShortcutManager] Registered shortcuts:');
        console.debug('Total shortcuts:', this.shortcuts.size);
        console.debug('Shortcuts:', Array.from(this.shortcuts.keys()).join(', '));
        
        // Check for specific shortcut issues
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
     * Normalizes a shortcut string to a consistent format
     * @param {string} shortcut - The shortcut string (e.g., "Ctrl+S", "F3", "Shift+F3")
     * @returns {string} - Normalized shortcut string (e.g., "ctrl+s", "f3", "shift+f3")
     */
    normalizeShortcut(shortcut) {
        if (!shortcut) return '';
        
        // Split the shortcut by '+' and normalize each part
        const parts = shortcut.split('+').map(part => part.trim().toLowerCase());
        
        // Sort modifier keys to ensure consistent order (ctrl, shift, alt, meta)
        const modifiers = [];
        const key = [];
        
        parts.forEach(part => {
            if (['ctrl', 'control', 'shift', 'alt', 'meta'].includes(part)) {
                modifiers.push(part === 'control' ? 'ctrl' : part);
            } else {
                key.push(part);
            }
        });
        
        // Sort modifiers in a consistent order
        modifiers.sort((a, b) => {
            const order = { 'ctrl': 0, 'shift': 1, 'alt': 2, 'meta': 3 };
            return order[a] - order[b];
        });
        
        // Combine back into a single string
        const normalizedShortcut = [...modifiers, ...key].join('+');
        console.debug(`[ShortcutManager] Normalizing shortcut: "${shortcut}" to "${normalizedShortcut}"`);
        
        return normalizedShortcut;
    }

    /**
     * Registers a new shortcut
     * @param {string} shortcut - The shortcut string (e.g., "Ctrl+S")
     * @param {Function} handler - The function to execute when shortcut is triggered
     * @param {string} source - Optional source identifier (e.g., "menu", "editor")
     * @returns {boolean} - Whether registration was successful
     */
    register(shortcut, handler, source = 'custom') {
        console.debug(`[ShortcutManager] Attempting to register: "${shortcut}" from source: ${source}`);
        const normalizedShortcut = this.normalizeShortcut(shortcut);
        
        if (!normalizedShortcut) {
            console.warn('[ShortcutManager] Attempted to register empty shortcut');
            return false;
        }
        
        if (!handler || typeof handler !== 'function') {
            console.warn(`[ShortcutManager] Invalid handler for shortcut ${normalizedShortcut}`);
            return false;
        }
        
        // Check if this shortcut already exists
        const alreadyExists = this.shortcuts.has(normalizedShortcut);
        
        // Check for conflicts only with non-menu shortcuts when registering menu shortcuts
        // This allows menus to override custom shortcuts
        if (source === 'menu') {
            this.menuShortcuts.add(normalizedShortcut);
        } else if (this.menuShortcuts.has(normalizedShortcut)) {
            console.warn(`[ShortcutManager] Shortcut ${normalizedShortcut} is already registered by a menu item and cannot be overridden`);
            return false;
        }
        
        // Register the shortcut
        this.shortcuts.set(normalizedShortcut, handler);
        
        if (alreadyExists) {
            console.log(`[ShortcutManager] Updated existing shortcut: ${normalizedShortcut} (source: ${source})`);
        } else {
            console.log(`[ShortcutManager] Registered new shortcut: ${normalizedShortcut} (source: ${source})`);
        }
        
        return true;
    }

    /**
     * Unregisters a shortcut
     * @param {string} shortcut - The shortcut to unregister
     * @param {string} source - The source that's unregistering the shortcut
     * @returns {boolean} - Whether unregistration was successful
     */
    unregister(shortcut, source = 'custom') {
        const normalizedShortcut = this.normalizeShortcut(shortcut);
        
        if (!normalizedShortcut) {
            console.warn('[ShortcutManager] Attempted to unregister empty shortcut');
            return false;
        }
        
        // If it's a menu shortcut, remove from the menu set
        if (source === 'menu') {
            this.menuShortcuts.delete(normalizedShortcut);
        }
        
        const existed = this.shortcuts.has(normalizedShortcut);
        const result = this.shortcuts.delete(normalizedShortcut);
        
        if (result) {
            console.log(`[ShortcutManager] Unregistered shortcut: ${normalizedShortcut} (source: ${source})`);
        } else if (existed) {
            console.warn(`[ShortcutManager] Failed to unregister shortcut: ${normalizedShortcut} (source: ${source})`);
        }
        
        return result;
    }

    /**
     * Checks if a keyboard event should be handled by CodeMirror
     * This function is no longer needed since we now override CodeMirror's key handling,
     * but we keep it for reference and potential future use.
     * @param {KeyboardEvent} event - The keyboard event
     * @returns {boolean} - Whether this shortcut should be handled by CodeMirror
     */
    isCodeMirrorHandledShortcut(event) {
        // We now override all search-related shortcuts in CodeMirror itself
        // So we can always return false here
        return false;
    }

    /**
     * Registers application-specific shortcuts that aren't in menus
     * These are typically special shortcuts that need to be available
     * but don't correspond to menu items
     */
    registerNonMenuShortcuts() {
        // Register Escape key if editor instance is available
        if (this.editor && typeof this.editor.handleEscapeKey === 'function') {
            this.register('Escape', () => this.editor.handleEscapeKey(), 'globalEscape');
        }

        // Register Alt+Up/Down for tab switcher
        if (this.editor && typeof this.editor.showTabSwitcherDialog === 'function') {
            this.register('alt+down', () => { this.editor.showTabSwitcherDialog('down'); }, 'globalTabSwitch');
            this.register('alt+up', () => { this.editor.showTabSwitcherDialog('up'); }, 'globalTabSwitch');
        }
    }

    /**
     * Handles keyboard events and triggers appropriate shortcut handlers
     * @param {KeyboardEvent} event - The keyboard event
     */
    handleKeyDown(event) {
        console.debug(`[ShortcutManager]:handleKeyDown: ${event.key}`);
        // Ignore modifier keys by themselves
        if (['Control', 'Shift', 'Alt', 'Meta'].includes(event.key)) {
            return;
        }
        
        console.debug(`[ShortcutManager] Key pressed: "${event.key}", ctrlKey: ${event.ctrlKey}, shiftKey: ${event.shiftKey}`);
        console.debug("[ShortcutManager]:handleKeyDown: Building shortcut string");
        // Build the shortcut string based on the event
        let shortcutParts = [];
        if (event.ctrlKey) shortcutParts.push('ctrl');
        if (event.shiftKey) shortcutParts.push('shift');
        if (event.altKey) shortcutParts.push('alt');
        if (event.metaKey) shortcutParts.push('meta');
        
        // Handle special keys and function keys
        let key = event.key.toLowerCase();
        
        // Map some special keys to more readable names
        const keyMappings = {
            ' ': 'space',
            'arrowup': 'up',
            'arrowdown': 'down',
            'arrowleft': 'left',
            'arrowright': 'right',
            'escape': 'escape',
            '+': 'plus',
            '-': 'minus'
        };
        
        if (keyMappings[key]) {
            key = keyMappings[key];
        }
        
        shortcutParts.push(key);
        
        // // Create the normalized shortcut string
        const shortcutString = shortcutParts.join('+');
        
        // Check if we have a handler for this shortcut
        console.debug(`[ShortcutManager]:handleKeyDown: Checking shortcut ${shortcutString}`);
        console.debug(`[ShortcutManager]:handleKeyDown: Registered shortcuts:`, 
            Array.from(this.shortcuts.keys()).join(', '));
        
        if (this.shortcuts.has(shortcutString)) {
            // Always prevent default behavior for shortcuts we handle
            event.preventDefault();
            event.stopPropagation();
            
            try {
                console.debug(`[ShortcutManager] Executing shortcut: ${shortcutString}`);
                const result = this.shortcuts.get(shortcutString)();
                return result !== false; // Consider the shortcut handled unless handler explicitly returns false
            } catch (error) {
                console.error(`[ShortcutManager] Error executing shortcut ${shortcutString}:`, error);
                return true; // Consider the shortcut handled even if there was an error
            }
        }
        
        return false;
    }
}

// Export the class
window.ShortcutManager = ShortcutManager;
