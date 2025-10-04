// MenuItem.js - Individual menu item
class MenuItem {
    constructor(id, text = null, action = null, shortcut = null) {
        this.id = id;
        this.text = text;
        this.action = action;
        this.shortcut = shortcut;
        this.enabled = true;
        this.visible = true;
        this.element = null;
        this.shortcutRegistered = false; // Track if this shortcut is registered
        this.onSelected = null; // Callback when item is selected

        // Register shortcut if available
        if (this.shortcut && this.enabled) {
            console.log(`[MenuItem] Registering shortcut "${this.shortcut}" for menu item "${this.id}"`);
            this.registerShortcut();
        }
    }

    // Register shortcut with the ShortcutManager
    registerShortcut() {
        if (!this.shortcut) {
            return false;
        }

        const shortcutManager = window.shortcutManager;
        if (!shortcutManager) {
            console.warn(`[MenuItem] Cannot register shortcut for "${this.id}" - ShortcutManager not available in window`);
            return false;
        }

        // Register the shortcut with handler based on enabled state
        const handler = this.enabled && this.action
            ? () => { if (this.enabled && this.action) this.action(); }
            : () => { console.log(`[MenuItem] Shortcut "${this.shortcut}" triggered but item "${this.id}" is disabled`); };

        const result = shortcutManager.register(this.shortcut, handler, 'menu');

        this.shortcutRegistered = result;
        if (result) {
            console.log(`[MenuItem] Registered shortcut "${this.shortcut}" for menu item "${this.id}" (${this.enabled ? 'enabled' : 'disabled'})`);
        }

        return result;
    }

    // Unregister shortcut
    unregisterShortcut() {
        if (!this.shortcut || !this.shortcutRegistered) {
            return false;
        }

        const shortcutManager = window.shortcutManager;
        if (!shortcutManager) return false;

        const result = shortcutManager.unregister(this.shortcut, 'menu');
        if (result) {
            this.shortcutRegistered = false;
            console.log(`[MenuItem] Unregistered shortcut "${this.shortcut}" for menu item "${this.id}"`);
        }

        return result;
    }

    // Release resources and unregister shortcut
    release() {
        if (this.shortcut && this.shortcutRegistered) {
            this.unregisterShortcut();
        }

        if (this.element) {
            const newElement = this.element.cloneNode(true);
            if (this.element.parentNode) {
                this.element.parentNode.replaceChild(newElement, this.element);
            }
            this.element = null;
        }

        this.action = null;
    }

    createElement() {
        const template = document.getElementById('menu-item-template');
        if (!template) {
            throw new Error('Menu item template not found in index.html');
        }
        this.element = template.querySelector('.menu-item-row').cloneNode(true);
        this.element.classList.add('dropdown-item');
        this.element.setAttribute('data-action', this.id);
        this.element.tabIndex = 0; // Make menu item focusable for keyboard navigation

        // Fill in the icon and shortcut/expand columns
        const iconSpan = this.element.querySelector('.menu-item-icon');
        const shortcutSpan = this.element.querySelector('.menu-item-shortcut');
        const expandSpan = this.element.querySelector('.menu-item-expand');
        const expandable = typeof this.expand === 'function';

        if (expandable) {
            iconSpan.textContent = '';
            // Render a caret for submenu
            shortcutSpan.textContent = '>';
            expandSpan.textContent = '';
        } else {
            if (this.icon) {
                iconSpan.textContent = this.icon;
            } else {
                iconSpan.textContent = '';
            }
            const labeler = window.platformShortcutLabel || ((s) => s || '');
            shortcutSpan.textContent = labeler(this.shortcut || '');
            expandSpan.textContent = '';
        }

        // Label
        const labelSpan = this.element.querySelector('.menu-item-label');
        let label = this.text || '';
        const maxLabelLength = 32;
        if (label.length > maxLabelLength) {
            label = label.slice(0, maxLabelLength - 3) + '...';
        }
        labelSpan.textContent = label;
        labelSpan.title = this.text || '';
        this.iconSpan = iconSpan;

        if (!this.enabled) {
            this.element.classList.add('disabled');
        }

        this.element.addEventListener('mouseenter', () => {
            this.select();
        });

        this.element.addEventListener('mouseleave', () => {
            // this.unselect();
        });

        return this.element;
    }

    setEnabled(enabled) {
        if (this.enabled === enabled) return;

        this.enabled = enabled;
        if (this.element) {
            this.element.classList.toggle('disabled', !enabled);
        }

        if (this.shortcut && this.shortcutRegistered) {
            this.registerShortcut();
        } else if (this.shortcut && enabled) {
            this.registerShortcut();
        }
    }

    setVisible(visible) {
        this.visible = visible;
        if (this.element) {
            this.element.style.display = visible ? 'block' : 'none';
        }
    }

    shouldRegisterShortcut() { return true; }

    isActiveble() {
        return this.enabled && this.visible;
    }

    isSelected() {
        if (!this.element) return false;
        return this.element.classList.contains('selected');
    }

    select() {
        if (this.element) {
            this.element.classList.add('selected');
            this.element.focus();
            if (this.onSelected) {
                this.onSelected(this);
            }
        }
    }

    unselect() {
        if (this.element && this.isSelected()) {
            this.element.blur();
            this.element.classList.remove('selected');
        }
    }
}

// (no export needed when used in browser scope)
