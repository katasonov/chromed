class MenuItemSeparator extends MenuItem {
    /**
     * MenuItemSeparator constructor
     * @param {string} [id] - Optional id for the separator
     */
    constructor(id) {
        super(id);        
    }

    // Override to always indicate this is a separator
    createElement() {
        this.element = document.createElement('hr');
        this.element.style.cssText = 'margin: 2px 0; border: none; border-top: 1px solid #ccc;';
        return this.element;
    }

    isActiveble() {
        return false; // Separators are never activeble
    }

}
