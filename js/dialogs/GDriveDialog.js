/**
 * Google Drive Windows-style Dialog
 * 
 * This script implements a Windows-style file dialog for Google Drive integration.
 * It supports browsing folders, selecting files, creating new folders, and navigating
 * the Google Drive file structure.
 */

class GDriveWindowsStyleDialog {
    // HTML templates defined as static properties for easy access
    static get dialogHTML() {
        return `
        <div class="gdrive-dialog-overlay">
            <div class="gdrive-dialog">
                <div class="dialog-container">
                    <div class="dialog-header">
                        <div class="dialog-title">
                            <img src="assets/icons/google-drive.svg" alt="Google Drive" class="drive-icon">
                            <span id="dialog-mode">Open from Google Drive</span>
                        </div>
                        <button class="close-button" id="close-dialog">×</button>
                    </div>
                    
                    <div class="dialog-body">
                        <div class="navigation-panel">
                            <div class="address-bar">
                                <span>Location:</span>
                                <div class="breadcrumb-container" id="breadcrumb-path">
                                    <span class="breadcrumb-item active">My Drive</span>
                                </div>
                            </div>
                            
                            <div class="navigation-buttons">
                                <button id="nav-back" class="nav-button" title="Back">
                                    <span class="icon">←</span>
                                </button>
                                <button id="nav-up" class="nav-button" title="Up to parent folder">
                                    <span class="icon">↑</span>
                                </button>
                                <button id="nav-refresh" class="nav-button" title="Refresh">
                                    <span class="icon">↻</span>
                                </button>
                                <button id="new-folder" class="nav-button" title="Create new folder">
                                    <span class="icon">+</span>
                                </button>
                            </div>
                        </div>
                        
                        <div class="file-browser-container">
                            <div class="sidebar">
                                <div class="sidebar-item selected" data-location="root">
                                    <img src="assets/icons/google-drive.svg" alt="Google Drive" class="sidebar-icon">
                                    <span>My Drive</span>
                                </div>
                                <div class="sidebar-item" data-location="shared">
                                    <img src="assets/icons/folder.svg" alt="Folder" class="sidebar-icon">
                                    <span>Shared with me</span>
                                </div>
                                <div class="sidebar-item" data-location="starred">
                                    <img src="assets/icons/folder.svg" alt="Folder" class="sidebar-icon">
                                    <span>Starred</span>
                                </div>
                                <div class="sidebar-item" data-location="recent">
                                    <img src="assets/icons/folder.svg" alt="Folder" class="sidebar-icon">
                                    <span>Recent</span>
                                </div>
                            </div>
                            
                            <div class="file-browser">
                                <div class="file-filter">
                                    <input type="text" id="file-search-filter" placeholder="Search in this folder...">
                                </div>
                                <div id="file-list">
                                    <!-- Files and folders will be populated here via JavaScript -->
                                    <div class="loading-indicator">
                                        <div class="spinner"></div>
                                        <span>Loading files...</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="file-details">
                            <div class="file-name-container">
                                <label for="file-name">File name:</label>
                                <input type="text" id="file-name" class="file-name-input">
                            </div>
                            <div class="file-type-container">
                                <label for="file-type">File type:</label>
                                <select id="file-type" class="file-type-select">

                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <div class="dialog-footer">
                        <button id="action-button" class="primary-button">Open</button>
                        <span class="button-spacer"></span>
                        <button id="cancel-button" class="secondary-button">Cancel</button>
                    </div>
                </div>
            </div>
        </div>`;
    }

    static get templateHTML() {
        return `
        <template id="file-item-template">
            <div class="file-item" data-id="" data-type="">
                <img class="file-icon" src="" alt="">
                <span class="file-name"></span>
                <span class="file-modified"></span>
                <span class="file-type"></span>
            </div>
        </template>`;
    }

    static get modalHTML() {
        return `
        <div class="modal" id="new-folder-modal">
            <div class="modal-content">
                <div class="modal-header">
                    <span class="modal-title">Create new folder</span>
                    <button class="close-button" id="close-modal">×</button>
                </div>
                <div class="modal-body">
                    <label for="new-folder-name">Folder name:</label>
                    <input type="text" id="new-folder-name" placeholder="New folder">
                </div>
                <div class="modal-footer">
                    <button id="create-folder-button" class="primary-button">Create</button>
                    <span class="button-spacer"></span>
                    <button id="cancel-folder-button" class="secondary-button">Cancel</button>
                </div>
            </div>
        </div>`;
    }

