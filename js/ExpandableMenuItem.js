class ExpandableMenuItem extends MenuItem {
    /**
     * ExpandableMenuItem constructor
     * @param {string} id - The unique identifier for the menu item.
     * @param {string} text - The display text for the menu item.
     * @param {string} shortcut - The keyboard shortcut for the menu item.
     */
    constructor({id, text = null, shortcut = null, contextMenuDropdown = null, onCollapse: onCollapsed = null, onExpanded = null} = {}) {
        super(id, text, () => this.expand(), shortcut);
        this.contextMenuDropdown = contextMenuDropdown; // Reference to the submenu instance
        this.onCollapsed = onCollapsed; // Callback when submenu collapses
        this.onExpanded = onExpanded; // Callback when submenu expands
        const prevOnHide = this.contextMenuDropdown ? this.contextMenuDropdown.onHide : null;
        this.contextMenuDropdown.onHide = (e) => {
            console.debug(`[ExpandableMenuItem] Submenu for item "${this.id}" hidden`);
            this.onCollapsed && this.onCollapsed();
            prevOnHide && prevOnHide();
        };
    }

    expand() {
        //show the submenu
        if (this.contextMenuDropdown) {
            const x = this.element.getBoundingClientRect().right;
            const y = this.element.getBoundingClientRect().top;
            this.contextMenuDropdown.show(x, y);
            this.contextMenuDropdown.selectFirstItem();
            this.contextMenuDropdown.onHide = () => {
                console.debug(`[ExpandableMenuItem] Submenu for item "${this.id}" hidden`);
                this.onCollapsed && this.onCollapsed();
            }
            this.onExpanded && this.onExpanded(this);
        }
    }

    collapse() {
        if (this.contextMenuDropdown) {
            console.debug(`[ExpandableMenuItem] Collapsing submenu for item "${this.id}"`);
            this.contextMenuDropdown.hide();
        }
    }

    select() {
        if (this.contextMenuDropdown) {
            this.expand();
        }
        super.select();
    }

    unselect() {
        if (this.contextMenuDropdown) {
            this.collapse();
        }
        super.unselect();
    }

}
