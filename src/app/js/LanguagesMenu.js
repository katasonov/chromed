// LanguagesMenu.js - Refactored to use ContextMenuDropdown
// Assumes ContextMenuDropdown and MenuItem are imported or available in scope
class LanguagesMenu extends ContextMenuDropdown {
 
    static label = 'Languages';
    width() {
        return 260;
    }
    /**
     * @param {object} opts
     * @param {object} opts.editor - Editor instance
     * @param {string} [opts.id] - Optional menu id
     * @param {function} [opts.onHide] - Optional hide callback
     */
    constructor({editor, id = 'languages-menu', onHide = null, onLeftArrowPressed = null, onRightArrowPressed = null} = {}) {
        // Helper to wrap handlers so they close the menu first
        const wrapHandler = (fn, menuInstance) => () => {
            menuInstance.hide();
            fn();
        };

        const handlerForLanguageSelect = (lang) => {
            editor.handleAction('set-language', {
                mode: lang.mimeType,
                displayName: lang.displayName,
                id: lang.mimeType                
            });
            this.hide();
        };        

        // Build menu items array
        const fileTypes = FileTypes.getAllFileTypes().filter(ft => ft.mimeType !== 'application/octet-stream' && ft.mimeType !== 'text/plain');
        fileTypes.sort((a, b) => a.displayName.localeCompare(b.displayName));
        const menuItems = [];
        menuItems.push(new MenuItem('lang-none', 'None (No formatting)', function() {
            // Handle "None" option
            handlerForLanguageSelect({mimeType: 'text/plain', displayName: 'Text'});
        }, null));
        menuItems.push(new MenuItemSeparator()); // Separator
        const submenus = {};
        fileTypes.forEach(fileType => {
            const firstChar = fileType.displayName.charAt(0).toLowerCase();
            if (!submenus[firstChar]) {
                submenus[firstChar] = [];
            }
            submenus[firstChar].push({
                id: `lang-${fileType.mimeType}`,
                displayName: fileType.displayName,
                mimeType: fileType.mimeType
            });
        });
        Object.entries(submenus).forEach(([char, items]) => {
            // Create LanguageSubmenu instance for this group
            const languageSubmenu = new LanguageSubmenu({
                editor,
                languages: items,
                id: `language-submenu-${char}`
            });
            // Create MenuItem for the submenu trigger
            const submenuItem = new ExpandableMenuItem({id: `submenu-${char}`, text: char.toUpperCase(), contextMenuDropdown: languageSubmenu});
            menuItems.push(submenuItem);
        });
        menuItems.push(new MenuItemSeparator()); // Separator


        let xmlFileType = fileTypes.find(ft => ft.mimeType === 'application/xml' || ft.mimeType === 'text/xml');
        if (xmlFileType) {
            menuItems.push(new MenuItem(xmlFileType.mimeType, xmlFileType.displayName, function() { handlerForLanguageSelect(xmlFileType); }, null));
        }
        let jsonFileType = fileTypes.find(ft => ft.mimeType === 'application/json');
        if (jsonFileType) {
            menuItems.push(new MenuItem(jsonFileType.mimeType, jsonFileType.displayName, function() { handlerForLanguageSelect(jsonFileType); }, null));
        }
        let yamlFileType = fileTypes.find(ft => ft.mimeType === 'text/yaml');
        if (yamlFileType) {
            menuItems.push(new MenuItem(yamlFileType.mimeType, yamlFileType.displayName, function() { handlerForLanguageSelect(yamlFileType); }, null));
        }
        let markdownFileType = fileTypes.find(ft => ft.mimeType === 'text/markdown');
        if (markdownFileType) {
            menuItems.push(new MenuItem(markdownFileType.mimeType, markdownFileType.displayName, function() { handlerForLanguageSelect(markdownFileType); }, null));
        }
        super({id, items: menuItems, onHide, onLeftArrowPressed: onLeftArrowPressed, onRightArrowPressed: onRightArrowPressed});
        this.editor = editor;
        this.fileTypes = fileTypes;

        
    }

    // Event listeners will be set up when menu is shown
    /**
     * Override show() to register local events, then call super.show()
     */
    show(x, y) {
        this.setupEventListeners();
        return super.show(x, y);
    }
    
    /**
     * Setup event listeners for menu cleanup and language change
     */
    setupEventListeners() {
        // Store handlers so they can be removed later
        this._cleanupSubmenusHandler = () => this.cleanupSubmenus();
        this._closeAllHandler = () => {
            this.items.forEach(item => {
                if (item.submenu) {
                    item.submenu.classList.remove('show');
                }
            });
        };
        this._languageChangedHandler = (e) => {
            this.updateSelectedLanguage(e.detail.language);
        };
        window.addEventListener('unload', this._cleanupSubmenusHandler);
        document.addEventListener('menu:closeAll', this._closeAllHandler);
        document.addEventListener('language:changed', this._languageChangedHandler);
    }
    
    
    // Method to update the selected language indicator
    updateSelectedLanguage(language) {
        console.debug('[LanguageMenu]Updating selected language to:', language);
        // First, remove all selections
        this.clearAllSelections();
        
        // Mark the appropriate language item
        if (language === 'none') {
            const noneItem = this.getItem('lang-none');
            if (noneItem && noneItem.element) {
                noneItem.element.classList.add('selected-language');
            }
            return;
        }
        
        // Find and mark the language in submenus
        let found = false;
        // Check all submenu items
        this.items.forEach(item => {
            if (item.submenu && !found) {
                const submenuItems = item.submenu.querySelectorAll('.dropdown-item');
                submenuItems.forEach(submenuItem => {
                    const action = submenuItem.getAttribute('data-action');
                    // The id is always 'lang-<id>'
                    // Try to match by id or by mode string
                    if (action === `lang-${language}` || action === language || action.endsWith(`-${language}`)) {
                        submenuItem.classList.add('selected-language');
                        if (item.element) {
                            item.element.classList.add('selected-language');
                        }
                        found = true;
                    }
                });
            }
        });
    }
    
    // Clear all selected language indicators
    clearAllSelections() {
        // Clear main menu item selections
        this.items.forEach(item => {
            if (item.element) {
                item.element.classList.remove('selected-language');
            }
            
            // Clear submenu selections
            if (item.submenu) {
                const submenuItems = item.submenu.querySelectorAll('.dropdown-item');
                submenuItems.forEach(submenuItem => {
                    submenuItem.classList.remove('selected-language');
                });
            }
        });
    }

   
    // Clean up submenu elements from the DOM
    cleanupSubmenus() {
        this.items.forEach(item => {
            if (item.submenu && item.submenu.parentNode) {
                item.submenu.parentNode.removeChild(item.submenu);
            }
        });
    }

       /**
     * Override hide() to remove event listeners registered in setupEventListeners
     */
    hide() {
        this.removeEventListeners();
        return super.hide();
    }

    /**
     * Remove event listeners for menu cleanup and language change
     */
    removeEventListeners() {
        window.removeEventListener('unload', this._cleanupSubmenusHandler);
        document.removeEventListener('menu:closeAll', this._closeAllHandler);
        document.removeEventListener('language:changed', this._languageChangedHandler);
    }
}
