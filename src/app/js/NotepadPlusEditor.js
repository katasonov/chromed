// NotepadPlusEditor.js - Updated main editor class with new menu architecture
class NotepadPlusEditor {
    // Show tab switcher dialog (Alt+Up/Down)
    showTabSwitcherDialog(initialDirection = 'down') {
        if (!this._tabSwitcherDialogInstance) {
            this._tabSwitcherDialogInstance = new window.TabSwitcherDialog(this);
        }
        this._tabSwitcherDialogInstance.show(initialDirection);
    }

    constructor() {
        this.tabs = new Map(); // Map<string, Tab>
        this.activeTabId = null;
        this.usedCounters = new Set();
        this.fileHandles = new Map(); // Map<string, FileSystemFileHandle>
        this.menuBar = null;
        this.autoSaveInterval = null;
        this.stateIsDirty = true; // Start with dirty state
        this.saveInProgress = false; // Flag to prevent concurrent saves
        this.lastSaveTime = 0; // Track when the last save operation started
        this.pendingFileChangeDialogs = new Set(); // Track files with active change dialogs
        this.searchDialog = null; // Will be initialized in init method
        this.shortcutManager = null; // Will be initialized in setupShortcutManager
        this.wordWrap = false; // Default word wrap state
        this.lineNumbers = true; // Default line numbers state
        this.init();
    }

