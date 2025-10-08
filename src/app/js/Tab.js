// Tab.js - Tab entity
// (EditorContextMenu is assumed to be globally available)
class Tab {
 
    // Select all content in the editor

    constructor(id, file, onContentChange = null, onClose = null, cursorPosition = null, editorMouseDownCallback = null) {
        this.id = id;
        this.file = file;
        this.editor = null;
        this.element = null;
        this.content = null;
        this.onContentChange = onContentChange;
        this.onClose = onClose;
        this.active = false;
        this.dirty = true; // Start as dirty when created
        this.contentHash = this.hashContent(this.file.getContent()); // Initial content hash
        this.savedContentHash = this.contentHash; // Initialize saved hash to match initial content
        this.cursorPosition = cursorPosition; // Track cursor position for this tab
        this.editorMouseDownCallback = editorMouseDownCallback; // Callback for editor mousedown events
        this.activationTimestamp = Date.now(); // Track last activation time
        this.createDOM();
        this._setupEditorContextMenu();
        this.initializeEditor();
        this.initializeLanguageMode();
    }
    

    initializeLanguageMode() {
        // Detect language based on file extension
        const fileName = this.file.getFileName();
        if (fileName.includes('.')) {
            const extension = fileName.split('.').pop().toLowerCase();
            
            let languageMimeType = FileTypes.getMimeTypeForExtension(extension);

            this.editor.setOption('mode', languageMimeType);
        }
    }

    getName() {
        if (!this.file) {
            console.error('Tab.getName: No file associated with this tab');
            return '';
        }
        return this.file.getFileName();
    }

    async setName(name) {
        if (!this.file) {
            console.error('Tab.setName: No file associated with this tab');
            return '';
        }

        this.file = await FileFactory.renameFile(this.file, name);
        this.updateTitle();
        this.dirty = true; // Mark tab as dirty to ensure it gets saved to storage
    }

      // Returns true if there are real content changes to redo (ignores selection/cursor-only steps)
    hasContentToRedo() {
        if (!this.editor || typeof this.editor.getHistory !== 'function') return false;
        const history = this.editor.getHistory();
        if (!history || !Array.isArray(history.undone) || history.undone.length === 0) return false;
        // Check for any real content change in undone
        for (let i = history.undone.length - 1; i >= 0; i--) {
            const entry = history.undone[i];
            if (entry.changes && entry.changes.length > 0) {
                return true;
            }
        }
        return false;
    }
    // Returns true if there are real content changes to undo (ignores selection/cursor-only steps)
    hasContentToUndo() {
        if (!this.editor || typeof this.editor.getHistory !== 'function') return false;
        const history = this.editor.getHistory();
        if (!history || !Array.isArray(history.done) || history.done.length <= 1) return false;
        // Skip the initial state (first entry)
        for (let i = history.done.length - 1; i > 0; i--) {
            const entry = history.done[i];
            if (entry.changes && entry.changes.length > 0) {
                return true;
            }
        }
        return false;
    }

    selectAll() {
        if (this.editor && typeof this.editor.execCommand === 'function') {
            this.editor.execCommand('selectAll');
            this.editor.focus();
        } else if (this.editor && typeof this.editor.selectAll === 'function') {
            // Fallback if CodeMirror instance has selectAll
            this.editor.selectAll();
            this.editor.focus();
        }
    }

    // Hash function for content (simple string hash)
    hashContent(content) {
        if (!content) return 0;
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash;
    }
    
    // Prepare editor history for storage, with optional size limiting
    prepareHistoryForStorage() {
        if (!this.editor) return null;
        if (!this.file) {
            console.error('Tab.prepareHistoryForStorage: No file associated with this tab');
            return null;
        }

        
        const content = this.editor.getValue();
        // Skip history for very large files (>1MB) to avoid performance issues
        if (content.length > 1024 * 1024) {
            console.log(`Skipping undo history storage for large file: ${this.file.getFileName()} (${content.length} bytes)`);
            return null;
        }
        
        // Get history and limit its size
        const fullHistory = this.editor.getHistory();
        const limitedHistory = HistoryManager.limitHistorySize(fullHistory, 50);
        
        // Compress the history to reduce storage size
        const compressedHistory = HistoryManager.compressHistory(limitedHistory);
        
        return compressedHistory;
    }

