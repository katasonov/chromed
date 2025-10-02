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
        // If disabled, we register an empty handler that just prevents default browser behavior
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
        // Always unregister shortcut when releasing the item
        if (this.shortcut && this.shortcutRegistered) {
            this.unregisterShortcut();
        }
        
        // Remove event listeners
        if (this.element) {
            // Clone the element to remove all event listeners
            const newElement = this.element.cloneNode(true);
            if (this.element.parentNode) {
                this.element.parentNode.replaceChild(newElement, this.element);
            }
            this.element = null;
        }
        
        // Clear references
        this.action = null;
    }

    createElement() {

        // Clone the menu item template row directly as the menu item element
        const template = document.getElementById('menu-item-template');
        if (!template) {
            throw new Error('Menu item template not found in index.html');
        }
        this.element = template.querySelector('.menu-item-row').cloneNode(true);
        this.element.classList.add('dropdown-item');
        this.element.setAttribute('data-action', this.id);
        this.element.tabIndex = 0; // Make menu item focusable for keyboard navigation


        // Fill in the icon (bird sing/dot/empty) and shortcut/expand columns
        const iconSpan = this.element.querySelector('.menu-item-icon');
        const shortcutSpan = this.element.querySelector('.menu-item-shortcut');
        const expandSpan = this.element.querySelector('.menu-item-expand');
        const expandable = typeof this.expand === 'function';
        if (expandable) {
            // Expandable menu item (submenu)
            // By default, icon is empty; dot is set dynamically for selected language
            iconSpan.textContent = '';
            shortcutSpan.textContent = '>';
            expandSpan.textContent = '';
        } else {
            // Normal menu item
            // Allow icon to be set dynamically after creation (for bird sign)
            if (this.icon) {
                iconSpan.textContent = this.icon;
            } else {
                iconSpan.textContent = '';
            }
            shortcutSpan.textContent = this.shortcut || '';
            expandSpan.textContent = '';
        }

        // Fill in the label, with truncation if needed
        const labelSpan = this.element.querySelector('.menu-item-label');
        let label = this.text || '';
        const maxLabelLength = 32;
        if (label.length > maxLabelLength) {
            label = label.slice(0, maxLabelLength - 3) + '...';
        }
        labelSpan.textContent = label;
        labelSpan.title = this.text || '';
        // Store reference for dynamic icon updates
        this.iconSpan = iconSpan;

        if (!this.enabled) {
            this.element.classList.add('disabled');
        }

        // this.element.addEventListener('click', (e) => {
        //     if (this.enabled && this.action) {
        //         e.stopPropagation();
        //         this.action();
        //     }
        // });
        // Keyboard: Enter/Space triggers menu item action
        // this.element.addEventListener('keydown', (e) => {
        //     if (!this.enabled) return;
        //     if (e.key === 'Enter' || e.key === ' ') {
        //         e.preventDefault();
        //         if (this.action) this.action();
        //         // Close the menu after action
        //         setTimeout(() => document.dispatchEvent(new CustomEvent('menu:closeAll')), 0);
        //     }
        // });

        this.element.addEventListener('mouseenter', () => {
            this.select();
        });

        this.element.addEventListener('mouseleave', () => {
            //this.unselect();
        });

        return this.element;
    }

    setEnabled(enabled) {
        // If enabled state hasn't changed, do nothing
        if (this.enabled === enabled) return;
        
        this.enabled = enabled;
        if (this.element) {
            this.element.classList.toggle('disabled', !enabled);
        }
        
        // Update shortcut handler based on enabled state
        if (this.shortcut && this.shortcutRegistered) {
            // Re-register with the appropriate handler based on enabled state
            this.registerShortcut();
        } else if (this.shortcut && enabled) {
            // Try to register if it wasn't registered before and now it's enabled
            this.registerShortcut();
        }
    }

    setVisible(visible) {
        this.visible = visible;
        if (this.element) {
            this.element.style.display = visible ? 'block' : 'none';
        }
    }
    
    // Override this method in subclasses to control whether a shortcut should be registered
    shouldRegisterShortcut() {
        return true; // By default, register all shortcuts
    }

    isActiveble() {
        return this.enabled && this.visible;
    }

    isSelected() {        
        // Return true if the menu item is hovered by mouse or focused
        if (!this.element) return false;
        //TODO: check that class contains selected property in class list
        return this.element.classList.contains('selected');
        //return this.element.matches(':focus');
    }

    select() {
        if (this.element) {
            this.element.classList.add('selected');
            // Focus the element for keyboard navigation
            this.element.focus();
            if (this.onSelected) {
                this.onSelected(this);
            }
        }
    }

    unselect() {
        if (this.element && this.isSelected()) {
            // Remove focus from the element
            this.element.blur();
            this.element.classList.remove('selected');
        }
    }
}