    async init() {
        console.debug(`[NotepadPlusEditor] init started at ${new Date().toISOString()}`);
        // Set up shortcut manager first, before anything else
        this.setupShortcutManager();
        
        // Initialize SearchDialog2 with a reference to this editor
        this.searchDialog = new SearchDialog2(this);
        
        // Now set up other components
        this.tabContextMenu = new TabContextMenu(this); // Pass reference to this editor
        this.setupMenuBar();
        this.setupEventListeners();
        await this.loadStateFromStorage();
        
        // No need to register menu shortcuts here anymore
        // Each menu item will register its own shortcut
        
        // Set up cleanup on window unload
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });

        // Listen for language changes to update the selected item
        document.addEventListener('language:changed', (e) => {
            // Update the text of the menu item with id 'file-type'
            console.debug(`[NotepadPlusEditor] Language changed event received: ${e.detail.language}`);
            const fileTypeItem = document.querySelector('#file-type');
            fileTypeItem.textContent = e.detail.language;
        });

        this.notifyStateChanged(); // Update menu states

        // Show nostalgic hint dialog on startup (if user wants it)
        if (window.HintDialog && typeof window.HintDialog.showOnStartup === 'function') {
            try {
                await window.HintDialog.showOnStartup({ delay: 500 });
            } catch (error) {
                console.warn('[NotepadPlusEditor] Failed to show HintDialog:', error);
            }
        }

        //Block codemirrors default Ctrl+Shift+F search
        document.addEventListener('keydown', function(e) {
            if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'f') {
                e.preventDefault();
                e.stopPropagation();
            }
        }, true); // Use capture phase to block before CodeMirror        

        // Listen for custom status events
        document.addEventListener('editor:status', (e) => {
            if (e && e.detail && e.detail.message) {
                this.showStatus(e.detail.message, e.detail.type || 'info');
            }
        });
    }
    
    // Clean up resources
    cleanup() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
        }
        
        // Clean up global shortcutManager reference
        if (window.shortcutManager === this.shortcutManager) {
            window.shortcutManager = null;
        }
    }

    setupMenuBar() {
        // Create menu bar using Menu2 (FileMenu only)
        this.menuBar = new MenuBar(this);
        // Replace the existing menu bar in the DOM
        const existingMenuBar = document.querySelector('.menu-bar');
        if (existingMenuBar) {
            existingMenuBar.parentNode.replaceChild(this.menuBar.getElement(), existingMenuBar);
        } else {
            // If no existing menu bar, insert at the top of container
            const container = document.querySelector('.container');
            if (container) {
                container.insertBefore(this.menuBar.getElement(), container.firstChild);
            }
        }
    }
    
    setupShortcutManager() {
        // Initialize ShortcutManager
        this.shortcutManager = new ShortcutManager(this);

        // Make the shortcutManager available globally through the window object
        window.shortcutManager = this.shortcutManager;

        // Register Alt+F to open File menu
        this.shortcutManager.register('alt+f', () => {
            this.menuBar.openFileMenu();
        }, 'custom');

        this.shortcutManager.register('alt+e', () => {
            this.menuBar.openEditMenu();
        }, 'custom');
        this.shortcutManager.register('alt+s', () => {
            this.menuBar.openSearchMenu();
        }, 'custom');
        this.shortcutManager.register('alt+v', () => {
            this.menuBar.openViewMenu();
        }, 'custom');
        this.shortcutManager.register('alt+l', () => {
            this.menuBar.openLanguagesMenu();
        }, 'custom');
        this.shortcutManager.register('F1', () => {
            window.open('shortcuts.html', '_blank');
        }, 'custom');


        // Note: The Escape key handler is registered in ShortcutManager.registerNonMenuShortcuts
        // which calls our handleEscapeKey method automatically
    }

    focusActiveTab() {
        console.debug('[NotepadPlusEditor] Focusing active tab editor');
        this.handleEscapeKey(); // This will focus the active tab's editor
    }
    
    /**
     * Centralized handler for Escape key presses
     * This can be used to close dialogs, cancel operations, etc.
     * @returns {boolean} True if the Escape key was handled, false otherwise
     */
    handleEscapeKey() {
        console.log('[NotepadPlusEditor] Handling global Escape key press');
        
        // Try to close search dialog first if it's visible
        const searchDialog = this.searchDialog;
        if (searchDialog && searchDialog.isVisible()) {
            console.log('[NotepadPlusEditor] Closing search dialog via Escape');
            searchDialog.hide();
            return true;
        }        
       
        // Add more handlers for other UI elements that should respond to Escape
        
        // If no specific handler was triggered, focus the active editor
        const activeTab = this.getActiveTab();
        if (activeTab) {
            const editor = activeTab.getEditor();
            if (editor) {
                editor.focus();
                return true;
            }
        }
        
        return false; // Not handled
    }

    setupEventListeners() {
        // Remove old menu dropdown event listeners since they're now handled by the menu system
        
        // Toolbar button handlers (keep existing functionality)
        document.addEventListener('click', function (e) {
            const button = e.target.closest('.toolbar-button');
            if (button && button.hasAttribute('data-action')) {
                console.debug(`[NotepadPlusEditor] Toolbar button click:`, button);
                const action = button.getAttribute('data-action');
                this.handleAction(action);
            }
        }.bind(this));

        // File input change (fallback)
        document.getElementById('file-input').addEventListener('change', function (e) {
            this.handleFileInputOpen(e);
        }.bind(this));
        
        // Auto-save configuration
        const AUTO_SAVE_CHECK_INTERVAL = 5000; // Check for changes every 5 seconds
        const MIN_SAVE_INTERVAL = 4000; // Minimum time between actual save operations
        
        // File change detection interval (check every 10 seconds)
        const FILE_CHANGE_CHECK_INTERVAL = 10000;
        
        // Set up file change detection
        setInterval(() => {
            this.checkForExternalChanges();
        }, FILE_CHANGE_CHECK_INTERVAL);

        // Auto-save state when content changes - this is the only place that calls saveStateToStorage
        this.autoSaveInterval = setInterval(() => {
            // Check if minimum time between saves has elapsed
            const currentTime = Date.now();
            const timeSinceLastSave = currentTime - this.lastSaveTime;
            if (timeSinceLastSave < MIN_SAVE_INTERVAL) {
                console.log(`Too soon to save again (${timeSinceLastSave}ms since last save), skipping`);
                return;
            }
            
            // Only save if there are dirty tabs
            const hasDirtyTabs = Array.from(this.tabs.values()).some(tab => tab.isDirty());
            if (hasDirtyTabs || this.stateIsDirty) {
                this.lastSaveTime = currentTime; // Update the last save time
                this.saveStateToStorage();
                this.stateIsDirty = false; // Reset dirty flag after starting save
            }
        }, AUTO_SAVE_CHECK_INTERVAL);
    }

    // Centralized action handler - now used by both menu system and toolbar
    async handleAction(action) {
    // console.debug(`handleAction called with action: ${action}`);
        
        switch(action) {
            case 'new':
                this.createNewFile();
                break;
            case 'open':
                this.openFile();
                break;
            case 'open-gdrive':
                this.openGDriveFile();
                break;
            case 'save':
                this.saveFile();
                break;
            case 'rename':
                await this.renameTab();
                break;
            case 'saveas':
                this.saveAsFile();
                break;
            case 'reload':
                this.reload();
                break;
            case 'close':
                this.closeCurrentFile();
                break;
            case 'undo':
                this.undo();
                break;
            case 'redo':
                this.redo();
                break;
            case 'cut':
                this.getActiveTab().cut();
                break;
            case 'copy':
                this.getActiveTab().copy();
                break;
            case 'paste':
                this.paste();
                break;
            case 'select-all':
                this.selectAll();
                break;
            case 'find':
                this.find();
                break;
            case 'findNext':
                this.findNext();
                break;
            case 'findPrevious':
                this.findPrevious();
                break;
            case 'toggleSearchMode':
                this.toggleSearchMode();
                break;
            case 'replace':
                this.replace();
                break;
            case 'clearSearch':                
                this.clearSearch(); // Add this new case
                break;
            case 'zoom-in':
                this.zoomIn();
                break;
            case 'zoom-out':
                this.zoomOut();
                break;
            case 'zoom-reset':
                this.zoomReset();
                break;
            case 'toggle-line-numbers':
                this.toggleLineNumbers();
                break;
            case 'toggle-word-wrap':
                this.toggleWordWrap();
                break;
            case 'fullscreen':
                this.toggleFullscreen();
                break;
            case 'set-language':
                const languageArg = arguments[1]; // Get the language argument
                let languageConfig;
                
                // Handle both string and object inputs for backward compatibility
                if (typeof languageArg === 'string') {
                    // Convert string mode to object
                    languageConfig = {
                        mode: languageArg,
                        displayName: languageArg,
                        id: languageArg
                    };
                } else {
                    // Use object as is
                    languageConfig = languageArg;
                }
                
                this.setLanguage(languageConfig);
                break;
            default:
                console.warn('Unknown action:', action);
        }
        
        // Notify menu system of state changes
        this.notifyStateChanged();
    }

    // File operations (existing methods)
    createNewFile() {
        const counter = this.getNextCounter();
        const file = FileFactory.createTemporaryFile(counter);
        const tabId = this.generateTabId();
        
        this.createTab(tabId, file);
        this.switchToTab(tabId);
    }

    async openGDriveFile() {
        if (!GDriveFile.isSupported()) {
            this.showStatus('Google Drive API not available', 'error');
            console.error('Google Drive API not available');
            return;
        }
        
        try {
            const files = await GDriveFile.openFiles();
            
            for (const file of files) {
                // Use the new method to open or activate file
                this.openOrActivateFile(file);
            }
            
            this.markStateAsDirty(); // Mark state as dirty instead of calling saveStateToStorage directly
            console.info(`Opened ${files.length} Google Drive file(s)`);
        } catch (error) {
            console.error('Error opening Google Drive file:', error);
            this.showStatus(`Error opening Google Drive file: ${error.message}`, 'error');
        }
    }

    // Edit operations (new methods)
    undo() {
        const activeTab = this.getActiveTab();
        if (activeTab && typeof activeTab.undo === 'function') {
            activeTab.undo();
        }
    }

    redo() {
        const activeTab = this.getActiveTab();
        if (activeTab && typeof activeTab.redo === 'function') {
            activeTab.redo();
        }
    }

   async paste() {
        const activeTab = this.getActiveTab();
        if (activeTab) {
            try {
                const text = await navigator.clipboard.readText();
                activeTab.getEditor().replaceSelection(text);
            } catch (error) {
                console.error('Failed to paste:', error);
            }
        }
    }

    selectAll() {
        const activeTab = this.getActiveTab();
        if (activeTab && typeof activeTab.selectAll === 'function') {
            activeTab.selectAll();
        }
    }

    find() {
        // Always switch to search-only mode before showing
        if (this.searchDialog) {
            this.searchDialog.setReplaceMode(false);
            this.searchDialog.show();
        }
    }
    
    findNext() {
        console.debug(`[NotepadPlusEditor] findNext`);

        // Use the already initialized SearchDialog2
        // If dialog is visible, use it
        if (this.searchDialog.isVisible()) {
            this.searchDialog.findNext();
        } 
        // Otherwise, show dialog with last query
        else if (this.searchDialog.lastQuery) {
            this.searchDialog.show(this.searchDialog.lastQuery);
            this.searchDialog.findNext();
        }
        // If no lastQuery, just show empty dialog
        else {
            this.searchDialog.show();
        }
        

    }
            
    // Toggle between search modes
    toggleSearchMode() {

    }
    
    findPrevious() {
        // Use the already initialized SearchDialog2
        // If dialog is visible, use it
        if (this.searchDialog.isVisible()) {
            this.searchDialog.findPrev();
        } 
        // Otherwise, show dialog with last query
        else if (this.searchDialog.lastQuery) {
            this.searchDialog.show(this.searchDialog.lastQuery);
            this.searchDialog.findPrev();
        }
        // If no lastQuery, just show empty dialog
        else {
            this.searchDialog.show();
        }
        
         
    }
    
    replace() {
        // Show the search dialog in replace mode
        if (this.searchDialog) {
            this.searchDialog.setReplaceMode(true);
            this.searchDialog.show();
        }
    }
    
    // Clear search highlights and dialogs
    clearSearch() {
        console.log('[NotepadPlusEditor] Clearing search highlights and dialogs');
        
        // Use SearchDialog2 to clear search
        this.searchDialog.clearSearch();
        if (this.searchDialog.isVisible()) {
            this.searchDialog.hide();
        }

        // Show status message
        console.info('Search cleared');
    }

    // View operations (new methods)
    zoomIn() {
        if (window.chrome && chrome.runtime && chrome.runtime.sendMessage) {
            chrome.runtime.sendMessage({ type: 'zoom-in' });
        } else {
            document.body.style.zoom = (parseFloat(document.body.style.zoom || 1) + 0.1).toString();
        }
    }

    zoomOut() {
        if (window.chrome && chrome.runtime && chrome.runtime.sendMessage) {
            chrome.runtime.sendMessage({ type: 'zoom-out' });
        } else {
            const currentZoom = parseFloat(document.body.style.zoom || 1);
            if (currentZoom > 0.5) {
                document.body.style.zoom = (currentZoom - 0.1).toString();
            }
        }
    }

    zoomReset() {
        if (window.chrome && chrome.runtime && chrome.runtime.sendMessage) {
            chrome.runtime.sendMessage({ type: 'zoom-reset' });
        } else {
            document.body.style.zoom = "1";
        }
    }

    toggleLineNumbers() {
        this.lineNumbers = !this.lineNumbers;
        for (const tab of this.tabs.values()) {
            const editor = tab.getEditor();
            editor.setOption('lineNumbers', this.lineNumbers);
        }
        this.notifyStateChanged();
    }

    toggleWordWrap() {
        this.wordWrap = !this.wordWrap;
        for (const tab of this.tabs.values()) {
            const editor = tab.getEditor();
            editor.setOption('lineWrapping', this.wordWrap);
        }
        this.notifyStateChanged();
    }

    toggleFullscreen() {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            document.documentElement.requestFullscreen();
        }
    }

    // Create tab with file
    createTab(tabId, file) {
        // Pass cursorPosition as null to Tab constructor
        const tab = new Tab(
            tabId,
            file,
            (tab) => this.onTabContentChange(tab),
            (tab) => this.onTabClose(tab),
            null, // cursorPosition
            (tab, cm, event) => this.handleEditorMouseDown(tab, cm, event) // mousedown callback
        );
        this.tabs.set(tabId, tab);
        tab.setOption('lineNumbers', this.lineNumbers);
        tab.setOption('lineWrapping', this.wordWrap);
        
        return tab;
    }

    // Switch to specific tab
    switchToTab(tabId) {
        console.log(`[NotepadPlusEditor] Switching to tab: ${tabId}, current activeTabId: ${this.activeTabId}`);
        
       
        // Note: We no longer hide the search dialog when switching tabs
        // This preserves search state across all tabs

        // Prevent unnecessary work if already on this tab
        if (this.activeTabId === tabId) {
            console.log(`[NotepadPlusEditor] Tab ${tabId} is already active, no action needed`);
            return;
        }
        // Deactivate all tabs (let the editor handle this instead of each tab)
        for (const [id, tab] of this.tabs) {
            if (id !== tabId) {
                tab.deactivate();
            }
        }
        // Update activeTabId before activating the tab
        this.activeTabId = tabId;
        // Activate new tab if it exists
        if (this.tabs.has(tabId)) {
            const tab = this.tabs.get(tabId);
            console.log(`[NotepadPlusEditor] Activating new tab: ${tabId}, File: ${tab.getFile().getFileName()}`);
            // Scroll the tab element into view in the tab bar
            if (tab.element && typeof tab.element.scrollIntoView === 'function') {
                tab.element.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
            tab.activate();

            this.notifyStateChanged(); // Update menu states when switching tabs
            console.log(`[NotepadPlusEditor::switchToTab] Updated activeTabId to: ${this.activeTabId}`);
        } else {
            console.warn(`[NotepadPlusEditor::switchToTab] Tab not found: ${tabId}`);
        }
    }

    // Open file(s)
    async openFile() {
        if (LocalFile.isSupported()) {
            await this.openFileWithFSA();
        } else {
            // Fallback to traditional file input
            document.getElementById('file-input').click();
        }
    }

    // Open files using File System Access API
    async openFileWithFSA() {
        try {
            const files = await LocalFile.openFiles();
            
            for (const file of files) {
                // Use the new method to open or activate file
                this.openOrActivateFile(file);
            }
            
            // Mark state as dirty to persist file handles in the next auto-save
            this.markStateAsDirty();
            console.info(`Opened ${files.length} file(s)`);
        } catch (error) {
            console.error('Error opening file:', error);
            this.showStatus(`Error opening file: ${error.message}`, 'error');
        }
    }

    // Handle traditional file input (fallback)
    handleFileInputOpen(event) {
        const files = event.target.files;
        for (let fileData of files) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const file = new LocalFile(fileData.name, e.target.result, fileData.name);
                
                // Use the new method to open or activate file
                this.openOrActivateFile(file);
                this.notifyStateChanged();
            };
            reader.readAsText(fileData);
        }
        event.target.value = ''; // Reset input
    }
    
    async renameTab() {
        if (!this.activeTabId || !this.tabs.has(this.activeTabId)) {
            console.warn(`[NotepadPlusEditor::renameTab] No active tab or tab not found`);
            return;
        }
        const tab = this.tabs.get(this.activeTabId);
        const newName = prompt("Enter new tab name:", tab.getName());
        if (newName) {
            await tab.setName(newName);
            this.notifyStateChanged();
        }
    }

    // Save current file
    async saveFile() {
        console.debug(`saveFile method started at ${new Date().toISOString()}`);
        console.debug(`Active tab ID: ${this.activeTabId}`);
        
        if (!this.activeTabId || !this.tabs.has(this.activeTabId)) {
            console.warn(`[DEBUG] No active tab or tab not found`);
            return;
        }
        
        try {
            let tab = this.tabs.get(this.activeTabId);
            console.debug(`Calling tab.save() at ${new Date().toISOString()}`);
            const success = await tab.save();
            console.debug(`tab.save() returned: ${success !== false ? 'success' : 'failure'}`);
            
            if (success !== false) {
                // Update file handle for persistence
                const file = tab.getFile();
                if (file.hasFileHandle && file.hasFileHandle()) {
                    this.fileHandles.set(this.activeTabId, file.getFileHandle());
                }                
                tab.dirty = true; // Mark tab as dirty to ensure it gets saved to storage       
                this.markStateAsDirty(); // Mark state as dirty for auto-save
            }
        } catch (error) {
            console.error(` Error in saveFile:`, error);
            console.error(` Error type: ${error.constructor.name}, message: ${error.message}`);
            console.error(` Error stack:`, error.stack);
            
            this.showStatus(`Error saving file: ${error.message}`, 'error');           
        }
    }

    // Save current file as
    async saveAsFile() {
        if (!this.activeTabId || !this.tabs.has(this.activeTabId)) {
            return;
        }

        const tab = this.tabs.get(this.activeTabId);
        
        try {
            const success = await tab.saveAs();
            if (success !== false) {
                // Update file handle for persistence
                const file = tab.getFile();
                if (file.hasFileHandle()) {
                    this.fileHandles.set(this.activeTabId, file.getFileHandle());
                }
                
                //this.showStatus('File saved successfully!', 'success');
                // Mark tab as dirty to ensure it gets saved to storage
                // File content is saved to disk, but we need to update storage
                tab.dirty = true;
                this.markStateAsDirty(); // Mark state as dirty for auto-save
            }
        } catch (error) {
            console.error('Error saving file:', error);
            this.showStatus(`Error saving file: ${error.message}`, 'error');
        }
    }

    // Reload current file using file.load()
    async reload() {
        console.log(`[NotepadPlusEditor::reload] Active tab ID: ${this.activeTabId}`);
        if (!this.activeTabId || !this.tabs.has(this.activeTabId)) {
            console.warn(`[NotepadPlusEditor::reload] No active tab or tab not found`);
            return;
        }
        const tab = this.tabs.get(this.activeTabId);
        const file = tab.getFile();
        console.log(`[NotepadPlusEditor::reload] Found tab: ${tab.getId()}, File: ${file.getFileName()}, Active: ${tab.isActive()}`);
        try {
            await file.load();
            tab.reloadContent();
            console.info('File reloaded successfully!');
        } catch (error) {
            console.error('Error reloading file:', error);
            this.showStatus(`Error reloading file: ${error.message}`, 'error');
        }
    }

    // Close current file
    closeCurrentFile() {
        if (this.activeTabId && this.tabs.has(this.activeTabId)) {
            const tab = this.tabs.get(this.activeTabId);
            tab.close();
        }
    }

    // Tab event handlers
    onTabContentChange(tab) {
        // Tab handles its own cursor position update. Only notify menu system.
        this.notifyStateChanged(); // Update menu states when content changes
    }

    async onTabClose(tab) {
        const tabId = tab.getId();
        console.log(`Closing tab: ${tabId} (${tab.getName()})`);
        
        // Remove from collections
        this.tabs.delete(tabId);
        this.fileHandles.delete(tabId);
        
        // Remove from storage
        await this.removeTabFromStorage(tabId);
        
        // Clean up counter if it's a "New X" file
        const fileName = tab.getName();
        if (fileName.startsWith('New ')) {
            const counter = parseInt(fileName.split(' ')[1]);
            if (!isNaN(counter)) {
                this.usedCounters.delete(counter);
            }
        }

        // Switch to another tab or create new one
        const remainingTabIds = Array.from(this.tabs.keys());
        if (remainingTabIds.length > 0) {
            if (this.activeTabId === tabId) {
                this.switchToTab(remainingTabIds[remainingTabIds.length - 1]);
            }
        } else {
            this.activeTabId = null;
            this.createNewFile();
        }

        // Mark state as dirty to ensure global state gets updated
        this.markStateAsDirty();
        this.notifyStateChanged();
    }
    
    // Remove a tab from storage
    async removeTabFromStorage(tabId) {
        try {
            console.log(`Removing tab ${tabId} from storage`);
            if (typeof CacheStorage !== 'undefined' && CacheStorage.removeTab) {
                await CacheStorage.removeTab(tabId);
            }
        } catch (error) {
            console.error(`Error removing tab ${tabId} from storage:`, error);
        }
    }

    // Notify menu system of state changes
    notifyStateChanged() {
        if (this.menuBar) {
            this.menuBar.notifyStateChanged();
        }
    }
    
    // Get the shortcut manager instance
    getShortcutManager() {
        return this.shortcutManager;
    }

    // Utility methods
    generateTabId() {
        return `tab-${Date.now()}-${Math.random()}`;
    }

    getNextCounter() {
        let counter = 1;
        while (this.usedCounters.has(counter)) {
            counter++;
        }
        this.usedCounters.add(counter);
        return counter;
    }

    // Helper method to mark state as dirty (to be saved by auto-save interval)
    markStateAsDirty() {
        this.stateIsDirty = true;
    }
    
    // Check all open files for external changes
    async checkForExternalChanges() {
        for (const [tabId, tab] of this.tabs) {
            const file = tab.getFile();
            
            // Only check for changes in local files with handles
            if (file instanceof LocalFile && file.hasFileHandle()) {
                try {
                    const hasChanged = await file.checkForExternalChanges();
                    
                    if (hasChanged && !this.pendingFileChangeDialogs.has(tabId)) {
                        this.pendingFileChangeDialogs.add(tabId);
                        this.showFileChangedDialog(tab);
                    }
                } catch (error) {
                    console.error(`Error checking for changes in ${file.getFileName()}:`, error);
                }
            }
        }
    }
    
    // Show dialog for file changed externally
    showFileChangedDialog(tab) {
        const file = tab.getFile();
        const fileName = file.getFileName();
        
        // Create a custom modal dialog
        const dialog = document.createElement('div');
        dialog.className = 'modal-dialog file-changed-dialog';
        dialog.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>File Changed</h3>
                </div>
                <div class="modal-body">
                    <p>The file "${fileName}" has been modified outside of the editor.</p>
                    <p>Do you want to reload it?</p>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-reload">Reload</button>
                    <button class="btn btn-keep">Keep Current Version</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        // Handle button clicks
        const reloadBtn = dialog.querySelector('.btn-reload');
        const keepBtn = dialog.querySelector('.btn-keep');
        
        reloadBtn.addEventListener('click', async () => {
            // Reload the file content using the new reload method
            try {
                await file.load();
                tab.reloadContent();
            } catch (error) {
                this.showStatus(`Error reloading file: ${error.message}`, 'error');
            }
            // Remove dialog
            dialog.remove();
            this.pendingFileChangeDialogs.delete(tab.getId());
        });
        
        keepBtn.addEventListener('click', () => {
            // Just close the dialog
            dialog.remove();
            this.pendingFileChangeDialogs.delete(tab.getId());
            
            // Mark the tab as modified since it now differs from the version on disk
            tab.markAsModified();
            
            // Update the lastModified timestamp to avoid showing the dialog again
            // AND ensure file handle is still valid
            if (file instanceof LocalFile && file.hasFileHandle()) {
                file.fileHandle.getFile().then(async f => {
                    file.lastModified = f.lastModified;
                    
                    // Verify handle is still valid by checking permissions
                    try {
                        const permission = await file.fileHandle.queryPermission({ mode: 'readwrite' });
                        
                        if (permission !== 'granted') {
                            // Request permission again to ensure future saves work
                            const newPermission = await file.fileHandle.requestPermission({ mode: 'readwrite' });
                            
                            if (newPermission !== 'granted') {
                                console.warn('File permission denied after external change, future saves may fail');
                            }
                        }
                    } catch (e) {
                        console.error('Error verifying file handle after external change:', e);
                    }
                }).catch(e => console.error('Error updating lastModified:', e));
            }
        });
    }

    // State persistence with exclusive execution
    async saveStateToStorage() {
        if (this.saveInProgress) {
            console.log('Save already in progress, skipping');
            return;
        }
        try {
            this.saveInProgress = true;
            console.log('Saving editor state...');
            const globalState = {
                version: "1.0",
                lastSaved: new Date().toISOString(),
                activeTabId: this.activeTabId,
                usedCounters: Array.from(this.usedCounters),
                lineNumbers: this.lineNumbers,
                wordWrap: this.wordWrap,
                tabIds: Array.from(this.tabs.keys())
            };
            // Only save dirty tabs
            const tabMap = {};
            for (const [tabId, tab] of this.tabs) {
                if (tab.isDirty()) {
                    console.log(`Saving tab ${tabId} (${tab.getFile().getFileName()}) - dirty/modified`);
                    const tabData = tab.serialize();
                    tabMap[`tab_${tabId}`] = tabData;
                    tab.clearDirtyFlag();
                }
            }
            await CacheStorage.save(globalState, tabMap, this.fileHandles);
            // Clean up orphaned tabs
            const validTabIds = Array.from(this.tabs.keys());
            await CacheStorage.removeOrphanedTabs(validTabIds);
            await CacheStorage.removeOrphanedFileHandles(validTabIds);
            console.log('Editor state saved successfully');
        } catch (error) {
            console.error('Error saving state:', error);
        } finally {
            this.saveInProgress = false;
        }
    }
    

    async loadStateFromStorage() {
        try {
            console.log('Loading editor state...');
            const globalState = await CacheStorage.loadGlobalState();
            if (globalState) {
                console.log('Loaded global state:', globalState);
                this.lineNumbers = globalState.lineNumbers !== undefined ? globalState.lineNumbers : true;
                this.wordWrap = globalState.wordWrap !== undefined ? globalState.wordWrap : false;
            }
            await this.loadFileHandles();
            if (globalState && globalState.tabIds && globalState.tabIds.length > 0) {
                console.log(`Found stored state with ${globalState.tabIds.length} tabs`);
                this.usedCounters = new Set(globalState.usedCounters || []);
                for (const tabId of globalState.tabIds) {
                    const tabData = await CacheStorage.loadTab(tabId);
                    if (tabData) {
                        this.restoreTab(tabId, tabData);
                    } else {
                        console.warn(`Missing tab data for tab ${tabId}`);
                    }
                }
                if (globalState.activeTabId && this.tabs.has(globalState.activeTabId)) {
                    this.switchToTab(globalState.activeTabId);
                } else if (this.tabs.size > 0) {
                    this.switchToTab(Array.from(this.tabs.keys())[0]);
                }
                console.log(`Successfully restored ${this.tabs.size} tabs`);
            } else {
                console.log('No saved state found or empty state, creating new file');
                this.createNewFile();
            }
        } catch (error) {
            console.error('Error loading state:', error);
            this.createNewFile();
        }
    }
    
    // Helper method to restore a tab from data
    restoreTab(tabId, tabData) {
        try {
            const tab = Tab.deserialize(
                tabData,
                (tab) => this.onTabContentChange(tab),
                (tab) => this.onTabClose(tab),
                (tab, cm, event) => this.handleEditorMouseDown(tab, cm, event) // mousedown callback
            );
            
            this.tabs.set(tabId, tab);
            tab.setOption('lineNumbers', this.lineNumbers);
            tab.setOption('lineWrapping', this.wordWrap);            
            
            // Restore and verify file handle if available
            if (tabData.file.hasFileHandle && this.fileHandles.has(tabId)) {
                const handle = this.fileHandles.get(tabId);
                tab.getFile().setFileHandle(handle);
                
                // Verify handle is still valid
                try {
                    const isValid = tab.getFile().hasValidFileHandle();
                    if (!isValid) {
                        console.warn(`File handle for ${tab.getFile().getFileName()} is no longer valid`);
                    }
                } catch (error) {
                    console.warn(`Error verifying file handle for ${tab.getFile().getFileName()}:`, error);
                }
            }
            
            console.log(`Restored tab: ${tabId} (${tab.getFile().getFileName()})`);
        } catch (error) {
            console.error(`Error restoring tab ${tabId}:`, error);
        }
    }

    // File handle persistence using IndexedDB
    async storeFileHandles() {
        try {
            if (!('indexedDB' in window)) {
                console.warn('IndexedDB not available');
                return;
            }
            
            const db = await this.openDB();
            const transaction = db.transaction(['fileHandles'], 'readwrite');
            const store = transaction.objectStore('fileHandles');
            
            // Clear existing handles
            await new Promise((resolve, reject) => {
                const request = store.clear();
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
            
            // Store current handles
            for (const [tabId, handle] of this.fileHandles) {
                try {
                    await new Promise((resolve, reject) => {
                        const request = store.put({ tabId, handle });
                        request.onsuccess = () => resolve();
                        request.onerror = () => reject(request.error);
                    });
                    console.log(`Stored file handle for tab: ${tabId}`);
                } catch (error) {
                    console.error(`Failed to store file handle for tab ${tabId}:`, error);
                }
            }
            
            // Wait for transaction to complete
            await new Promise((resolve, reject) => {
                transaction.oncomplete = () => resolve();
                transaction.onerror = () => reject(transaction.error);
            });
            
            console.log(`Successfully stored ${this.fileHandles.size} file handles`);
        } catch (error) {
            console.error('Error storing file handles:', error);
        }
    }

    async loadFileHandles() {
        try {
            if (!('indexedDB' in window)) {
                console.warn('IndexedDB not available');
                return;
            }
            
            const db = await this.openDB();
            const transaction = db.transaction(['fileHandles'], 'readonly');
            const store = transaction.objectStore('fileHandles');
            
            const handles = await new Promise((resolve, reject) => {
                const request = store.getAll();
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
            
            console.log('Raw handles from IndexedDB:', handles);
            
            this.fileHandles.clear();
            
            if (Array.isArray(handles)) {
                for (const item of handles) {
                    try {
                        if (item && item.handle && typeof item.handle.getFile === 'function') {
                            this.fileHandles.set(item.tabId, item.handle);
                            console.log(`Loaded file handle for tab: ${item.tabId}`);
                        } else {
                            console.warn(`Invalid file handle for tab ${item.tabId}:`, item);
                        }
                    } catch (error) {
                        console.error(`Error loading file handle for tab ${item.tabId}:`, error);
                    }
                }
            } else {
                console.warn('No handles found or handles is not an array:', handles);
            }
            
            console.log(`Successfully loaded ${this.fileHandles.size} file handles`);
        } catch (error) {
            console.error('Error loading file handles:', error);
            this.fileHandles.clear();
        }
    }

    async openDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('NotepadPlusEditor', 1);
            
            request.onerror = () => {
                console.error('IndexedDB error:', request.error);
                reject(request.error);
            };
            
            request.onsuccess = () => {
                console.log('IndexedDB opened successfully');
                resolve(request.result);
            };
            
            request.onupgradeneeded = (event) => {
                console.log('IndexedDB upgrade needed');
                const db = event.target.result;
                if (!db.objectStoreNames.contains('fileHandles')) {
                    const store = db.createObjectStore('fileHandles', { keyPath: 'tabId' });
                    console.log('Created fileHandles object store');
                }
            };
        });
    }

    // Status message system using StatusMessage class
    showStatus(message, type = 'info') {
        const status = new StatusMessage(message, type);
        status.show();
    }

    // Public API methods for external access
    getActiveTab() {
        return this.activeTabId && this.tabs.has(this.activeTabId) 
            ? this.tabs.get(this.activeTabId) 
            : null;
    }

    getAllTabs() {
        return Array.from(this.tabs.values());
    }

    getTabCount() {
        return this.tabs.size;
    }

    getTab(tabId) {
        return this.tabs.get(tabId);
    }

    closeTab(tabId) {
        if (this.tabs.has(tabId)) {
            const tab = this.tabs.get(tabId);
            return tab.close();
        }
        return false;
    }

    switchToTabByIndex(index) {
        const tabIds = Array.from(this.tabs.keys());
        if (index >= 0 && index < tabIds.length) {
            this.switchToTab(tabIds[index]);
            return true;
        }
        return false;
    }

    getActiveTabIndex() {
        if (!this.activeTabId) return -1;
        const tabIds = Array.from(this.tabs.keys());
        return tabIds.indexOf(this.activeTabId);
    }
    
    // Helper methods for file comparison
    findExistingTabForFile(file) {
        // Check if the file is already open in a tab
        for (const [tabId, tab] of this.tabs) {
            const existingFile = tab.getFile();
            
            // For local files with file handles
            if (file.hasFileHandle && file.hasFileHandle() && 
                existingFile.hasFileHandle && existingFile.hasFileHandle()) {
                // Compare file handles for FileSystemFileHandle objects
                try {
                    // Check if it's the same file handle
                    if (file.getFileHandle().name === existingFile.getFileHandle().name) {
                        // If file paths exist and match, it's definitely the same file
                        if (file.getFilePath() && existingFile.getFilePath() && 
                            file.getFilePath() === existingFile.getFilePath()) {
                            return tabId;
                        }
                    }
                } catch (e) {
                    console.warn('Error comparing file handles:', e);
                }
            }
            
            // For Google Drive files
            if (file.isCloudFile && file.isCloudFile() && 
                existingFile.isCloudFile && existingFile.isCloudFile()) {
                // Check if it's the same Google Drive file ID
                if (file.getFileId && existingFile.getFileId && 
                    file.getFileId() === existingFile.getFileId()) {
                    return tabId;
                }
            }
            
            // Fallback to comparing file name and path
            if (file.getFileName() === existingFile.getFileName()) {
                // If file paths exist and match, it's likely the same file
                if (file.getFilePath() && existingFile.getFilePath() && 
                    file.getFilePath() === existingFile.getFilePath()) {
                    return tabId;
                }
            }
        }
        
        return null; // No matching tab found
    }
    
    // Open or activate file
    openOrActivateFile(file) {
        // Check if the file is already open
        const existingTabId = this.findExistingTabForFile(file);
        
        if (existingTabId) {
            // File is already open, just switch to its tab
            console.log(`File ${file.getFileName()} is already open in tab ${existingTabId}, activating it.`);
            this.switchToTab(existingTabId);
            console.info(`Switched to existing file: ${file.getFileName()}`);
            return existingTabId;
        } else {
            // File is not open, create a new tab
            const tabId = this.generateTabId();
            this.createTab(tabId, file);
            
            // Store file handle for persistence if available
            if (file.hasFileHandle && file.hasFileHandle()) {
                this.fileHandles.set(tabId, file.getFileHandle());
                console.log(`Stored file handle for new tab ${tabId}: ${file.getFileName()}`);
            }
            
            this.switchToTab(tabId);
            return tabId;
        }
    }

    // Language operations
    setLanguage(languageConfig) {
        const activeTab = this.getActiveTab();
        if (!activeTab) return;

        const editor = activeTab.getEditor();
        if (!editor) return;

        try {
            // Check if languageConfig is a string and convert it to an object
            if (typeof languageConfig === 'string') {
                const modeName = languageConfig;
                // Create a displayable name by capitalizing the first letter
                const displayName = modeName.charAt(0).toUpperCase() + modeName.slice(1);
                languageConfig = {
                    mode: modeName,
                    displayName: displayName,
                    id: modeName
                };
            }
            
            // Ensure we have a valid language configuration
            if (!languageConfig) {
                console.error('Invalid language configuration:', languageConfig);
                return;
            }
            
            // Extract the language info from the passed configuration            
            const { mode, displayName, id } = languageConfig;
            activeTab.setMode(mode);
            // Show success message
        } catch (error) {
            console.error(`Error setting language mode:`, error);
        }
    }
    
    // Method to get the current language
    getCurrentLanguage() {
        return this.activeTab ? this.activeTab.getMode() : null;
    }
    
    // Handle mousedown events from the editor
    handleEditorMouseDown(tab, cm, event) {
        console.debug(`[NotepadPlusEditor] Editor mousedown in tab ${tab.getId()}, button: ${event.button}, position:`, cm.coordsChar({left: event.clientX, top: event.clientY}));
        this.searchDialog.clearSearch();
    }

    // Show the context menu for a given Tab instance
    showContextMenuForTab(tab, event) {
        if (this.tabContextMenu) {

            if (this.getActiveTab() !== tab) {
                this.switchToTab(tab.getId());
            }
            // Use event for coordinates if provided
            const x = event && event.pageX ? event.pageX : 0;
            const y = event && event.pageY ? event.pageY : 0;
            this.tabContextMenu.show(x, y, tab.id);
        }
    }

    /**
     * Move a tab in the tab bar.
     * @param {string} tabId - The id of the tab to move.
     * @param {string} direction - 'left', 'right', 'begin', or 'end'.
     */
    moveTab(tabId, direction) {
        const tabBar = document.getElementById('tab-bar');
        if (!tabBar || !this.tabs.has(tabId)) return;
        const tabIds = Array.from(this.tabs.keys());
        const currentIdx = tabIds.indexOf(tabId);
        if (currentIdx === -1) return;
        let newIdx = currentIdx;
        switch (direction) {
            case 'left':
                newIdx = Math.max(0, currentIdx - 1);
                break;
            case 'right':
                newIdx = Math.min(tabIds.length - 1, currentIdx + 1);
                break;
            case 'begin':
                newIdx = 0;
                break;
            case 'end':
                newIdx = tabIds.length - 1;
                break;
            default:
                return;
        }
        if (newIdx === currentIdx) return;

        // Move in DOM
        const tab = this.tabs.get(tabId);
        const tabElement = tab.element;
        tabBar.removeChild(tabElement);
        if (newIdx === tabIds.length - 1) {
            tabBar.appendChild(tabElement);
        } else {
            const refTabId = tabIds[newIdx + (newIdx > currentIdx ? 1 : 0)];
            const refTab = this.tabs.get(refTabId);
            tabBar.insertBefore(tabElement, refTab ? refTab.element : null);
        }

        // Move in Map (rebuild order)
        tabIds.splice(currentIdx, 1);
        tabIds.splice(newIdx, 0, tabId);
        const newTabs = new Map();
        for (const id of tabIds) {
            newTabs.set(id, this.tabs.get(id));
        }
        this.tabs = newTabs;

        this.notifyStateChanged(); // Update menu states when switching tabs

        // Scroll the moved tab into view
        if (tabElement && typeof tabElement.scrollIntoView === 'function') {
            tabElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    }    

}

// Initialize the editor when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.editor = new NotepadPlusEditor();

    // Tab navigation widget logic
    const tabBar = document.getElementById('tab-bar');

    // Double-click on empty space in tab bar creates a new tab
    tabBar.addEventListener('dblclick', function(e) {
        // Only trigger if double-clicked on the tab bar itself, not a tab
        if (e.target === tabBar) {
            if (window.editor && typeof window.editor.createNewFile === 'function') {
                window.editor.createNewFile();
            }
        }
    });
    const tabBarNav = document.getElementById('tab-bar-nav');
    const btnLeft = document.getElementById('tab-nav-left');
    const btnRight = document.getElementById('tab-nav-right');
    const btnDropdown = document.getElementById('tab-nav-dropdown');
    const dropdown = document.getElementById('tab-bar-nav-dropdown');

    // Scroll tabs left
    btnLeft.addEventListener('click', () => {
        tabBar.scrollBy({ left: -120, behavior: 'smooth' });
    });
    // Scroll tabs right
    btnRight.addEventListener('click', () => {
        tabBar.scrollBy({ left: 120, behavior: 'smooth' });
    });

    // Dropdown logic
    btnDropdown.addEventListener('click', (e) => {
        e.stopPropagation();
        // Populate dropdown with all tabs
        dropdown.innerHTML = '';
        const tabElems = tabBar.querySelectorAll('.tab');
        tabElems.forEach(tabEl => {
            const item = document.createElement('div');
            item.className = 'tab-bar-nav-dropdown-item';
            item.textContent = tabEl.querySelector('.tab-title')?.textContent || 'Untitled';
            if (tabEl.classList.contains('active')) {
                item.style.fontWeight = 'bold';
            }
            item.addEventListener('click', () => {
                // Find the tabId for this tab element and switch to it using the editor API
                const tabId = tabEl.getAttribute('data-tab-id');
                if (tabId && window.editor && typeof window.editor.switchToTab === 'function') {
                    window.editor.switchToTab(tabId);
                }
                dropdown.classList.remove('show');
            });
            dropdown.appendChild(item);
        });
        // Position and show dropdown
        dropdown.classList.toggle('show');
    });
    // Hide dropdown on click outside
    document.addEventListener('click', (e) => {
        if (!tabBarNav.contains(e.target)) {
            dropdown.classList.remove('show');
        }
    });
});