    constructor(options = {}) {
        // Default options
        this.options = Object.assign({
            mode: 'open', // 'open' or 'save'
            fileTypes: [], // Array of allowed file extensions
            title: '', // Custom dialog title
            initialPath: 'root', // Initial Google Drive folder ID
            initialFileName: '', // Initial file name for save dialog
            onSelect: null, // Callback when a file is selected
            onCancel: null, // Callback when dialog is canceled
            // API callbacks
            loadFolderContents: null, // Function to load folder contents
            createFolder: null, // Function to create a new folder
            // UI helper callbacks
            getFileIconByType: null, // Function to get icon for file type
            getFileTypeLabel: null, // Function to get human-readable file type
        }, options);

        // State management
        this.state = {
            currentFolderId: this.options.initialPath,
            currentPath: [],
            selectedFileId: null,
            navigationHistory: [],
            historyPosition: -1,
            files: [],
            folders: [],
            fileTypes: this.options.fileTypes,
            isLoading: false
        };

        // Initialize elements as empty object
        this.elements = {};

        // Create dialog element
        this.dialogElement = null;

        // Initialize the dialog
        this.init();
    }

    init() {
        // Create container for the dialog
        this.injectDefaultTemplates();
    }
    
    injectDefaultTemplates() {
        try {
            // Inject the main dialog HTML
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = GDriveWindowsStyleDialog.dialogHTML;
            this.dialogElement = tempDiv.firstElementChild;
            document.body.appendChild(this.dialogElement);
            
            // Inject the template and modal HTML into the body
            document.body.insertAdjacentHTML('beforeend', GDriveWindowsStyleDialog.templateHTML);
            document.body.insertAdjacentHTML('beforeend', GDriveWindowsStyleDialog.modalHTML);
            
            // Add needed CSS file if not already present
            this.loadCSS();
            
            // Initialize element references
            this.initializeElementReferences();
            
            // Setup the UI
            this.initializeUI();
            
            return true;
        } catch (error) {
            console.error('Error injecting default templates:', error);
            this.showError('Failed to initialize dialog. Please try again.');
            return false;
        }
    }

