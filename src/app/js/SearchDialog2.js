// SearchDialog2.js
// Custom persistent search dialog for the ChromEd editor

/**
 * Base state class for the State pattern
 */
class SearchDialogState {
    constructor(context) {
        this.context = context;
    }
    
    // Methods that can be overridden by concrete states
    show() {}
    hide() {}
    performSearch() {}
    findNext() {}
    findPrev() {}
    replace() {}
    replaceAll() {}
}

/**
 * Search-only state
 */
class SearchOnlyState extends SearchDialogState {
    constructor(context) {
        super(context);
    }
    
    show() {
        // Hide replace controls (single row layout)
        if (this.context.replaceLabel) this.context.replaceLabel.style.display = 'none';
        if (this.context.replaceInput) this.context.replaceInput.style.display = 'none';
        if (this.context.replaceBtn) this.context.replaceBtn.style.display = 'none';
        if (this.context.replaceAllBtn) this.context.replaceAllBtn.style.display = 'none';
        // Set main label to 'Find:'
        if (this.context.searchMainLabel) this.context.searchMainLabel.textContent = 'Find:';
        this.context.dialog.style.height = 'auto';
    }
}

/**
 * Search and replace state
 */
class SearchReplaceState extends SearchDialogState {
    constructor(context) {
        super(context);
    }
    
    show() {
        // Show replace controls (single row layout)
        if (this.context.replaceLabel) this.context.replaceLabel.style.display = '';
        if (this.context.replaceInput) this.context.replaceInput.style.display = '';
        if (this.context.replaceBtn) this.context.replaceBtn.style.display = '';
        if (this.context.replaceAllBtn) this.context.replaceAllBtn.style.display = '';
        // Set main label to 'Replace:'
        if (this.context.searchMainLabel) this.context.searchMainLabel.textContent = 'Replace:';
        this.context.dialog.style.height = 'auto';
    }
    
    replace() {
        const editor = this.context.editor();
        
        if (!editor || !editor.somethingSelected()) {
            // Nothing selected, find next match first
            this.context.findNext();
            return;
        }
        
        // Get the replacement text
        const replacement = this.context.replaceInput.value;
        
        // Replace the current selection with the replacement text
        editor.replaceSelection(replacement);
        
        // Find the next match
        this.context.findNext();
    }
    
    replaceAll() {
        const editor = this.context.editor();
        
        if (!editor || !this.context.input.value) {
            return;
        }
        
        const query = this.context.input.value;
        const replacement = this.context.replaceInput.value;
        
        // Start from the beginning of the document
        editor.setCursor({line: 0, ch: 0});
        
        // Create a regex with the correct case sensitivity
        const flags = this.context.caseSensitive ? 'g' : 'gi';
        const searchRegex = new RegExp(query.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&"), flags);
        
        // Get the full document text
        const text = editor.getValue();
        
        // Replace all occurrences
        const newText = text.replace(searchRegex, replacement);
        
        // Set the new text
        editor.setValue(newText);
    }
}

class SearchDialog2 {
    constructor(notepadEditor = null) {
        console.log('[SearchDialog2] constructor');
        this.notepadEditor = notepadEditor;
        this.dialog = document.getElementById('search-dialog2');
        this.closeBtn = this.dialog.querySelector('.search-close-btn');
        this.input = this.dialog.querySelector('.search-input');
        this.prevBtn = this.dialog.querySelector('.search-prev-btn');
        this.nextBtn = this.dialog.querySelector('.search-next-btn');
        this.matchCaseCheckbox = this.dialog.querySelector('.search-match-case-checkbox');
        
    // New elements for replace functionality (single row layout)
    this.replaceLabel = this.dialog.querySelector('.replace-label');
    this.replaceInput = this.dialog.querySelector('.replace-input');
    this.replaceBtn = this.dialog.querySelector('.replace-btn');
    this.replaceAllBtn = this.dialog.querySelector('.replace-all-btn');
        
        this.searchMainLabel = this.dialog.querySelector('.search-main-label');
        this.matchCounter = this.dialog.querySelector('.search-match-counter');
        
        this.visible = false;
        this.lastQuery = '';
        this.lastReplacement = '';
        this.caseSensitive = false; // Default: case insensitive search
        
        // Initialize states
        this.searchOnlyState = new SearchOnlyState(this);
        this.searchReplaceState = new SearchReplaceState(this);
        this.state = this.searchOnlyState; // Default to search-only state
        
        // Initialize event listeners
        this.setupEventListeners();
    }
    
