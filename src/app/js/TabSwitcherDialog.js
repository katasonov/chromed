// TabSwitcherDialog.js
// Handles the Alt+Up/Down tab switcher dialog logic

class TabSwitcherDialog {
    constructor(editor) {
        this.editor = editor;
        this.dialog = null;
        this.tabs = null;
        this.selectedIdx = null;
        this.keyHandler = null;
        this.keyUpHandler = null;
    }

    show(initialDirection = 'down') {
        if (this.dialog) {
            this.dialog.focus();
            return;
        }
        // Gather tabs ordered by activationTimestamp desc
        const tabs = Array.from(this.editor.tabs.values())
            .sort((a, b) => b.activationTimestamp - a.activationTimestamp);
        if (tabs.length < 2) return;

        // Use template from DOM
        const template = document.getElementById('tab-switcher-dialog-template');
        if (!template) return;
        const dialog = template.cloneNode(true);
        dialog.id = '';
        dialog.style.display = '';
        dialog.tabIndex = -1;

        const list = dialog.querySelector('ul');
        list.innerHTML = '';

        let selectedIdx = 0;
        const activeTab = this.editor.getActiveTab();
        if (activeTab) {
            selectedIdx = tabs.findIndex(t => t.id === activeTab.id);
        }
        if (initialDirection === 'down') {
            selectedIdx = (selectedIdx + 1) % tabs.length;
        } else if (initialDirection === 'up') {
            selectedIdx = (selectedIdx - 1 + tabs.length) % tabs.length;
        }

        tabs.forEach((tab, idx) => {
            const li = document.createElement('li');
            li.textContent = tab.getDisplayName();
            li.setAttribute('data-tab-id', tab.id);
            // Only one selected at a time
            if (idx === selectedIdx) li.classList.add('selected');
            // Only one active-tab at a time
            if (activeTab && tab.id === activeTab.id) li.classList.add('active-tab');
            list.appendChild(li);
    });

        document.body.appendChild(dialog);
        dialog.focus();
        this.dialog = dialog;
        this.tabs = tabs;
        this.selectedIdx = selectedIdx;

        // Scroll initially selected item into view if needed
        setTimeout(() => {
            const items = list.querySelectorAll('li');
            const selectedLi = items[selectedIdx];
            if (selectedLi) {
                selectedLi.scrollIntoView({block: 'nearest'});
            }
        }, 0);

        const updateSelection = (newIdx) => {
            const items = list.querySelectorAll('li');
            items.forEach((li, idx) => {
                // Remove 'selected' from all, add only to the new selection
                if (li.classList.contains('selected')) li.classList.remove('selected');
                if (idx === newIdx) li.classList.add('selected');
            });
            this.selectedIdx = newIdx;

            // Scroll selected item into view if needed
            const selectedLi = items[newIdx];
            if (selectedLi) {
                const listRect = list.getBoundingClientRect();
                const liRect = selectedLi.getBoundingClientRect();
                if (liRect.top < listRect.top) {
                    // Above visible area
                    list.scrollTop -= (listRect.top - liRect.top);
                } else if (liRect.bottom > listRect.bottom) {
                    // Below visible area
                    list.scrollTop += (liRect.bottom - listRect.bottom);
                }
            }
        };

        this.keyHandler = (e) => {
            if (!e.altKey) {
                e.preventDefault();
                e.stopPropagation();
                this.activateSelection();
                return;
            }
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                let idx = (this.selectedIdx + 1) % tabs.length;
                updateSelection(idx);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                let idx = (this.selectedIdx - 1 + tabs.length) % tabs.length;
                updateSelection(idx);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                this.activateSelection();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                this.close();
            }
        };
        window.addEventListener('keydown', this.keyHandler, true);
        this.keyUpHandler = (e) => {
            if (!e.altKey) {
                this.activateSelection();
            }
        };
        window.addEventListener('keyup', this.keyUpHandler, true);
    }

    activateSelection() {
        if (!this.dialog) return;
        const idx = this.selectedIdx;
        const tab = this.tabs[idx];
        if (tab) {
            this.editor.switchToTab(tab.id);
        }
        this.close();
    }

    close() {
        if (this.dialog) {
            document.body.removeChild(this.dialog);
            this.dialog = null;
            this.tabs = null;
            this.selectedIdx = null;
            window.removeEventListener('keydown', this.keyHandler, true);
            window.removeEventListener('keyup', this.keyUpHandler, true);
        }
    }
}

// Export for use in NotepadPlusEditor
window.TabSwitcherDialog = TabSwitcherDialog;
