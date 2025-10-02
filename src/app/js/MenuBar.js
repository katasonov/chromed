// MenuBar.js - Minimal menu bar for FileMenu using ContextMenuDropdown
// Assumes FileMenu is imported or available in scope

class MenuBar {
    constructor(editor) {
        this.editor = editor;
        this.menus = [];
        this.element = null;
        this.setupMenus();
        this.setupEventListeners();
        this.buttons = {};
    }

    /**
     * Returns the menu bar DOM element, creating it if necessary
     */
    getElement() {
        if (!this.element) {
            this.createElement();
        }
        return this.element;
    }

    setupMenus() {
        // Add FileMenu and EditMenu (both using ContextMenuDropdown)
        const onLeftArrowPressed = (menu) => {
            let prevMenuIndex = this.menus.findIndex(m => m.id === menu.id) - 1;
            if (prevMenuIndex < 0) prevMenuIndex = this.menus.length - 1;
            console.debug(`Prev menu index: ${prevMenuIndex}`);
            const prevMenu = this.menus[prevMenuIndex];
            if (!prevMenu) return;
            console.debug(`Left arrow pressed in ${menu.id}, activating ${prevMenu.id}`);
            this.activateButton(this.buttons[prevMenu.id]);
        }

        const onRightArrowPressed = (menu) => {
            let nextMenuIndex = this.menus.findIndex(m => m.id === menu.id) + 1;
            if (nextMenuIndex >= this.menus.length) nextMenuIndex = 0;
            console.debug(`Next menu index: ${nextMenuIndex}`);
            const nextMenu = this.menus[nextMenuIndex];
            if (!nextMenu) return;
            console.debug(`Right arrow pressed in ${menu.id}, activating ${nextMenu.id}`);
            this.activateButton(this.buttons[nextMenu.id]);
        }

        const onHide = () => {
            console.debug('[MenuBar] Menu hidden, focusing active tab');
            this.clearMenuBarSelection();
            this.editor.focusActiveTab();
        }

        this.addMenu(new FileMenu({editor: this.editor, id: 'file-menu', onLeftArrowPressed, onRightArrowPressed, onHide}));
        this.addMenu(new EditMenu({editor: this.editor, id: 'edit-menu', onLeftArrowPressed, onRightArrowPressed, onHide}));
        this.addMenu(new SearchMenu({editor: this.editor, id: 'search-menu', onLeftArrowPressed, onRightArrowPressed, onHide}));
        this.addMenu(new ViewMenu({editor: this.editor, id: 'view-menu', onLeftArrowPressed, onRightArrowPressed, onHide}));
        this.addMenu(new LanguagesMenu({editor: this.editor, id: 'languages-menu', onLeftArrowPressed, onRightArrowPressed, onHide}));
        this.addMenu(new HelpMenu({editor: this.editor, id: 'help-menu', onLeftArrowPressed, onRightArrowPressed, onHide}));
    }

    activateButton(btn) {
        console.debug(`Activating menu button ${btn.textContent}`);
        if (!btn) return;

        this.openButton(btn);
    }

    addMenu(menu) {
        this.menus.push(menu);
        if (this.element) {
            this.element.appendChild(this.createMenuButton(menu));
        }
        return this;
    }

    createElement() {
        this.element = document.createElement('div');
        this.element.className = 'menu-bar'; // Use old design class
        this.element.style.justifyContent = 'flex-start'; // Left align
        this.element.style.display = 'flex';
        this.element.style.alignItems = 'center';
        // Add all menus as buttons
        this.menus.forEach(menu => {
            this.element.appendChild(this.createMenuButton(menu));
        });


        return this.element;
    }

    createMenuButton(menu) {
        const btn = document.createElement('div');
        let label = menu.constructor.label || 'Menu';
        // Always underscore the first character visually
        const plainLabel = label.replace(/<.*?>/g, '');
        btn.innerHTML = `<span style="text-decoration:underline">${plainLabel.charAt(0)}</span>${plainLabel.slice(1)}`;
        btn.className = `menu-item menu-${plainLabel.toLowerCase()}-item`;

        // Highlight selected menu item
        btn.addEventListener('mousedown', () => {
            this.clearMenuBarSelection();
            btn.classList.add('active');
        });
        btn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                this.clearMenuBarSelection();
                btn.classList.add('active');
            }
        });

        btn.onclick = (e) => {
            e.stopPropagation();
            this.openButton(btn);
        };

        // Mouseover: close other menus and open this one
        btn.addEventListener('mouseover', (e) => {
            //check whether we have any opened menu
            const hasOpenedMenu = this.buttons && Object.values(this.buttons).some(b => b.classList.contains('active'));
            if (!hasOpenedMenu) return;

            // Only open if not already open
            if (!btn.classList.contains('active')) {
                // Emit menu:closeAll to close other menus
                document.dispatchEvent(new CustomEvent('menu:closeAll'));
                this.clearMenuBarSelection();
                btn.classList.add('active');
                const rect = btn.getBoundingClientRect();
                menu.show(rect.left, rect.bottom);
            }
        });

        this.buttons[menu.id] = btn;
        return btn;
    }

    openButton(btn) {
        console.debug(`Menu button ${btn.textContent} clicked`);
        //deactivate other buttons
        this.buttons && Object.values(this.buttons).forEach(b => b.classList.remove('active'));
        //close all menus
        document.dispatchEvent(new CustomEvent('menu:closeAll'));
        const menu = this.getMenu(this.getMenuIdByButton(btn));
        btn.classList.add('active');
        const rect = btn.getBoundingClientRect();
        menu.show(rect.left, rect.bottom);
    }

    getMenuIdByButton(btn) {
        return Object.keys(this.buttons).find(key => this.buttons[key] === btn);
    }

    clearMenuBarSelection() {
        if (!this.element) return;
        const items = this.element.querySelectorAll('.menu-item');
        items.forEach(item => item.classList.remove('active'));
    }

    setupEventListeners() {
        document.addEventListener('menu:closeAll', () => {
            this.closeAllMenus();
        });
        document.addEventListener('editor:stateChanged', () => {
            this.updateMenuStates();
        });
    }

    closeAllMenus() {
        this.menus.forEach(menu => menu.hide && menu.hide());
    }

    updateMenuStates() {
        this.menus.forEach(menu => {
            if (typeof menu.updateMenuState === 'function') {
                menu.updateMenuState();
            }
        });
    }

    getMenu(id) {
        return this.menus.find(menu => menu.id === id);
    }

    removeMenu(id) {
        const index = this.menus.findIndex(menu => menu.id === id);
        if (index !== -1) {
            const menu = this.menus[index];
            if (menu.items && Array.isArray(menu.items)) {
                menu.items.forEach(item => item.release());
            }
            this.menus.splice(index, 1);
        }
    }

    notifyStateChanged() {
        document.dispatchEvent(new CustomEvent('editor:stateChanged'));
    }

    openFileMenu() {
        this.openButton(this.buttons['file-menu']);
    }
    openEditMenu() {
        this.openButton(this.buttons['edit-menu']);
    }

    openViewMenu() {
        this.openButton(this.buttons['view-menu']);
    }

    openLanguagesMenu() {
        this.openButton(this.buttons['languages-menu']);
    }

    openSearchMenu() {
        this.openButton(this.buttons['search-menu']);
    }
}

// Export if using modules
// export default MenuBar2;