    /**
     * Set up all event listeners for the search dialog
     */
    setupEventListeners() {
        console.log('[SearchDialog2] setupEventListeners');
        // Close button click event
        this.closeBtn.addEventListener('click', () => {
            this.hide();
        });
        
        // Input field events
        this.input.addEventListener('input', () => {
            this.performSearch(this.input.value);
        });
        
        this.input.addEventListener('keydown', (event) => {
            // Handle Enter key - find next match
            if (event.key === 'Enter') {
                this.findNext();
                event.preventDefault();
            }
        });
        
        // Navigation button events
        this.prevBtn.addEventListener('click', () => {
            this.findPrev();
        });
        
        this.nextBtn.addEventListener('click', () => {
            this.findNext();
        });
        
        // Match case checkbox
        this.matchCaseCheckbox.addEventListener('change', () => {
            this.caseSensitive = this.matchCaseCheckbox.checked;
            // Re-run the search with the new case sensitivity setting
            if (this.input.value) {
                this.performSearch(this.input.value);
            }
        });
        
        // Replace button events
        if (this.replaceBtn) {
            this.replaceBtn.addEventListener('click', () => {
                this.replace();
            });
        }
        
        // Replace All button events
        if (this.replaceAllBtn) {
            this.replaceAllBtn.addEventListener('click', () => {
                this.replaceAll();
            });
        }
        
        // Replace input field events
        if (this.replaceInput) {
            this.replaceInput.addEventListener('keydown', (event) => {
                // Handle Enter key - perform replace
                if (event.key === 'Enter') {
                    this.replace();
                    event.preventDefault();
                }
            });
        }
    }
    
    /**
     * Get the current editor from the active tab
     * @returns {Object} - The CodeMirror editor instance
     */
    editor() {
        if (!this.notepadEditor) {
            console.error('[SearchDialog2] No notepadEditor instance available');
            return null;
        }
        
        const activeTab = this.notepadEditor.getActiveTab();
        if (!activeTab) {
            console.error('[SearchDialog2] No active tab available');
            return null;
        }
        
        return activeTab.getEditor();
    }
    
    /**
     * Show the search dialog
     * @param {string} initialQuery - Optional initial search query
     */
    show(initialQuery = '') {
        console.log('[SearchDialog2] show');
        // Check if we have a valid editor
        if (!this.editor()) {
            console.error('[SearchDialog2] No editor instance available');
            return;
        }
        
        // Get the selected text or the word under cursor
        const selectedText = this.getSelectedOrWordUnderCursor();
        
        // Set the initial query (prioritize: parameter > selection > last query)
        let query = initialQuery || selectedText || this.lastQuery;

        if (query.length > 1024) {
            console.warn('[SearchDialog2] Query too long, truncating to 1024 characters');
            query = query.substring(0, 1024);
        }
        
        // Show the dialog
        this.dialog.style.display = 'flex';
        this.visible = true;
        
        // Let the current state configure the UI
        this.state.show();
        
        // Set input value and focus
        this.input.value = query;
        this.input.focus();
        this.input.select();
        
        // Set the replace input value from the last replacement
        if (this.replaceInput) {
            this.replaceInput.value = this.lastReplacement || '';
        }
        
        // Set the checkbox state from the saved state
        this.matchCaseCheckbox.checked = this.caseSensitive;
        
        // Perform initial search if we have a query
        if (query) {
            this.performSearch(query);
        }
    }
    
    /**
     * Hide the search dialog
     */
    hide() {
        console.log('[SearchDialog2] hide');
        // Save the last query and replacement before hiding
        this.lastQuery = this.input.value;
        if (this.replaceInput) {
            this.lastReplacement = this.replaceInput.value;
        }
        
        // Hide the dialog
        this.dialog.style.display = 'none';
        this.visible = false;
        
        // Let the current state handle hiding
        this.state.hide();
        
        // Clear search state and focus the editor
        const editor = this.editor();
        if (editor) {
            this.clearSearch();
            editor.focus();
        }
    }
    
