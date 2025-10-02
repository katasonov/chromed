class ContextMenuDropdown {

    constructor({id, items = [], onHide = null, onLeftArrowPressed = null, onRightArrowPressed = null} = {}) {
        console.debug(`[ContextMenuDropdown][${this.id}] Initializing context menu with id "${id}" and ${items.length} items`);
        this.id = id;
        this.element = null;
        this.items = items;
        this.isOpen = false;
        this.onHide = onHide;
        this.expandedItem = null; // Currently expanded submenu item
        this._onDocClick = this._onDocClick.bind(this);
        this.onLeftArrowPressed = onLeftArrowPressed;
        this.onRightArrowPressed = onRightArrowPressed;

        this.element = document.querySelector('.context-menu-dropdown-template').cloneNode(true);
        this.element.style.display = 'none';
        // Setup dropdown
        this.element.id = `${this.id}-dropdown`;
        this.element.style.width = this.width() + 'px';
        this.typeBuffer = '';
        this.typeBufferTimeout = null;

        // Add all items to dropdown
        this.items.forEach(item => {
            this.element.appendChild(item.createElement());
            if (typeof item.onCollapsed !== "undefined") {
                const prevCollapsed = item.onCollapsed;
                item.onCollapsed = () => {
                    console.debug(`[ContextMenuDropdown][${this.id}] Submenu item "${item.id}" collapsed`);
                    prevCollapsed && prevCollapsed();
                    this.expandedItem = null;
                };
            }
            item.onSelected = (menuItem) => {
                //unselect all other items
                console.debug(`[ContextMenuDropdown][${this.id}] Menu item "${menuItem.id}" selected`);
                this.items.forEach(i => {
                    if (i !== menuItem) {
                        i.unselect();
                    }                    
                });
                // if (this.expandedItem != null && this.expandedItem !== menuItem) {
                //     console.debug(`[ContextMenuDropdown][${this.id}] Collapsing previously expanded submenu item "${this.expandedItem.id}"`);
                //     this.expandedItem.collapse && this.expandedItem.collapse();
                // }
            };
            if (item.expand) {
                item.onExpanded = (item) => {
                    console.debug(`[ContextMenuDropdown][${this.id}] Submenu item "${item.id}" expanded`);
                    if (this.expandedItem && this.expandedItem !== item) {
                        console.debug(`[ContextMenuDropdown][${this.id}] Collapsing previously expanded submenu item "${this.expandedItem.id}"`);
                        this.expandedItem.collapse && this.expandedItem.collapse();
                    }
                    this.expandedItem = item;
                }
            }
        });

        this.element.style.display = '';
        this.element.style.position = 'absolute';
        this.element.style.zIndex = 10000;      
     }

     show(x, y) {
        if (this.isOpen || !this.element) {
            return;
        }
        console.debug(`[ContextMenuDropdown][${this.id}] Showing context menu at (${x}, ${y})`);
        this.element.style.left = `${x}px`;
        this.element.style.top = `${y}px`;
        document.body.appendChild(this.element);    
        this.element.focus();
        this.selectFirstItem();
        // Close on click outside
        document.addEventListener('mousedown', this._onDocClick, true);
        // Keyboard navigation for menu dropdown
        document.addEventListener('keydown', this._onDocKeydown);
        this.isOpen = true;
    }

     _onDocClick = (event) => {
        //log with id
        console.debug(`[ContextMenuDropdown][${this.id}] Document click event`);       //

        if (this.element && 
            !this.element.contains(event.target) && //click outside the menu
            this.isOpen) {
            //check whether it has a submenu opened
            if (this.expandedItem != null) {
                console.debug(`[ContextMenuDropdown][${this.id}] A submenu is expanded, ignoring out of the document click`);
                //check that click is outside the expanded submenu
                if (this.expandedItem.contextMenuDropdown && this.expandedItem.contextMenuDropdown.element) {
                    if (this.expandedItem.contextMenuDropdown.element.contains(event.target)) {
                        return;
                    }
                }
            }
            this.hide();
            return;
        }
         //get selected item
        const selectedItem = this.items.find(i => i.isSelected());
        if (selectedItem && selectedItem.element.contains(event.target)) {
            console.debug(`[ContextMenuDropdown][${this.id}] Clicked on selected item "${selectedItem.id}"`);
            selectedItem.action && selectedItem.action();
            //throw a menu:closeAll event to close all menus
            setTimeout(() => document.dispatchEvent(new CustomEvent('menu:closeAll')), 0);
        }

     }

     _onDocKeydown = (e) => {
        console.debug(`[ContextMenuDropdown][${this.id}] Keydown event: ${e.key}`);
        if (!this.isOpen) {
            console.debug(`[ContextMenuDropdown][${this.id}] Menu is not open, ignoring keydown`);
            return;
        }
        const activebleItems = this.items.filter(i => i.isActiveble());

        if (!activebleItems.length) {
            console.debug(`[ContextMenuDropdown][${this.id}] No activeble items in menu, ignoring keydown`);
            return;
        }

        if (this.expandedItem != null) {
            console.debug(`[ContextMenuDropdown][${this.id}] A submenu is expanded, ignoring keydown`);
            // If a submenu is expanded, let it handle the keydown
            return;
        }

        // Type-to-select logic for a-z, 0-9
        if (/^[a-z0-9]$/i.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
            this.typeBuffer += e.key.toLowerCase();
            console.debug(`[ContextMenuDropdown][${this.id}] Type-to-select buffer: "${this.typeBuffer}"`);
            // Reset buffer after timeout
            clearTimeout(this.typeBufferTimeout);
            this.typeBufferTimeout = setTimeout(() => { this.typeBuffer = ''; }, 700);
            // Find first item whose label starts with buffer
            const matchItem = activebleItems.find(i => {
                let label = (i.text || '').toLowerCase();
                label = label.replace(/\s+/g, '');
                return label.startsWith(this.typeBuffer);
            });
            if (matchItem) {
                console.debug(`[ContextMenuDropdown][${this.id}] Type-to-select matched item "${matchItem.id}"`);
                activebleItems.forEach(i => i.unselect());
                matchItem.select();
            }
            return;
        }

        const currentIndex = activebleItems.findIndex(i => i.isSelected());
        if (currentIndex === -1) {
            // If none is selected, select the first one
            activebleItems[0].select();
            return;
        }
        const currentItem = activebleItems[currentIndex];
        const isExpandable = !!currentItem.expand;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            console.debug(`[ContextMenuDropdown][${this.id}] Navigating down in menu`);
            let nextIndex = (currentIndex + 1) % activebleItems.length;
            const nextItem = activebleItems[nextIndex];
            this.selectNextItemWithKeyboard(currentItem, nextItem);
        } else if (e.key === 'ArrowUp') {
            console.debug(`[ContextMenuDropdown][${this.id}] Navigating up in menu`);
            e.preventDefault();
            let prevIndex = (currentIndex - 1 + activebleItems.length) % activebleItems.length;
            const prevItem = activebleItems[prevIndex];
            this.selectNextItemWithKeyboard(currentItem, prevItem);
        }  else if (e.key === 'ArrowLeft') {
            console.debug(`[ContextMenuDropdown][${this.id}] Left arrow pressed in menu`);
            e.preventDefault();
            console.debug(`[ContextMenuDropdown][${this.id}] this.onLeftArrowPressed:`, this.onLeftArrowPressed);
            this.onLeftArrowPressed && this.onLeftArrowPressed(this);
            this.hide();
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            if (isExpandable) {
                console.debug(`[ContextMenuDropdown][${this.id}] Right arrow pressed, expanding submenu for item "${currentItem.id}"`);
                currentItem.expand();
                this.expandedItem = currentItem;
            } else {
                console.debug(`[ContextMenuDropdown][${this.id}] Right arrow pressed but current item is not expandable`);
                if (this.onRightArrowPressed) {
                    this.onRightArrowPressed(this);
                    this.hide();
                }                
            }
        } else if (e.key === 'Escape' || e.key === 'Esc') {
            e.preventDefault();
            this.hide();
        }  else if (e.key === 'Enter' || e.key === ' ') {
            if (!currentItem.enabled) return;
            e.preventDefault();
            if (currentItem.action) currentItem.action();
            // Close the menu after action
            if (currentItem.expand) {
                currentItem.expand();
                this.expandedItem = currentItem;
            } else {
                setTimeout(() => document.dispatchEvent(new CustomEvent('menu:closeAll')), 0);
            }
        }
    };

    selectNextItemWithKeyboard(curItem, nextItem) {
        curItem.unselect();
        nextItem.select();
        //Avoid expanding submenu on keyboard navigation
        if (nextItem.collapse) {
            nextItem.collapse();
        }
    }

     selectFirstItem() {
        const firstItem = this.items.find(i => i.isActiveble());    
        if (firstItem) {
            firstItem.select();
        }
    }

     hide() {
        if (!this.isOpen || !this.element) {
            return;
        }
        //close all submenus
        this.items.forEach(item => typeof item.collapse === "function" && item.collapse());

        if (this.element) {
            //this.element.style.display = 'none';
            document.removeEventListener('mousedown', this._onDocClick, true);
            document.removeEventListener('keydown', this._onDocKeydown);
            this.element.parentNode.removeChild(this.element);
        }
        this.isOpen = false;
        this.onHide && this.onHide();
     }

    width() {
        return 220; // px, default width
    }
     
}