    // Create DOM elements for the tab
    createDOM() {
        // Use tab title template from DOM
        let template = document.getElementById('tab-title-template');

        const tabElem = template.cloneNode(true);
        tabElem.style.display = '';
        tabElem.className = 'tab';
        tabElem.setAttribute('data-tab-id', this.id);
        // Set tab title
        const titleSpan = tabElem.querySelector('.tab-title');
        if (titleSpan) titleSpan.textContent = this.getDisplayName();
        // Set close button
        const closeSpan = tabElem.querySelector('.tab-close');
        if (closeSpan) closeSpan.setAttribute('data-tab-id', this.id);
        // Set tab icon class based on file type
        this.element = tabElem;
        this.updateIcon();
        
        // Tab click handler
        this.element.addEventListener('click', (e) => {
            if (e.target.classList.contains('tab-close')) {
                e.stopPropagation();
                this.close();
            } else {
                // Always use editor.switchToTab to ensure proper tab management
                if (window.editor) {
                    window.editor.switchToTab(this.id);
                }
            }
        });

        // Tab right-click handler (context menu)
        this.element.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (window.editor) {
                window.editor.showContextMenuForTab(this, e);
            }
        });

        // Add tooltip functionality for Google Drive files 
        this.setupTabTooltip();

        // Create editor content
        this.content = document.createElement('div');
        this.content.className = 'editor-tab-content';
        this.content.setAttribute('data-tab-id', this.id);

        const textarea = document.createElement('textarea');
        this.content.appendChild(textarea);

        // Add to DOM
        document.getElementById('tab-bar').appendChild(this.element);
        document.getElementById('editor-container').appendChild(this.content);
    }

    // Initialize CodeMirror editor
    initializeEditor() {
        const textarea = this.content.querySelector('textarea');
        
        this.editor = CodeMirror.fromTextArea(textarea, {
            lineNumbers: true,
            mode: this.file.getMode(),
            theme: 'default',
            indentUnit: 4,
            lineWrapping: true,
            autoCloseBrackets: true,
            matchBrackets: true,
            direction: 'ltr',
            rtlMoveVisually: false,
            smartIndent: true,
            electricChars: true,
            undoDepth: 200,
            historyEventDelay: 1250,
            lineWiseCopyCut: true,
            workTime: 100,
            workDelay: 300,
            pollInterval: 100,
            dragDrop: true,
            allowDropFileTypes: null,
            cursorBlinkRate: 530,
            cursorScrollMargin: 0,
            cursorHeight: 1,
            resetSelectionOnContextMenu: true,
            spellcheck: false,
            autocorrect: false,
            autocapitalize: false,
            // Add extra bottom padding so last line is not covered by search bar
            viewportMargin: Infinity, // allow full scroll
            extraKeys: {
                // Only block keys that must not be handled by CodeMirror at all
                'Esc': () => true,
                'Ctrl-F': () => true,
                'Ctrl-H': () => true
            }
        });
        // Add a fake element at the end of the editor to allow scroll-past-end
        const scroller = this.editor.getScrollerElement();
        if (scroller) {
            let fakePad = scroller.querySelector('.cm-scroll-padding');
            if (!fakePad) {
                fakePad = document.createElement('div');
                fakePad.className = 'cm-scroll-padding';
                fakePad.style.height = '80px'; // adjust as needed for search bar height
                fakePad.style.pointerEvents = 'none';
                scroller.appendChild(fakePad);
            }
        }

        // Set initial content
        // Use setValue with a second parameter of true to clear the history
        // This ensures we don't get an initial undo action to clear everything
        this.editor.setValue(this.file.getContent(), true);
        
        // Explicitly clear the history to ensure no initial undo state
        this.editor.clearHistory();
        
        // Recalculate the content hash to ensure it matches the editor content
        this.contentHash = this.hashContent(this.editor.getValue());

        // Set up event handlers
        this.setupEditorEvents();

        // Initial setup
        setTimeout(() => {
            this.editor.refresh();
            this.editor.setCursor(0, 0);
            
            const cmElement = this.editor.getWrapperElement();
            const cmLines = cmElement.querySelector('.CodeMirror-lines');
            if (cmLines) {
                cmLines.style.textAlign = 'left';
            }
        }, 10);
    }

    // Set up editor event handlers
    setupEditorEvents() {
   

        console.log(`[TAB::initializeEditor] Creating tab for file: ${this.file.getFileName()}, file modified: ${this.file.isModified()}`);

        // Update cursor position on cursor activity
        this.editor.on('cursorActivity', () => {
            if (this.active) {
                this.updateCursorPosition();
            }
        });

        // Add mousedown handler here
        if (typeof this.editorMouseDownCallback === 'function') {
            this.editor.on('mousedown', (cm, event) => {
                this.editorMouseDownCallback(this, cm, event);
            });
        }

        // Mark the editor as "clean" initially, setting this as the baseline for modifications
        // This is crucial to prevent unwanted initial undo behavior
        this.editor.clearHistory();
        
        // Add a small delay to ensure the editor is fully initialized
        setTimeout(() => {
            // Create a clean initial history state
            this.editor.setHistory(HistoryManager.createCleanHistory());
        }, 10);

        let lastPos = null;

        this.editor.on("beforeChange", (cm, change) => {
            const curPos = change.from;
            if (
                lastPos &&
                // new edit is not directly after the last one (=> cursor jumped)
                (curPos.line !== lastPos.line || curPos.ch !== lastPos.ch + 1)
            ) {
                console.log(`Cursor jumped: {from: ${lastPos.ch}, to: ${curPos.ch}}`);
                change.origin = "+separate-" + Date.now();
            }
            lastPos = {
                line: curPos.line,
                ch: curPos.ch // update with new cursor after insert
            };
        });

        // Mark as modified when content changes
        this.editor.on('change', (cm, changeObj) => {            
            const content = this.editor.getValue();
            const newContentHash = this.hashContent(content);
            
            // Only mark as dirty if the content actually changed (hash is different)
            if (newContentHash !== this.contentHash) {
                console.log(`[TAB::editor:change] File ${this.file.getFileName()} content changed, old hash: ${this.contentHash}, new hash: ${newContentHash}`);
                this.contentHash = newContentHash; // Update the hash
                this.file.setContent(content);
                
                // Check if content matches the saved state
                if (newContentHash === this.savedContentHash) {
                    console.log(`[TAB::editor:change] Content reverted to saved state for ${this.file.getFileName()}`);
                    this.file.markAsSaved(); // Mark file as saved/unmodified
                } else {
                    this.file.markAsModified(); // Mark file as modified
                }
                
                this.dirty = true;
                this.updateTitle();
            } else {
                console.log(`[TAB::editor:change] No real content change in ${this.file.getFileName()}, hash: ${this.contentHash}`);
            }
            
            if (this.onContentChange) {
                this.onContentChange(this);
            }
        });
    }

    // Activate this tab
    activate() {
        // Always update activation timestamp
        this.activationTimestamp = Date.now();
        this.dirty = true; // Clear dirty flag on activation

        // Only proceed with activation if not already active
        if (!this.active) {
            console.log(`[TAB::activate] Tab Id: ${this.id}, File Id: ${this.file.getFileName()}`);
            // Add active class to this tab
            this.element.classList.add('active');
            this.content.classList.add('active');
            this.active = true;
            // Refresh editor and update UI
            setTimeout(() => {
                this.editor.refresh();
                this.editor.focus();
                // Restore cursor position if available, else set to (0,0)
                if (this.cursorPosition && typeof this.editor.setCursor === 'function') {
                    const currentCursor = this.editor.getCursor ? this.editor.getCursor() : null;
                    if (!currentCursor || currentCursor.line !== this.cursorPosition.line || currentCursor.ch !== this.cursorPosition.ch) {
                        this.editor.setCursor(this.cursorPosition);
                    }
                } else if (typeof this.editor.setCursor === 'function') {
                    this.editor.setCursor({ line: 0, ch: 0 });
                }
                this.updateCursorPosition();
            }, 10);
            // Update current language and notify menu
            const editor = this.editor;
            if (editor) {
                const mode = editor.getOption('mode');                    
                // Notify language changed
                setTimeout(() => {
                    console.debug(`[TAB::activate] Active tab language mode: ${mode}`);
                    // Get shortName for status bar
                    this.updateLanguage();
                }, 10);

            }            
        }
    }

    //Copy selected line/text
    copySelection() {
        if (this.active === false) return;
        
        if (this.editor.somethingSelected()) {
            const selectedText = this.editor.getSelection();
            navigator.clipboard.writeText(selectedText);            
        } else {
            // Select current line entirely
            const cursor = this.editor.getCursor();
            const lineContent = this.editor.getLine(cursor.line);
            navigator.clipboard.writeText(lineContent);
        }
    }
    
    //Cut selected line/text
    cutSelection() {
        if (this.active === false) return;
        
        if (this.editor.somethingSelected()) {
            const selectedText = this.editor.getSelection();
            navigator.clipboard.writeText(selectedText);
            this.editor.replaceSelection("");
        } else {
            // Cut the entire current line
            const cursor = this.editor.getCursor();
            const lineNumber = cursor.line;
            let lineContent = this.editor.getLine(lineNumber);
            
            const from = { line: lineNumber, ch: 0 };
            // If it's not the last line, delete up to the start of the next line
            if (lineNumber < this.editor.lineCount() - 1) {
                const to = { line: lineNumber + 1, ch: 0 };
                this.editor.replaceRange("", from, to);
                lineContent = lineContent + '\n'; // Include newline in cut text
            } else {
                // If it's the last line, just clear it
                const to = { line: lineNumber, ch: this.editor.getLine(lineNumber).length };
                this.editor.replaceRange("", from, to);
            }            
            navigator.clipboard.writeText(lineContent);
        }
    }

    // Deactivate this tab
    deactivate() {
        this.element.classList.remove('active');
        this.content.classList.remove('active');
        this.active = false;
    }

    // Close tab
    close() {
        if (this.file && this.file.isModified()) {
            const confirm = window.confirm(
                `The file "${this.file.getFileName()}" has unsaved changes. Do you want to close it anyway?`
            );
            if (!confirm) {
                return false;
            }
        }

        // Remove from DOM
        this.element.remove();
        this.content.remove();

        // Notify parent
        if (this.onClose) {
            this.onClose(this);
        }

        return true;
    }

    // Set up tooltip for tab showing file path
    setupTabTooltip() {
        // Eagerly try to load the path in the background after creation
        this._preloadTooltipPath();
        
        // Use mouseover event to display the path
        this.element.addEventListener('mouseover', () => {
            // The actual tooltip content should already be loaded or loading
            // Just make sure the title attribute is set
            if (!this.element.title || this.element.title === '') {
                this._updateTooltipPath();
            }
        });
    }
    
    // Preload the tooltip path in the background without blocking
    _preloadTooltipPath() {
        // Don't block the UI with await
        setTimeout(() => {
            this._updateTooltipPath();
        }, 100); // Slight delay to prioritize UI rendering
    }
    
    // Update the tooltip path
    async _updateTooltipPath() {
        try {
            // For Google Drive files, get the formatted path
            if (this.file.isCloudFile && this.file.isCloudFile()) {
                if (this.file.getFormattedPath) {
                    // Set a temporary tooltip immediately
                    this.element.title = 'Loading path...';
                    
                    // Get the actual path and update
                    const path = await this.file.getFormattedPath();
                    this.element.title = path;
                } else {
                    this.element.title = 'Google Drive';
                }
            } else {
                // For local files, show the path if available
                const filePath = this.file.getFilePath();
                if (filePath) {
                    this.element.title = filePath;
                } else {
                    this.element.title = this.file.getFileName();
                }
            }
        } catch (error) {
            console.error('Error updating tooltip path:', error);
            this.element.title = this.file.getFileName();
        }
    }

    updateIcon() {
        // Update tab icon class and display based on file type
        const iconSpan = this.element.querySelector('.tab-icon');
        if (iconSpan) {
            iconSpan.classList.remove('gdrive', 'local');
            if (this.file && this.file.constructor) {
                if (this.file.constructor.name === 'GDriveFile') {
                    iconSpan.classList.add('gdrive');
                    iconSpan.style.display = 'inline-block';
                } else if (this.file.constructor.name === 'LocalFile') {
                    iconSpan.classList.add('local');
                    iconSpan.style.display = 'inline-block';
                } else {
                    iconSpan.style.display = 'none';
                }
            } else {
                iconSpan.style.display = 'none';
            }
        }
    }


    // Update tab title
    updateTitle() {
        const titleElement = this.element.querySelector('.tab-title');
        titleElement.textContent = this.getDisplayName();
        const modifiedElement = this.element.querySelector('.tab-modified-indicator');
        if (this.file.isModified()) {
            modifiedElement.style.display = 'inline';
        } else {
            modifiedElement.style.display = 'none';
        }

        this.updateIcon();

        // Trigger path update in the background
        this._preloadTooltipPath();
    }

    // Get display name with modification indicator
    getDisplayName() {
        
        const typeIndicator = this.getFileTypeIndicator();
        return typeIndicator + (this.file ? this.file.getFileName() : '');
    }

    // Get file type indicator
    getFileTypeIndicator() {
        return ''; // Default: no indicator
        // Check if file is a Google Drive file
        if (this.file.isCloudFile && this.file.isCloudFile()) {
            return '☁️ '; // Cloud emoji for Google Drive files
        }
        if (this.languageHint) {
            return `[${this.languageHint}] `; // Language indicator
        }
        return ''; // No indicator for local files
    }
    
    // Update language hint for the tab (used for syntax highlighting indicator)
    updateLanguageHint(hint) {
        this.languageHint = hint;
        this.updateTitle();
    }

    // Update cursor position in status bar and store in tab
    updateCursorPosition() {
        if (!this.editor) return;
        const cursor = this.editor.getCursor();
        // Only mark as dirty if position actually changed
        const prev = this.cursorPosition;
        if (!prev || prev.line !== cursor.line || prev.ch !== cursor.ch) {
            // Remove previous highlight
            if (prev && typeof prev.line === 'number' && this._highlightedLineHandle) {
                this.editor.removeLineClass(this._highlightedLineHandle, 'wrap', 'cm-current-line');
            }
            this.cursorPosition = { line: cursor.line, ch: cursor.ch };
            this.dirty = true;
            // Add highlight to current line
            this._highlightedLineHandle = this.editor.addLineClass(cursor.line, 'wrap', 'cm-current-line');
        }
        const positionElement = document.getElementById('cursor-position');
        if (positionElement) {
            positionElement.textContent = `Line ${cursor.line + 1}, Col ${cursor.ch + 1}`;
        }
    }

    // Save file
    async save() {
        try {
            console.debug(`Tab.save started for tab: ${this.id}, file: ${this.file.getFileName()}`);

            // Sync editor content to file
            const content = this.editor.getValue();
            this.file.setContent(content);
            
            // Update content hash after saving
            this.contentHash = this.hashContent(content);
            // Update saved hash to match current content
            this.savedContentHash = this.contentHash;
            
            // Save file
            console.debug(`Tab.save calling file.save() for ${this.file.getFileName()}`);
            let file = await this.file.save();
            //console.debug(`Tab.save succeeded for ${this.file.getFileName()}`);
            if (file !== false) {
                console.debug(`Tab.save: File instance changed after save for ${this.file.getFileName()}`);
                this.file = file;
                this.updateTitle();
                // Mark tab as dirty to ensure it gets saved to storage
                // File content is saved to disk, but we need to update storage
                this.dirty = true;
                return true; 
            }
            return false; // No change to file instance
        } catch (error) {
            console.error(`[Tab] Error saving file ${this.file.getFileName()}:`, error);
            throw error;
        }
    }

    // Save file as
    async saveAs(suggestedName = null) {
        try {
            // Sync editor content to file
            const content = this.editor.getValue();
            this.file.setContent(content);

            // Update content hash
            this.contentHash = this.hashContent(content);
            // Update saved hash to match current content
            this.savedContentHash = this.contentHash;

            // Save file as
            let file = await FileFactory.saveAs(this.file, suggestedName);
            if (file !== false) {
                console.debug(`Tab.saveAs: File instance changed after saveAs for ${this.file.getFileName()}`);
                this.file = file;
                this.dirty = true; // Mark tab as dirty to ensure it gets saved to storage
                // File content is saved to disk, but we need to update storage
                this.updateTitle();

                // --- Language update after Save As ---
                if (typeof this.initializeLanguageMode === 'function') {
                    this.initializeLanguageMode();
                }
                if (typeof this.getEditor === 'function' && this.getEditor()) {
                    this.updateLanguage();
                }
                return true;
            }
            return false; // No change to file instance
        } catch (error) {
            console.error(`[Tab] Error in saveAs for file ${this.file.getFileName()}:`, error);
            throw error;
        }
        return true;
    }

    // Get file reference
    getFile() {
        return this.file;
    }

    // Get editor reference
    getEditor() {
        return this.editor;
    }

    // Get tab ID
    getId() {
        return this.id;
    }

    // Check if tab is active
    isActive() {
        return this.active;
    }

    // Refresh editor (useful after theme changes, etc.)
    refresh() {
        if (this.editor) {
            this.editor.refresh();
        }
    }
    
    // Reload content from file and reset editor
    reloadContent() {
        if (this.editor && this.file) {
            // Get fresh content from file
            const content = this.file.getContent();
            
            // Set content without triggering change events
            this.editor.setValue(content, true);
            
            // Reset hash values
            this.contentHash = this.hashContent(content);
            this.savedContentHash = this.contentHash;
            
            // Reset modification state
            this.file.markAsSaved();
            this.updateTitle();
            
            // Reset history
            this.editor.clearHistory();
            
            console.log(`[TAB::reloadContent] Reloaded content for ${this.file.getFileName()}`);
            return true;
        }
        return false;
    }

    // Set editor mode (for syntax highlighting)
    setMode(mode) {        
        console.debug(`[TAB::setMode] Setting mode to ${mode} for tab ${this.id}`);
        if (!mode || typeof mode !== 'string') {
            mode = 'plaintext'; // Default to plaintext if invalid
        }
        if (this.editor) {
            this.editor.setOption('mode', mode);
            // Notify the menu to update the selected item
            this.updateLanguage();
        }
    }

    updateLanguage() {
        let shortName = this.getMode();
        const ft = FileTypes.getFileTypeByMime(this.getMode());
        if (ft && ft.shortName) shortName = ft.shortName;
        document.dispatchEvent(new CustomEvent('language:changed', { 
            detail: { language: shortName } 
        }));
    }

    setOption(option, value) {
        if (this.editor) {
            this.editor.setOption(option, value);
        }
    }

    getMode() {
        if (this.editor) {
            return this.editor.getOption('mode');
        }
    }

    // Focus editor
    focus() {
        if (this.editor && this.active) {
            this.editor.focus();
        }
    }

    // Serialize tab for storage
    serialize() {
        console.debug(`[TAB::serialize] Serializing tab ${this.id} (${this.file.getFileName()}) and modified: ${this.file.isModified()}`);
        // Get the limited editor history if available
        const history = this.prepareHistoryForStorage();
        return {
            id: this.id,
            file: this.file.serialize(),
            active: this.active,
            activationTimestamp: this.activationTimestamp || null,
            history: history, // Save the editor's undo/redo history
            contentHash: this.contentHash,
            savedContentHash: this.savedContentHash, // Include saved hash for state restoration
            cursorPosition: this.cursorPosition || null
        };
    }

    // Create tab from serialized data
    static deserialize(data, onContentChange = null, onClose = null, editorMouseDownCallback = null) {
        // Determine file type and deserialize appropriately
        let file;
        switch (data.file.type) {
            case 'LocalFile':
                // Print data for debugging
                file = FileFactory.createLocalFileFromData(data.file);
                break;
            case 'GDriveFile':
                file = FileFactory.createGDriveFileFromData(data.file);
                break;
            default:
                // Default to LocalFile
                file = FileFactory.createTemporaryFileFromData(data.file);
        }
        // Pass cursorPosition and editorMouseDownCallback to constructor
        const tab = new Tab(data.id, file, onContentChange, onClose, data.cursorPosition || null, editorMouseDownCallback);
        // Restore modification state
        if (file.isModified()) {
            tab.updateTitle();
        }
        // Calculate and set the initial content hash
        tab.contentHash = tab.hashContent(tab.file.getContent());
        // Restore saved content hash if available, otherwise use current hash
        if (data.savedContentHash !== undefined) {
            tab.savedContentHash = data.savedContentHash;
        } else {
            tab.savedContentHash = tab.contentHash;
        }
        // Check if content matches saved state
        // if (tab.contentHash === tab.savedContentHash) {
        //     tab.file.markAsSaved();
        // } else {
        //     tab.file.markAsModified();
        // }
        // Restore editor history if available
        if (data.history && tab.editor) {
            setTimeout(() => {
                try {
                    // Validate and decompress history before applying
                    if (HistoryManager.isValidHistory(data.history)) {
                        // Decompress the history if needed
                        const decompressedHistory = HistoryManager.decompressHistory(data.history);
                        if (decompressedHistory && 
                            (decompressedHistory.done.length > 0 || decompressedHistory.undone.length > 0)) {
                            // Only set history if it contains actual undo/redo steps
                            tab.editor.setHistory(decompressedHistory);
                            console.log(`Restored undo history for ${tab.file.getFileName()} (${decompressedHistory.done.length} undo steps, ${decompressedHistory.undone.length} redo steps)`);
                        } else {
                            // No actual history, just clear it
                            tab.editor.clearHistory();
                            console.log(`No history steps to restore for ${tab.file.getFileName()}, using clean state`);
                        }
                    } else {
                        console.warn(`Invalid history data for ${tab.file.getFileName()}, clearing history`);
                        tab.editor.clearHistory();
                    }
                } catch (error) {
                    console.error(`Error restoring undo history for ${tab.file.getFileName()}:`, error);
                    // On error, make sure we still have a clean history
                    tab.editor.clearHistory();
                }
            }, 100); // Small delay to ensure editor is fully initialized
        } else {
            // No history data available, ensure we have a clean history
            setTimeout(() => {
                if (tab.editor) {
                    tab.editor.clearHistory();
                    console.log(`No history data for ${tab.file.getFileName()}, using clean state`);
                }
            }, 100);
        }
        this.activationTimestamp = data.activationTimestamp || Date.now();
        // Clear dirty flag after deserializing
        tab.clearDirtyFlag();
        return tab;
    }
    
    // Check if tab has unsaved changes or needs to be saved to storage
    isDirty() {
        // A tab is dirty if either:
        // 1. The dirty flag is set (for storage purposes)
        // 2. The file is modified AND hasn't been saved to storage yet
        return this.dirty;
    }
    
    // Reset saved content hash to match current content
    resetSavedState() {
        if (this.editor) {
            const content = this.editor.getValue();
            this.contentHash = this.hashContent(content);
            this.savedContentHash = this.contentHash;
            this.file.markAsSaved();
            this.updateTitle();
            console.log(`[TAB::resetSavedState] Reset saved state for ${this.file.getFileName()}, hash: ${this.contentHash}`);
        }
    }
    
    // Clear the dirty flag after saving to storage
    clearDirtyFlag() {
        this.dirty = false;
    }
    
    // Mark the tab as modified (differs from disk version)
    markAsModified() {
        if (this.editor) {
            // Keep current content hash but set saved hash to 0
            // This ensures the file appears as modified
            this.savedContentHash = 0;
            this.dirty = true;
            this.file.markAsModified();
            this.updateTitle();
        }
    }
    
    // Check if editor is at its initial state (no undo history)
    isAtInitialState() {
        if (!this.editor) return true;
        
        const history = this.editor.getHistory();
        return !history || 
               (Array.isArray(history.done) && history.done.length === 0 && 
                Array.isArray(history.undone) && history.undone.length === 0);
    }
    
    // Check if content matches the last saved state
    isContentMatchingSavedState() {
        if (!this.editor) return true;
        
        const currentContent = this.editor.getValue();
        const currentHash = this.hashContent(currentContent);
        
        return currentHash === this.savedContentHash;
    }

    // Undo last content change (ignores selection/cursor-only steps)
    undo() {
        if (this.editor && typeof this.editor.undo === 'function') {
            this.editor.undo();
        } else if (this.editor && typeof this.editor.execCommand === 'function') {
            this.editor.execCommand('undo');
        } else {
            console.warn('Undo not supported on this editor instance.');
        }
    }

    // Redo last undone content change (ignores selection/cursor-only steps)
    redo() {
        if (this.editor && typeof this.editor.redo === 'function') {
            this.editor.redo();
        } else if (this.editor && typeof this.editor.execCommand === 'function') {
            this.editor.execCommand('redo');
        } else {
            console.warn('Redo not supported on this editor instance.');
        }
    }

    // --- Editor context menu logic ---
    // Setup context menu for the editor view
    _setupEditorContextMenu() {
        setTimeout(() => {
            if (!this.content) return;
            this.content.removeEventListener('contextmenu', this._onEditorContextMenu);
            this._onEditorContextMenu = (e) => {
                if (e) e.preventDefault();
                this._editorContextMenu = new EditorContextMenu({parent: this, onHide: () => {
                    if (this._editorContextMenu) {
                        this._editorContextMenu = null;
                    }
                }});
                const x = e.pageX || (e.touches && e.touches[0]?.pageX) || 0;
                const y = e.pageY || (e.touches && e.touches[0]?.pageY) || 0;
                this._editorContextMenu.show(x, y);
            };
            this.content.addEventListener('contextmenu', this._onEditorContextMenu);
        }, 0);
    }

    paste() {
        if (navigator.clipboard && this.editor) {
            navigator.clipboard.readText().then(text => {
                this.editor.replaceSelection(text);
            });
        }
    }

    deleteSelection() {
        if (this.editor && this.editor.somethingSelected()) {
            this.editor.replaceSelection('');
        }
    }

    async protectSelection() {
        //TODO: show prompt dialog to set password
        // Use ProtectedText to encrypt the selected content
        // Replace selected text with encrypted text
        if (this.editor && this.editor.somethingSelected()) {
            const selectedText = this.editor.getSelection();
            const password = window.prompt('Enter a password to protect the selected text:');
            if (!password) return;

            // Assume ProtectedText.encrypt(text, password) exists
            const encrypted = await ProtectedText.encrypt(selectedText, password);
            this.editor.replaceSelection(encrypted);
        }
    }

    async unprotectSelection() {
        if (this.editor && this.editor.somethingSelected()) {
            const selectedText = this.editor.getSelection();
            const password = window.prompt('Enter the password to unprotect the selected text:');
            if (!password) return;
            // Assume ProtectedText.decrypt(text, password) exists
            try {
                const decrypted = await ProtectedText.decrypt(selectedText, password);
                // If around the selectedText there are ~ chars and are not included in selectedText, remove them after decrypting
                const sel = this.editor.getSelection();
                const cursor = this.editor.getCursor();
                const from = this.editor.getCursor('from');
                const to = this.editor.getCursor('to');
                let before = '', after = '';
                if (from.ch > 0) {
                    before = this.editor.getLine(from.line).charAt(from.ch - 1);
                }
                const line = this.editor.getLine(to.line);
                if (to.ch < line.length) {
                    after = line.charAt(to.ch);
                }
                let decryptedText = decrypted;
                // Remove leading ~ if present before selection
                if (before === '~') {
                    this.editor.replaceRange('', { line: from.line, ch: from.ch - 1 }, { line: from.line, ch: from.ch });
                }
                // Remove trailing ~ if present after selection
                if (after === '~') {
                    this.editor.replaceRange('', { line: to.line, ch: to.ch - 1 }, { line: to.line, ch: to.ch });
                }
                this.editor.replaceSelection(decrypted);
            } catch (error) {
                window.alert('Failed to unprotect text. Incorrect password or invalid protected text.');
            }   
        }
    }
}