    /**
     * Create a search overlay to highlight matches
     * @param {string} query - The search query
     * @param {Object} options - Search options
     * @returns {Object} - CodeMirror overlay object
     */
    createSearchOverlay(query, options = {}) {
        console.log('[SearchDialog2] createSearchOverlay');
        if (!query) return null;
        
        // Default options
        const caseFold = options.caseFold !== undefined ? options.caseFold : true;
        const isRegexp = options.regexp !== undefined ? options.regexp : false;
        
        // Escape special characters if not using regexp
        const escapedQuery = isRegexp ? query : query.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
        
        // Log the settings
        console.debug('[SearchDialog2] Creating search overlay with options:', {
            query: query,
            caseFold: caseFold,
            isRegexp: isRegexp
        });
        
        return {
            token: function(stream) {
                // Create a regular expression with appropriate flags
                const regexp = isRegexp ? 
                    new RegExp(query) : 
                    new RegExp(escapedQuery, caseFold ? "gi" : "g");
                
                regexp.lastIndex = stream.pos;
                const match = regexp.exec(stream.string);
                
                if (match && match.index == stream.pos) {
                    stream.pos += match[0].length || 1;
                    return "searching";  // CSS class for highlighted text
                } else if (match) {
                    stream.pos = match.index;
                } else {
                    stream.skipToEnd();
                }
            }
        };
    }
    
    /**
     * Perform a search for the given query
     * @param {string} query - The search query
     */
    performSearch(query) {
        console.log('[SearchDialog2] performSearch');
        const editor = this.editor();
        
        if (!editor || !query) {
            return;
        }
        
        // Clear previous search state
        this.clearSearch();
        
        // Save the query
        this.lastQuery = query;
        
        // Set up search state if not already present
        if (!editor.state.search) {
            editor.state.search = {
                posFrom: editor.getCursor(),
                posTo: editor.getCursor(),
                query: query,
                overlay: null,
                caseFold: true
            };
        } else {
            editor.state.search.query = query;
        }
        
        setTimeout(() => {
            // Move cursor to the start of the document for new search            
            this.findNext();
            setTimeout(() => {
                // Ensure the result is visible
                this.findPrev();
            }, 0);
        }, 0);
        // Create and apply search overlay
        const searchOverlay = this.createSearchOverlay(query, {
            caseFold: !this.caseSensitive,
            regexp: false
        });
        
        if (searchOverlay) {
            console.debug('[SearchDialog2] Adding search overlay {query:', query, ', caseSensitive:', this.caseSensitive, '}');
            editor.addOverlay(searchOverlay);
            editor.state.search.overlay = searchOverlay;
            editor.state.search.caseFold = !this.caseSensitive;
        }
        
        // Update match counter
        this.updateMatchCounter(query);
    }
    
    /**
     * Find the next match for the current search
     */
    findNext() {
        console.log('[SearchDialog2] findNext');
        const editor = this.editor();
        const query = this.input.value;

        if (!editor || !query) return;

        // Ensure search state is up to date
        if (editor.state.search?.query !== query) {
            this.performSearch(query);
        }

        const caseFold = !this.caseSensitive;
        let cursor = editor.getSearchCursor(query, editor.getCursor('to'), { caseFold });

        if (!cursor.findNext()) {
            // Wrap around: search again from top
            cursor = editor.getSearchCursor(query, { line: 0, ch: 0 }, { caseFold });
            if (!cursor.findNext()) return; // nothing found
        }

        editor.setSelection(cursor.from(), cursor.to());
        editor.scrollIntoView({ from: cursor.from(), to: cursor.to() }, 30);
    }
    
    /**
     * Find the previous match for the current search
     */
    findPrev() {
        console.log('[SearchDialog2] findPrev');
        const editor = this.editor();
        const query = this.input.value;

        if (!editor || !query) return;

        // Ensure search state is up to date
        if (editor.state.search?.query !== query) {
            this.performSearch(query);
        }

        const caseFold = !this.caseSensitive;
        let cursor = editor.getSearchCursor(query, editor.getCursor('from'), { caseFold });

        if (!cursor.findPrevious()) {
            // Wrap around: search again from bottom
            const lastLine = editor.lastLine();
            const lastCh = editor.getLine(lastLine).length;
            cursor = editor.getSearchCursor(query, { line: lastLine, ch: lastCh }, { caseFold });
            if (!cursor.findPrevious()) return; // nothing found
        }

        editor.setSelection(cursor.from(), cursor.to());
        editor.scrollIntoView({ from: cursor.from(), to: cursor.to() }, 30);
    }
    
