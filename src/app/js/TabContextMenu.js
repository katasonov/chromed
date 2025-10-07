// TabContextMenu.js
// Context menu for Tab, currently with one item: Close


class TabContextMenu extends ContextMenuDropdown {
    constructor(editor) {
        const moveSubItems = [];
        moveSubItems.push(new MenuItem('move-left', 'Left', () => this._moveTab('left')));
        moveSubItems.push(new MenuItem('move-right', 'Right', () => this._moveTab('right')));
        moveSubItems.push(new MenuItem('move-begin', 'Begin', () => this._moveTab('begin')));
        moveSubItems.push(new MenuItem('move-end', 'End', () => this._moveTab('end')));

        const contextMenuDropdown = new ContextMenuDropdown({
            id: 'tab-move-submenu', 
            items: moveSubItems,
            // onHide: () => { this.hide(); }
        });

        const items = [];
        items.push(new MenuItem(
            'tab-rename',
            'Rename',
            () => {
                if (this.editor && typeof this.editor.renameTab === 'function') {
                    this.editor.activeTabId = this.tabId;
                    this.editor.renameTab();
                    this.hide();
                }
            }
        ));        
        items.push(new MenuItem(
            'tab-save',
            'Save',
            () => {
                if (this.editor && typeof this.editor.saveFile === 'function') {
                    this.editor.activeTabId = this.tabId;
                    this.editor.saveFile();
                    this.hide();
                }
            }
        ));
        // Save As
        items.push(new MenuItem(
            'tab-saveas',
            'Save As...',
            () => {
                if (this.editor && typeof this.editor.saveAsFile === 'function') {
                    this.editor.activeTabId = this.tabId;
                    this.editor.saveAsFile();
                    this.hide();
                }
            }
        ));
        // Reload
        items.push(new MenuItem(
            'tab-reload',
            'Reload',
            () => {
                if (this.editor && typeof this.editor.reload === 'function') {
                    this.editor.activeTabId = this.tabId;
                    this.editor.reload();
                    this.hide();
                }
            }
        ));
        // Close
        items.push(new MenuItem(
            'tab-close',
            'Close',
            () => {
                this._closeTab();
                this.hide();
            }
        ));
        // Move submenu
        items.push(new ExpandableMenuItem({
            id: 'tab-move',
            text: 'Move',
            contextMenuDropdown: contextMenuDropdown
        }));



        super({id: 'tab-context-menu', items: items, onHide: () => {
            this.tabTarget = null;
            this.tabId = null;
        }});
        this.editor = editor;
        this.tabId = null;
    }


    _moveTab(direction) {
        console.log('[TabContextMenu] move tab', direction);
        if (window.editor && typeof window.editor.moveTab === 'function') {
            window.editor.moveTab(this.tabId, direction);
        }
        this.hide();
    }

    show(x, y, tabId) {
        super.show(x, y);
        this.tabId = tabId;
    }


    _closeTab() {
        if (!this.editor) return;
        this.editor.closeTab(this.tabId);
    }
}

