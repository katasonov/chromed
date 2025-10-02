// LanguageSubmenu.js - Submenu for languages, extends ContextMenuDropdown
// Assumes ContextMenuDropdown and MenuItem are imported or available in scope

class LanguageSubmenu extends ContextMenuDropdown {
    /**
     * @param {object} opts
     * @param {object} opts.editor - Editor instance
     * @param {Array<{mimeType: string, displayName: string}>} opts.languages - Array of language objects
     * @param {string} [opts.id] - Optional submenu id
     * @param {function} [opts.onHide] - Optional hide callback
     */
    constructor({editor, languages, id = '', onHide = null} = {}) {
        // Helper to wrap handlers so they close the menu first
        const wrapHandler = (fn) => () => {
            this.hide();
            fn();
        };
        // Build menu items for each language
        const menuItems = languages.map(lang => {
            return new MenuItem(
                `lang-${lang.mimeType}`,
                lang.displayName,
                wrapHandler(() => {
                    editor.handleAction('set-language', {
                        mode: lang.mimeType,
                        displayName: lang.displayName,
                        id: lang.mimeType
                    });
                }),
                null
            );
        });
        super({id, items: menuItems, onHide});
        this.editor = editor;
        this.languages = languages;
    }
}

// Export if using modules
// export default LanguageSubmenu;