    /**
     * Clear the current search state and highlighting
     */
    clearSearch() {
        console.log('[SearchDialog2] clearSearch');
        const editor = this.editor();
        
        if (!editor) return;
        
        // Remove overlay if it exists
        if (editor.state.search && editor.state.search.overlay) {
            editor.removeOverlay(editor.state.search.overlay);
            editor.state.search.overlay = null;
        }
        
        // Clear annotations if they exist
        if (editor.state.search && editor.state.search.annotate) {
            editor.state.search.annotate.clear();
            editor.state.search.annotate = null;
        }
    }
    
    /**
     * Get selected text or word under cursor
     * @returns {string} Selected text or word under cursor
     */
    getSelectedOrWordUnderCursor() {
        console.log('[SearchDialog2] getSelectedOrWordUnderCursor');
        const editor = this.editor();
        
        if (!editor) return '';
        
        // Get selected text if any
        const selectedText = editor.getSelection();
        if (selectedText) return selectedText;
        
        // Get word under cursor
        const cursor = editor.getCursor();
        const line = editor.getLine(cursor.line);
        return this.getWordAt(line, cursor.ch);
    }
    
    /**
     * Get word at the specified position in text
     * @param {string} text - Text line
     * @param {number} pos - Position in text
     * @returns {string} Word at position
     */
    getWordAt(text, pos) {
        console.log('[SearchDialog2] getWordAt');
        // Helper function to check if character is part of a word
        const isWordChar = (ch) => /\w/.test(ch);
        
        // Find word boundaries
        let start = pos;
        let end = pos;
        
        while (start > 0 && isWordChar(text.charAt(start - 1))) start--;
        while (end < text.length && isWordChar(text.charAt(end))) end++;
        
        // Return the word if found, empty string otherwise
        return start !== end ? text.slice(start, end) : '';
    }
    
    /**
     * Check if the dialog is currently visible
     * @returns {boolean} Visibility state
     */
    isVisible() {
        console.log('[SearchDialog2] isVisible');
        return this.visible;
    }
    
    /**
     * Set the dialog mode to search-only or search/replace
     * @param {boolean} enableReplace - True to enable replace mode, false for search-only
     */
    setReplaceMode(enableReplace) {
        console.log('[SearchDialog2] setReplaceMode:', enableReplace);
        
        // Switch the state based on the mode
        if (enableReplace) {
            this.state = this.searchReplaceState;
        } else {
            this.state = this.searchOnlyState;
        }
        
        // If the dialog is already visible, update its appearance
        if (this.visible) {
            this.state.show();
        }
    }
    
    /**
     * Replace the current selection with the replacement text and find next
     */
    replace() {
        console.log('[SearchDialog2] replace');
        // Delegate to the current state
        this.state.replace();
    }
    
    /**
     * Replace all occurrences of the search query with the replacement text
     */
    replaceAll() {
        console.log('[SearchDialog2] replaceAll');
        // Delegate to the current state
        this.state.replaceAll();
    }
    
    /**
     * Update the match counter display
     * @param {string} query - The search query
     */
    updateMatchCounter(query) {
        if (!this.matchCounter) return;
        const editor = this.editor();
        if (!editor || !query) {
            this.matchCounter.textContent = '';
            return;
        }
        // Build regex for search
        const flags = this.caseSensitive ? 'g' : 'gi';
        const searchRegex = new RegExp(query.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&"), flags);
        let matchCount = 0;
        editor.eachLine(line => {
            const text = line.text;
            let match;
            searchRegex.lastIndex = 0;
            while ((match = searchRegex.exec(text)) !== null) {
                matchCount++;
                // Prevent infinite loop for zero-length matches
                if (searchRegex.lastIndex === match.index) searchRegex.lastIndex++;
            }
        });
        if (matchCount === 0) {
            this.matchCounter.textContent = '0 matches';
        } else {
            this.matchCounter.textContent = `${matchCount} matches`;
        }
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SearchDialog2;
}