    loadCSS() {
        // Check if the CSS is already loaded
        if (!document.querySelector('link[href$="gdrive-dialog.css"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'css/dialogs/gdrive-dialog.css';
            document.head.appendChild(link);
        }
    }
    
    initializeElementReferences() {
        // Update DOM element references
        this.elements = {
            dialogMode: document.getElementById('dialog-mode'),
            actionButton: document.getElementById('action-button'),
            cancelButton: document.getElementById('cancel-button'),
            fileList: document.getElementById('file-list'),
            fileName: document.getElementById('file-name'),
            fileType: document.querySelector('.gdrive-dialog .file-type-select'),
            breadcrumbPath: document.getElementById('breadcrumb-path'),
            navBack: document.getElementById('nav-back'),
            navUp: document.getElementById('nav-up'),
            navRefresh: document.getElementById('nav-refresh'),
            newFolder: document.getElementById('new-folder'),
            closeDialog: document.getElementById('close-dialog'),
            newFolderModal: document.getElementById('new-folder-modal'),
            newFolderName: document.getElementById('new-folder-name'),
            createFolderButton: document.getElementById('create-folder-button'),
            cancelFolderButton: document.getElementById('cancel-folder-button'),
            closeModal: document.getElementById('close-modal'),
            sidebarItems: document.querySelectorAll('.sidebar-item'),
            searchFilter: document.getElementById('file-search-filter')
        };
    }
    
    initializeUI() {
        //Setup file type options
        this.setupFileTypeOptions();

        // Setup UI based on mode (open/save)
        this.setupDialogMode();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Load initial folder contents
        this.loadFolder(this.state.currentFolderId);
    }

    setupFileTypeOptions() {
        const fileTypeSelect = this.elements.fileType;
        fileTypeSelect.innerHTML = '';

        // Add options for each file type (use extension as value)
        if (this.state.fileTypes && this.state.fileTypes.length > 0) {
            this.state.fileTypes.forEach(fileType => {
                // Use the first extension as the value
                // const ext = Array.isArray(fileType.fileExtensions) ? fileType.fileExtensions[0] : fileType.fileExtensions;
                const mimeType = fileType.mimeType;
                if (!mimeType) return;
                const option = document.createElement('option');
                // option.value = ext.replace(/^\./, ''); // remove leading dot if present
                option.value = mimeType;
                option.textContent = fileType.displayName;
                fileTypeSelect.appendChild(option);
            });
        } else {
            const option = document.createElement('option');
            option.value = 'txt';
            option.textContent = 'Text Files (*.txt)';
            fileTypeSelect.appendChild(option);
        }
    }

    setupDialogMode() {
        if (this.options.mode === 'save') {
            this.elements.dialogMode.textContent = 'Save to Google Drive';
            this.elements.actionButton.textContent = 'Save';
            
            // Set initial filename if provided
            if (this.options.initialFileName) {
                this.elements.fileName.value = this.options.initialFileName;
                console.log('Set initial filename:', this.options.initialFileName);
            }
        } else {
            this.elements.dialogMode.textContent = 'Open from Google Drive';
            this.elements.actionButton.textContent = 'Open';
        }

        // Set custom title if provided
        if (this.options.title) {
            this.elements.dialogMode.textContent = this.options.title;
        }
    }

    setupEventListeners() {
        // Navigation buttons
        this.elements.navBack.addEventListener('click', () => this.navigateBack());
        this.elements.navUp.addEventListener('click', () => this.navigateUp());
        this.elements.navRefresh.addEventListener('click', () => this.refreshCurrentFolder());
        this.elements.newFolder.addEventListener('click', () => this.showNewFolderModal());
        
        // Action buttons
        this.elements.actionButton.addEventListener('click', () => this.handleActionButton());
        this.elements.cancelButton.addEventListener('click', () => this.handleCancel());
        this.elements.closeDialog.addEventListener('click', () => this.handleCancel());
        
        // File selection
        this.elements.fileList.addEventListener('click', (e) => this.handleFileListClick(e));
        this.elements.fileList.addEventListener('dblclick', (e) => this.handleFileListDoubleClick(e));
        
        // File name input
        this.elements.fileName.addEventListener('input', () => this.updateActionButtonState());
        
        // Search filter
        this.elements.searchFilter.addEventListener('input', () => this.filterFiles());
        this.elements.searchFilter.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.elements.searchFilter.value = '';
                this.filterFiles();
            }
        });
        
        // New folder modal
        this.elements.createFolderButton.addEventListener('click', () => this.createNewFolder());
        this.elements.cancelFolderButton.addEventListener('click', () => this.hideNewFolderModal());
        this.elements.closeModal.addEventListener('click', () => this.hideNewFolderModal());
        
        // Sidebar navigation
        this.elements.sidebarItems.forEach(item => {
            item.addEventListener('click', () => {
                const location = item.getAttribute('data-location');
                this.navigateToLocation(location);
                
                // Update selected state
                this.elements.sidebarItems.forEach(i => i.classList.remove('selected'));
                item.classList.add('selected');
            });
        });
        
        // File type filter
        this.elements.fileType.addEventListener('change', () => this.filterFilesByType());
    }

    /**
     * API interactions with Google Drive
     */
    
    async loadFolder(folderId, isDirectNavigation = false) {
        this.setLoading(true);
        
        // In save mode, preserve the current filename before loading the folder
        let savedFileName = '';
        if (this.options.mode === 'save' && this.elements.fileName) {
            savedFileName = this.elements.fileName.value;
            console.log('Saving filename before folder change:', savedFileName);
        }
        
        try {
            // Call the provided API callback function
            if (!this.options.loadFolderContents) {
                throw new Error('loadFolderContents callback is not provided');
            }
            
            const folderContents = await this.options.loadFolderContents(folderId);
            
            // Update state
            this.state.files = folderContents.files || [];
            this.state.folders = folderContents.folders || [];
            
            // Update current folder
            this.state.currentFolderId = folderId;
            
            // Handle navigation history
            if (isDirectNavigation) {
                // If directly navigating to a location (like sidebar navigation or Up button)
                // Reset the history and start a new path
                this.state.navigationHistory = [{
                    id: 'root',
                    name: 'My Drive'
                }];
                
                // Add current folder if it's not root
                if (folderId !== 'root') {
                    this.state.navigationHistory.push({
                        id: folderId,
                        name: folderContents.folderName
                    });
                }
                
                this.state.historyPosition = this.state.navigationHistory.length - 1;
            } else {
                // For normal navigation (clicking into folders)
                // Add to navigation history if it's a new location
                if (this.state.historyPosition === -1 || 
                    this.state.navigationHistory[this.state.historyPosition].id !== folderId) {
                    
                    // Remove forward history if we're navigating from middle of history
                    if (this.state.historyPosition >= 0 && 
                        this.state.historyPosition < this.state.navigationHistory.length - 1) {
                        this.state.navigationHistory = this.state.navigationHistory.slice(0, this.state.historyPosition + 1);
                    }
                    
                    // Add current folder to history
                    this.state.navigationHistory.push({
                        id: folderId,
                        name: folderContents.folderName
                    });
                    
                    this.state.historyPosition = this.state.navigationHistory.length - 1;
                }
            }
            
            // Update UI
            this.renderFileList();
            this.updateBreadcrumbs();
            this.updateNavigationControls();

            // Apply file type filter after rendering the file list
            this.filterFilesByType();

            // Clear search filter
            if (this.elements.searchFilter) {
                this.elements.searchFilter.value = '';
            }

            // Restore the filename in save mode
            if (this.options.mode === 'save' && this.elements.fileName) {
                console.log('Attempting to restore filename:', savedFileName, 'Mode:', this.options.mode);
                this.elements.fileName.value = savedFileName;
                console.log('Restored filename after folder navigation:', this.elements.fileName.value);
            }
        } catch (error) {
            console.error('Error loading folder:', error);
            // Show error message to user
            this.showError('Failed to load folder contents. Please try again.');
        } finally {
            this.setLoading(false);
        }
    }
    
    /**
     * UI Rendering and Updates
     */
    
    renderFileList() {
        console.log('Starting renderFileList, current filename:', this.elements.fileName?.value);
        
        // Clear current list
        this.elements.fileList.innerHTML = '';
        
        // Get file item template
        const template = document.getElementById('file-item-template');
        
        console.log('Rendering file list. Folders:', this.state.folders.length, 'Files:', this.state.files.length);
        
        // Add folders first
        this.state.folders.forEach(folder => {
            const fileItem = template.content.cloneNode(true).querySelector('.file-item');
            
            fileItem.setAttribute('data-id', folder.id);
            fileItem.setAttribute('data-type', 'folder');
            fileItem.classList.add('folder-item');
            
            const fileIcon = fileItem.querySelector('.file-icon');
            fileIcon.src = 'assets/icons/folder.svg';
            fileIcon.alt = 'Folder';
            
            const fileName = fileItem.querySelector('.file-name');
            fileName.textContent = folder.name;
            
            const fileModified = fileItem.querySelector('.file-modified');
            fileModified.textContent = folder.modifiedDate || '';
            
            const fileType = fileItem.querySelector('.file-type');
            fileType.textContent = 'Folder';
            
            this.elements.fileList.appendChild(fileItem);
        });
        
        // Then add files
        this.state.files.forEach(file => {
            const fileItem = template.content.cloneNode(true).querySelector('.file-item');
            
            fileItem.setAttribute('data-id', file.id);
            fileItem.setAttribute('data-type', 'file');
            
            const fileIcon = fileItem.querySelector('.file-icon');
            fileIcon.src = this.options.getFileIconByType ? 
                this.options.getFileIconByType(file.mimeType) : 
                'assets/icons/file.svg';
            fileIcon.alt = 'File';
            
            const fileName = fileItem.querySelector('.file-name');
            fileName.textContent = file.name;
            
            const fileModified = fileItem.querySelector('.file-modified');
            fileModified.textContent = file.modifiedDate || '';
            
            const fileType = fileItem.querySelector('.file-type');
            fileType.textContent = this.options.getFileTypeLabel ? 
                this.options.getFileTypeLabel(file.mimeType) : 
                'File';
            
            this.elements.fileList.appendChild(fileItem);
        });
        
        // If no files or folders, show message
        if (this.state.folders.length === 0 && this.state.files.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-folder-message';
            emptyMessage.textContent = 'This folder is empty';
            this.elements.fileList.appendChild(emptyMessage);
        }
    }
    
    updateBreadcrumbs() {
        // Clear current breadcrumbs
        this.elements.breadcrumbPath.innerHTML = '';
        
        // Special locations like 'shared', 'starred', 'recent' don't need a path
        if (this.state.currentFolderId === 'shared') {
            const sharedCrumb = document.createElement('span');
            sharedCrumb.className = 'breadcrumb-item active';
            sharedCrumb.textContent = 'Shared with me';
            this.elements.breadcrumbPath.appendChild(sharedCrumb);
            return;
        } else if (this.state.currentFolderId === 'starred') {
            const starredCrumb = document.createElement('span');
            starredCrumb.className = 'breadcrumb-item active';
            starredCrumb.textContent = 'Starred';
            this.elements.breadcrumbPath.appendChild(starredCrumb);
            return;
        } else if (this.state.currentFolderId === 'recent') {
            const recentCrumb = document.createElement('span');
            recentCrumb.className = 'breadcrumb-item active';
            recentCrumb.textContent = 'Recent';
            this.elements.breadcrumbPath.appendChild(recentCrumb);
            return;
        }
        
        // For regular folders
        // Add root
        const rootCrumb = document.createElement('span');
        rootCrumb.className = 'breadcrumb-item';
        rootCrumb.textContent = 'My Drive';
        rootCrumb.setAttribute('data-id', 'root');
        
        // If we're at root, mark it as active, otherwise add a click listener
        if (this.state.currentFolderId === 'root') {
            rootCrumb.classList.add('active');
        } else {
            rootCrumb.addEventListener('click', () => this.loadFolder('root', true));
        }
        
        this.elements.breadcrumbPath.appendChild(rootCrumb);
        
        // If we have history, show the path
        if (this.state.historyPosition >= 0 && this.state.currentFolderId !== 'root') {
            // Get current path from navigation history
            const path = this.state.navigationHistory.slice(0, this.state.historyPosition + 1);
            
            // Skip the root item (which we already added)
            for (let i = 1; i < path.length; i++) {
                // Add separator
                const separator = document.createElement('span');
                separator.className = 'breadcrumb-separator';
                separator.textContent = ' > ';
                this.elements.breadcrumbPath.appendChild(separator);
                
                // Add folder item
                const crumb = document.createElement('span');
                crumb.className = 'breadcrumb-item';
                if (i === path.length - 1) {
                    crumb.classList.add('active');
                }
                crumb.textContent = path[i].name;
                crumb.setAttribute('data-id', path[i].id);
                
                // Only add click listener if it's not the current folder
                if (i < path.length - 1) {
                    // When clicking a breadcrumb, we want to reset the path up to that point
                    crumb.addEventListener('click', () => {
                        // Slice history up to this point
                        this.state.navigationHistory = this.state.navigationHistory.slice(0, i + 1);
                        this.state.historyPosition = i;
                        this.loadFolder(path[i].id);
                    });
                }
                
                this.elements.breadcrumbPath.appendChild(crumb);
            }
        }
    }
    
    updateNavigationControls() {
        // Update back button state
        this.elements.navBack.disabled = this.state.historyPosition <= 0;
        
        // Update up button state (disable if we're at root)
        this.elements.navUp.disabled = this.state.currentFolderId === 'root' || 
                                      this.state.currentFolderId === 'shared' ||
                                      this.state.currentFolderId === 'starred' ||
                                      this.state.currentFolderId === 'recent';
    }
    
    updateActionButtonState() {
        // In save mode, enable the button if there's a filename
        if (this.options.mode === 'save') {
            this.elements.actionButton.disabled = !this.elements.fileName.value.trim();
        } else {
            // In open mode, enable the button if a file is selected
            this.elements.actionButton.disabled = !this.state.selectedFileId;
        }
    }
    
    setLoading(isLoading) {
        this.state.isLoading = isLoading;
        
        if (isLoading) {
            this.elements.fileList.innerHTML = `
                <div class="loading-indicator">
                    <div class="spinner"></div>
                    <span>Loading files...</span>
                </div>
            `;
        }
    }
    
    filterFiles() {
        // Get the search text
        const searchText = this.elements.searchFilter.value.toLowerCase().trim();
        console.log('Filtering files with search text:', searchText);
        
        // Get all file items
        const fileItems = this.elements.fileList.querySelectorAll('.file-item');
        let visibleCount = 0;
        
        fileItems.forEach(item => {
            const fileName = item.querySelector('.file-name').textContent.toLowerCase();
            
            if (searchText === '' || fileName.includes(searchText)) {
                item.style.display = '';
                visibleCount++;
            } else {
                item.style.display = 'none';
            }
        });
        
        console.log(`Filter applied: ${visibleCount} of ${fileItems.length} items visible`);
    }
    
    filterFilesByType() {
        const selectedType = this.elements.fileType.value;
        
        // If "all" is selected, show all files
        if (selectedType === 'application/octet-stream') {
            // Just re-render the file list
            this.renderFileList();
            return;
        }
        
        // Filter files by the selected type
        const fileItems = this.elements.fileList.querySelectorAll('.file-item[data-type="file"]');
        fileItems.forEach(item => {
            const fileName = item.querySelector('.file-name').textContent;
            let fileExtension = '';
            const lastDot = fileName.lastIndexOf('.');
            if (lastDot > 0 && lastDot < fileName.length - 1) {
                fileExtension = fileName.substring(lastDot + 1).toLowerCase();
            }

            let fileInfo = FileTypes.getFileTypeByMime(selectedType);
            if (fileInfo && fileInfo.fileExtensions.includes(fileExtension)) {
                item.style.display = '';
            } else {
                item.style.display = 'none';
            }
        });
    }
    
    /**
     * User Interactions
     */
    
    handleFileListClick(event) {
        const fileItem = event.target.closest('.file-item');
        if (!fileItem) return;
        
        // Save current filename for debugging
        const currentFileName = this.elements.fileName?.value;
        console.log('handleFileListClick - Current filename before processing:', currentFileName);
        
        // Deselect all items
        const allItems = this.elements.fileList.querySelectorAll('.file-item');
        allItems.forEach(item => item.classList.remove('selected'));
        
        // Select the clicked item
        fileItem.classList.add('selected');
        
        const fileId = fileItem.getAttribute('data-id');
        const fileType = fileItem.getAttribute('data-type');
        
        if (fileType === 'file') {
            this.state.selectedFileId = fileId;
            
            // Update the file name input with the selected file name
            const fileName = fileItem.querySelector('.file-name').textContent;
            this.elements.fileName.value = fileName;
            console.log('handleFileListClick - Updated filename to:', fileName);
        } else {
            this.state.selectedFileId = null;
            // Don't clear the filename in save mode
            if (this.options.mode !== 'save') {
                this.elements.fileName.value = '';
                console.log('handleFileListClick - Cleared filename (not in save mode)');
            } else {
                console.log('handleFileListClick - Preserved filename in save mode:', this.elements.fileName.value);
            }
        }
        
        this.updateActionButtonState();
    }
    
    handleFileListDoubleClick(event) {
        const fileItem = event.target.closest('.file-item');
        if (!fileItem) return;
        
        const fileId = fileItem.getAttribute('data-id');
        const fileType = fileItem.getAttribute('data-type');
        
        console.log('handleFileListDoubleClick - Current filename:', this.elements.fileName?.value);
        
        // Add a visual effect for double-click
        fileItem.classList.add('dbl-click-effect');
        setTimeout(() => {
            fileItem.classList.remove('dbl-click-effect');
        }, 200);
        
        if (fileType === 'folder') {
            // In save mode, remember the current filename before navigating
            const savedFileName = this.options.mode === 'save' ? this.elements.fileName?.value : '';
            console.log('handleFileListDoubleClick - Saving filename before folder navigation:', savedFileName);
            
            // Navigate into the folder
            this.loadFolder(fileId);
        } else {
            // If it's a file in open mode, select it and trigger the action button
            if (this.options.mode === 'open') {
                this.state.selectedFileId = fileId;
                this.handleActionButton();
            }
        }
    }
    
    navigateBack() {
        if (this.state.historyPosition <= 0) return;
        
        this.state.historyPosition--;
        const previousFolder = this.state.navigationHistory[this.state.historyPosition];
        this.loadFolder(previousFolder.id);
    }
    
    navigateUp() {
        // In a real implementation, we would get the parent folder ID from the API
        // For this demo, we'll just go back to root
        if (this.state.currentFolderId !== 'root' && 
            this.state.currentFolderId !== 'shared' &&
            this.state.currentFolderId !== 'starred' &&
            this.state.currentFolderId !== 'recent') {
            this.loadFolder('root', true); // Use direct navigation for Up button
        }
    }
    
    refreshCurrentFolder() {
        this.loadFolder(this.state.currentFolderId);
    }
    
    navigateToLocation(location) {
        this.loadFolder(location, true); // Use direct navigation for sidebar locations
    }
    
    showNewFolderModal() {
        this.elements.newFolderModal.style.display = 'flex';
        this.elements.newFolderName.value = 'New folder';
        this.elements.newFolderName.focus();
        this.elements.newFolderName.select();
    }
    
    hideNewFolderModal() {
        this.elements.newFolderModal.style.display = 'none';
    }
    
    async createNewFolder() {
        const folderName = this.elements.newFolderName.value.trim();
        
        if (!folderName) {
            alert('Please enter a folder name.');
            return;
        }
        
        try {
            // Show loading state
            this.elements.createFolderButton.disabled = true;
            this.elements.createFolderButton.textContent = 'Creating...';
            
            // Check if the callback exists
            if (!this.options.createFolder) {
                throw new Error('createFolder callback is not provided');
            }
            
            // Create the folder using the provided callback
            const newFolder = await this.options.createFolder(
                this.state.currentFolderId, 
                folderName
            );
            
            // Hide modal
            this.hideNewFolderModal();
            
            // Add the new folder to the state and refresh the view
            this.state.folders.push(newFolder);
            this.renderFileList();
            
            // Show success message
            this.showMessage(`Folder "${folderName}" created successfully.`);
        } catch (error) {
            console.error('Error creating folder:', error);
            alert('Failed to create folder. Please try again.');
        } finally {
            // Reset button state
            this.elements.createFolderButton.disabled = false;
            this.elements.createFolderButton.textContent = 'Create';
        }
    }
    
    handleActionButton() {
        // In save mode
        if (this.options.mode === 'save') {
            const fileName = this.elements.fileName.value.trim();
            
            console.log('Dialog action button clicked in save mode');
            console.log('fileName:', fileName);
            console.log('currentFolderId:', this.state.currentFolderId);
            console.log('state:', this.state);
            
            if (!fileName) {
                alert('Please enter a file name.');
                return;
            }
            
            // Call the onSelect callback with the file details
            if (typeof this.options.onSelect === 'function') {
                // Get the selected file type
                let selectedType = 'txt'; // Default to txt
                if (this.elements.fileType && this.elements.fileType.selectedIndex !== -1) {
                    try {
                        selectedType = this.elements.fileType.options[this.elements.fileType.selectedIndex].value;
                        console.log('Selected file type in dialog:', selectedType);
                    } catch (err) {
                        console.error('Error getting selected file type:', err);
                    }
                }
                
                console.log('Calling onSelect with:', {
                    name: fileName,
                    folderId: this.state.currentFolderId || 'root',
                    action: 'save',
                    fileType: selectedType
                });
                
                this.options.onSelect({
                    name: fileName,
                    folderId: this.state.currentFolderId || 'root',
                    action: 'save',
                    fileType: selectedType
                });
            }
            
            // Close the dialog
            this.close();
        } else {
            // In open mode
            if (!this.state.selectedFileId) {
                alert('Please select a file to open.');
                return;
            }
            
            // Find the selected file
            const selectedFile = this.state.files.find(file => file.id === this.state.selectedFileId);
            
            if (!selectedFile) {
                alert('Selected file not found.');
                return;
            }
            
            // Call the onSelect callback with the file details
            if (typeof this.options.onSelect === 'function') {
                this.options.onSelect({
                    id: selectedFile.id,
                    name: selectedFile.name,
                    mimeType: selectedFile.mimeType,
                    action: 'open'
                });
            }
            
            // Close the dialog
            this.close();
        }
    }
    
    handleCancel() {
        // Call the onCancel callback
        if (typeof this.options.onCancel === 'function') {
            this.options.onCancel();
        }
        
        // Close the dialog
        this.close();
    }
    
    close() {
        if (this.dialogElement && this.dialogElement.parentNode) {
            this.dialogElement.parentNode.removeChild(this.dialogElement);
        }
    }
    
    /**
     * Helper Functions
     */
    
    showError(message) {
        // In a real app, you might want to show a proper error UI
        console.error(message);
        alert(message);
    }
    
    showMessage(message) {
        // In a real app, you might want to show a proper toast/notification
        console.log(message);
    }
}
