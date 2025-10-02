// Menu.js - Container for menu items with dropdown functionality
class Menu {
    // Default width for menus (can be overridden)
    width() {
        return 220; // px, default width
    }
    constructor(id, text) {
        this.id = id;
        this.text = text;
        this.items = [];
        this.element = null;
        this.dropdown = null;
        this.isOpen = false;
    }

    addItem(item) {
        this.items.push(item);
        
        // Add to dropdown if it's already created
        if (this.dropdown) {
            this.dropdown.appendChild(item.createElement());
        }
        
        return this;
    }

    addSeparator() {
        const separator = new MenuItem(null, null, null, null, true);
        return this.addItem(separator);
    }

    createElement() {
        // Use menu template from index.html
        const template = document.getElementById('menu-template');
        if (!template) {
            throw new Error('Menu template not found in index.html');
        }
        this.element = template.querySelector('.menu-item').cloneNode(true);
        this.element.id = this.id;
        this.element.tabIndex = 0;
        this.element.querySelector('.menu-label').textContent = this.text;

        // Setup dropdown
        this.dropdown = this.element.querySelector('.dropdown');
        this.dropdown.id = `${this.id}-dropdown`;
        this.dropdown.style.width = this.width() + 'px';
        this.dropdown.style.display = '';

        // Add all items to dropdown
        this.items.forEach(item => {
            this.dropdown.appendChild(item.createElement());
        });

        // Setup click handler for menu
        this.element.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggle();
        });

        this.element.addEventListener('mouseenter', () => {
            if (!Menu.isThereAnyOpenedMenu()) return;
            if (!this.isOpen) {
                // Open this menu and close others
                document.dispatchEvent(new CustomEvent('menu:closeAll'));
                this.open();
            }
        });

        // // Keyboard navigation for menu dropdown
        // this.dropdown.addEventListener('keydown', (e) => {
        //     console.debug(`[Menu] Dropdown keydown: ${e.key}`);
        //     if (!this.isOpen) return;
        //     const focusableItems = Array.from(this.dropdown.querySelectorAll('.dropdown-item:not(.disabled):not([style*="display: none"])'));
        //     if (!focusableItems.length) return;
        //     let currentIndex = focusableItems.findIndex(el => el === document.activeElement);
        //     const isExpandable = document.activeElement && document.activeElement.classList.contains('submenu-item');
        //     if (e.key === 'ArrowDown') {
        //         e.preventDefault();
        //         let nextIndex = (currentIndex + 1) % focusableItems.length;
        //         focusableItems[nextIndex].focus();
        //     } else if (e.key === 'ArrowUp') {
        //         e.preventDefault();
        //         let prevIndex = (currentIndex - 1 + focusableItems.length) % focusableItems.length;
        //         focusableItems[prevIndex].focus();
        //     } else if (e.key === 'ArrowLeft' && !isExpandable) {
        //         e.preventDefault();
        //         // Move to previous menu in menu bar
        //         const menuBar = this.element.parentElement;
        //         const menus = Array.from(menuBar.querySelectorAll('.menu-item'));
        //         let menuIndex = menus.findIndex(m => m === this.element);
        //         let prevMenu = null;
        //         if (menuIndex > 0) {
        //             prevMenu = menus[menuIndex - 1];
        //         } else if (menus.length > 1) {
        //             prevMenu = menus[menus.length - 1];
        //         }
        //         if (prevMenu) {
        //             menus.forEach(m => m.classList.remove('open'));
        //             prevMenu.focus();
        //             prevMenu.click();
        //             prevMenu.classList.add('open');
        //         }
        //     } else if (e.key === 'ArrowRight' && !isExpandable) {
        //         e.preventDefault();
        //         // Move to next menu in menu bar
        //         const menuBar = this.element.parentElement;
        //         const menus = Array.from(menuBar.querySelectorAll('.menu-item'));
        //         let menuIndex = menus.findIndex(m => m === this.element);
        //         let nextMenu = null;
        //         if (menuIndex < menus.length - 1) {
        //             nextMenu = menus[menuIndex + 1];
        //         } else if (menus.length > 1) {
        //             nextMenu = menus[0];
        //         }
        //         if (nextMenu) {
        //             menus.forEach(m => m.classList.remove('open'));
        //             nextMenu.focus();
        //             nextMenu.click();
        //             nextMenu.classList.add('open');
        //         }
        //     } else if (e.key === 'Escape' || e.key === 'Esc') {
        //         e.preventDefault();
        //         this.close();
        //         this.element.focus(); // Return focus to menu bar
        //     }
        // });

        // Append dropdown to menu element
        this.element.appendChild(this.dropdown);

        return this.element;
    }

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    open() {
        if (this.isOpen) return;
        
        // Close other menus first
        document.dispatchEvent(new CustomEvent('menu:closeAll'));
        
        this.isOpen = true;
        this.element.classList.add('open');
        this.dropdown.classList.add('show');
        
        // Close menu when clicking outside
        setTimeout(() => {
            document.addEventListener('click', this._closeHandler = () => this.close(), true);
        }, 0);
        // Focus the first enabled/visible menu item
        setTimeout(() => {
            const focusableItems = Array.from(this.dropdown.querySelectorAll('.dropdown-item:not(.disabled):not([style*="display: none"])'));
            if (focusableItems.length) {
                focusableItems[0].focus();
            }
            document.addEventListener('click', this._closeHandler = () => this.close(), true);
        }, 0);
        Menu.OpenedMenu = this;
    }

    close() {
        if (!this.isOpen) return;
        
        this.isOpen = false;
        this.element.classList.remove('open');
        this.dropdown.classList.remove('show');
        
        if (this._closeHandler) {
            document.removeEventListener('click', this._closeHandler, true);
            this._closeHandler = null;
        }
        Menu.OpenedMenu = null;
    }

    getItem(id) {
        return this.items.find(item => item.id === id);
    }

    removeItem(id) {
        const index = this.items.findIndex(item => item.id === id);
        if (index !== -1) {
            const item = this.items[index];
            
            // Release all resources including shortcut registration
            item.release();
            
            // Remove from items array
            this.items.splice(index, 1);
        }
    }

    static OpenedMenu = null;

    static isThereAnyOpenedMenu() {
        return Menu.OpenedMenu !== null;
    }
}