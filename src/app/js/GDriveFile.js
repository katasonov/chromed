// GDriveFile.js - Google Drive file implementation using Chrome Identity API
class GDriveFile extends CEFile {
    static currentAccessToken = null;
    static tokenTimestamp = 0;
    static TOKEN_REFRESH_INTERVAL = 30 * 60 * 1000; // 30 minutes in ms

    constructor(fileName, content = '', filePath = null, fileId = null) {
        super(fileName, content, filePath);
        this.fileId = fileId; // Google Drive file ID
        this.mimeType = 'text/plain'; // Default MIME type for text files
        this.parents = null; // Parent folder IDs
        this.cachedPath = null; // Cache for formatted path
        this.pathRequestInProgress = null; // Promise for in-progress path request
    }

    // Get a valid access token, refreshing if needed
    static async getValidAccessToken() {
        const now = Date.now();
        if (!GDriveFile.currentAccessToken || (now - GDriveFile.tokenTimestamp) > GDriveFile.TOKEN_REFRESH_INTERVAL) {
            try {
                // First, try non-interactive (silent) authentication
                GDriveFile.currentAccessToken = await GDriveFile.authenticate(false);
                GDriveFile.tokenTimestamp = now;
            } catch (err) {
                // If silent fails, fall back to interactive (may prompt user)
                GDriveFile.currentAccessToken = await GDriveFile.authenticate(true);
                GDriveFile.tokenTimestamp = now;
            }
        }
        return GDriveFile.currentAccessToken;
    }

    // Check if Chrome Identity API is available
    static isSupported() {
        return typeof chrome !== 'undefined' && 
               chrome.identity && 
               chrome.identity.getAuthToken;
    }

    // Authenticate using Chrome Identity API
    static async authenticate(interactive = true) {
        if (!GDriveFile.isSupported()) {
            throw new Error('Chrome Identity API not available');
        }

        return new Promise((resolve, reject) => {
            chrome.identity.getAuthToken({
                interactive: interactive,
                scopes: ['https://www.googleapis.com/auth/drive']
            }, (token) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else if (token) {
                    resolve(token);
                } else {
                    reject(new Error('Failed to get authentication token'));
                }
            });
        });
    }

    // Check if user is authenticated (silently, without prompting)
    static async isAuthenticated() {
        if (!GDriveFile.isSupported()) return false;
        
        try {
            const token = await GDriveFile.getValidAccessToken(); // Non-interactive
            return !!token;
        } catch (error) {
            return false;
        }
    }

    // Sign out user
    static async signOut() {
        if (!GDriveFile.isSupported()) return;
        
        try {
            // Get current token
            const token = await GDriveFile.getValidAccessToken();
            if (token) {
                // Remove cached token
                chrome.identity.removeCachedAuthToken({ token }, () => {
                    console.log('Signed out successfully');
                });
            }
        } catch (error) {
            console.log('No token to remove');
        }
    }

    // Open file picker using Google Drive API
    static async openFiles() {
        if (!GDriveFile.isSupported()) {
            throw new Error('Chrome Identity API not available');
        }

        const accessToken = await GDriveFile.getValidAccessToken();

        try {
            // Use the new Windows-style dialog
            return new Promise((resolve, reject) => {
                // Create Google Drive API helper functions
                const loadFolderContents = async (folderId) => {
                    try {
                        let url;
                        let fields;
                        
                        if (folderId === 'root') {
                            url = 'https://www.googleapis.com/drive/v3/files';
                            fields = 'files(id,name,mimeType,modifiedTime),nextPageToken';
                            folderId = 'root';
                        } else if (folderId === 'shared') {
                            url = 'https://www.googleapis.com/drive/v3/files';
                            fields = 'files(id,name,mimeType,modifiedTime),nextPageToken';
                            folderId = 'sharedWithMe';
                        } else if (folderId === 'starred') {
                            url = 'https://www.googleapis.com/drive/v3/files';
                            fields = 'files(id,name,mimeType,modifiedTime),nextPageToken';
                            folderId = 'starred=true';
                        } else if (folderId === 'recent') {
                            url = 'https://www.googleapis.com/drive/v3/files';
                            fields = 'files(id,name,mimeType,modifiedTime),nextPageToken';
                            // Keep folderId as 'recent' for identification
                        } else {
                            url = 'https://www.googleapis.com/drive/v3/files';
                            fields = 'files(id,name,mimeType,modifiedTime),nextPageToken';
                        }

                        // Base query to filter by file type
                        let query = `(mimeType='text/plain' or mimeType='application/json' or mimeType='text/html' or mimeType='text/css' or mimeType='application/javascript' or mimeType='application/x-javascript' or mimeType='text/markdown' or mimeType='application/vnd.google-apps.folder')`;
                        
                        // Add folder filter
                        if (folderId === 'root') {
                            query += ` and 'root' in parents`;
                        } else if (folderId === 'sharedWithMe') {
                            query = `sharedWithMe=true and (${query})`;
                        } else if (folderId === 'starred=true') {
                            query = `starred=true and (${query})`;
                        } else if (folderId === 'recent') {
                            // For Recent view, filter out folders and only show files
                            query = query.replace(`or mimeType='application/vnd.google-apps.folder'`, '');
                            // Add explicit exclusion of folders
                            query += ` and mimeType!='application/vnd.google-apps.folder'`;
                            // We'll add orderBy as a URL parameter instead
                        } else {
                            query += ` and '${folderId}' in parents`;
                        }
                        
                        query += ` and trashed=false`;

                        // Build the URL with query parameter
                        let requestUrl = `${url}?q=${encodeURIComponent(query)}&fields=${encodeURIComponent(fields)}`;
                        
                        // For Recent view, add orderBy parameter separately
                        if (folderId === 'recent') {
                            requestUrl += '&orderBy=viewedByMeTime%20desc';
                        }

                        const response = await fetch(
                            requestUrl,
                            {
                                headers: {
                                    'Authorization': `Bearer ${accessToken}`
                                }
                            }
                        );

                        if (!response.ok) {
                            throw new Error(`Failed to load folder: ${response.statusText}`);
                        }

                        const data = await response.json();
                        
                        console.log('Google Drive API response:', data);
                        
                        // Process the files to separate folders and files
                        const folders = [];
                        const files = [];
                        
                        // Store the original timestamp values for custom sorting
                        let originalTimestamps = {};
                        
                        data.files.forEach(file => {
                            // Store original timestamp for sorting
                            originalTimestamps[file.id] = {
                                modifiedTime: file.modifiedTime,
                                viewedByMeTime: file.viewedByMeTime
                            };
                            
                            console.log(`File: ${file.name}, Modified: ${file.modifiedTime}, Viewed: ${file.viewedByMeTime || 'N/A'}`);
                            
                            const fileObj = {
                                id: file.id,
                                name: file.name,
                                modifiedDate: new Date(file.modifiedTime).toLocaleString(),
                                modifiedTime: file.modifiedTime,
                                viewedByMeTime: file.viewedByMeTime,
                                mimeType: file.mimeType
                            };
                            
                            console.log('Processing file:', file.name, 'MIME type:', file.mimeType);
                            
                            if (file.mimeType === 'application/vnd.google-apps.folder') {
                                console.log('  → Adding as folder');
                                folders.push(fileObj);
                            } else {
                                console.log('  → Adding as file');
                                files.push(fileObj);
                            }
                        });
                        
                        console.log('Processed folders:', folders.length, 'files:', files.length);
                        
                        // Custom sort for Recent view - ensure files are properly sorted by time
                        if (folderId === 'recent') {
                            console.log('Sorting files by viewedByMeTime for Recent view');
                            
                            // First, dump all timestamps for debugging
                            console.log('File timestamps before sorting:');
                            files.forEach((file, index) => {
                                const originalTime = originalTimestamps[file.id];
                                console.log(`${index + 1}. ${file.name}`);
                                console.log(`   Modified: ${originalTime.modifiedTime}`);
                                console.log(`   Viewed: ${originalTime.viewedByMeTime || 'N/A'}`);
                            });
                            
                            // Sort files by viewedByMeTime in descending order (most recent first)
                            files.sort((a, b) => {
                                const aTime = originalTimestamps[a.id];
                                const bTime = originalTimestamps[b.id];
                                
                                // If viewedByMeTime is available for both, use it
                                if (aTime.viewedByMeTime && bTime.viewedByMeTime) {
                                    return new Date(bTime.viewedByMeTime) - new Date(aTime.viewedByMeTime);
                                }
                                
                                // If one has viewedByMeTime and the other doesn't, prioritize the one with viewedByMeTime
                                if (aTime.viewedByMeTime && !bTime.viewedByMeTime) {
                                    return -1;
                                }
                                if (!aTime.viewedByMeTime && bTime.viewedByMeTime) {
                                    return 1;
                                }
                                
                                // Fall back to modifiedTime if neither has viewedByMeTime
                                return new Date(bTime.modifiedTime) - new Date(aTime.modifiedTime);
                            });
                            
                            // Log the sorting results for debugging
                            console.log('Sorted files by recent time:');
                            files.forEach((file, index) => {
                                const originalTime = originalTimestamps[file.id];
                                console.log(`${index + 1}. ${file.name}`);
                                console.log(`   Modified: ${originalTime.modifiedTime}`);
                                console.log(`   Viewed: ${originalTime.viewedByMeTime || 'N/A'}`);
                            });
                        }
                        
                        // Get folder name
                        let folderName = 'My Drive';
                        if (folderId !== 'root' && folderId !== 'sharedWithMe' && folderId !== 'starred=true' && folderId !== 'recent') {
                            try {
                                const folderResponse = await fetch(
                                    `https://www.googleapis.com/drive/v3/files/${folderId}?fields=name`,
                                    {
                                        headers: {
                                            'Authorization': `Bearer ${accessToken}`
                                        }
                                    }
                                );
                                
                                if (folderResponse.ok) {
                                    const folderData = await folderResponse.json();
                                    folderName = folderData.name;
                                }
                            } catch (error) {
                                console.error('Error getting folder name:', error);
                            }
                        } else if (folderId === 'sharedWithMe') {
                            folderName = 'Shared with me';
                        } else if (folderId === 'starred=true') {
                            folderName = 'Starred';
                        } else if (folderId === 'viewedByMeTime desc') {
                            folderName = 'Recent';
                        }
                        
                        return {
                            folderName,
                            folders,
                            files
                        };
                    } catch (error) {
                        console.error('Error loading folder contents:', error);
                        throw error;
                    }
                };

                const createFolder = async (parentFolderId, folderName) => {
                    try {
                        const response = await fetch(
                            'https://www.googleapis.com/drive/v3/files',
                            {
                                method: 'POST',
                                headers: {
                                    'Authorization': `Bearer ${accessToken}`,
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    name: folderName,
                                    mimeType: 'application/vnd.google-apps.folder',
                                    parents: [parentFolderId === 'root' ? 'root' : parentFolderId]
                                })
                            }
                        );

                        if (!response.ok) {
                            throw new Error(`Failed to create folder: ${response.statusText}`);
                        }

                        const data = await response.json();
                        
                        return {
                            id: data.id,
                            name: folderName,
                            modifiedDate: new Date().toLocaleString(),
                            mimeType: 'application/vnd.google-apps.folder'
                        };
                    } catch (error) {
                        console.error('Error creating folder:', error);
                        throw error;
                    }
                };

                // Initialize the dialog
                const dialog = new GDriveWindowsStyleDialog({
                    mode: 'open',
                    title: 'Open from Google Drive',
                    loadFolderContents,
                    createFolder,
                    fileTypes: FileTypes.getAllFileTypes(),
                    getFileIconByType: (mimeType) => {
                        // Return appropriate icon for file type
                        if (mimeType.includes('javascript')) {
                            return 'assets/icons/js-file.svg';
                        } else if (mimeType.includes('html')) {
                            return 'assets/icons/html-file.svg';
                        } else if (mimeType.includes('css')) {
                            return 'assets/icons/css-file.svg';
                        } else if (mimeType.includes('json')) {
                            return 'assets/icons/json-file.svg';
                        } else if (mimeType.includes('markdown')) {
                            return 'assets/icons/md-file.svg';
                        } else {
                            return 'assets/icons/text-file.svg';
                        }
                    },
                    getFileTypeLabel: (mimeType) => {

                        return FileTypes.getFileTypeByMime(mimeType)?.displayName || 'Text';
                    },
                    onSelect: async (file) => {
                        try {
                            // Load the selected file
                            const gdriveFile = await GDriveFile.fromFileId(file.id);
                            resolve([gdriveFile]);
                        } catch (error) {
                            reject(error);
                        }
                    },
                    onCancel: () => {
                        resolve([]);
                    }
                });
            });
        } catch (error) {
            throw new Error(`Failed to open Google Drive files: ${error.message}`);
        }
    }

    // Create file from Google Drive file ID
    static async fromFileId(fileId) {
        const accessToken = await GDriveFile.getValidAccessToken();

        try {
            // Get file metadata
            const metadataResponse = await fetch(
                `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,parents,mimeType`,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    }
                }
            );

            if (!metadataResponse.ok) {
                throw new Error(`Failed to fetch metadata: ${metadataResponse.statusText}`);
            }

            const metadata = await metadataResponse.json();

            // Get file content
            const contentResponse = await fetch(
                `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    }
                }
            );

            if (!contentResponse.ok) {
                throw new Error(`Failed to fetch file content: ${contentResponse.statusText}`);
            }

            const content = await contentResponse.text();

            const file = new GDriveFile(
                metadata.name,
                content,
                metadata.name,
                metadata.id
            );

            file.mimeType = metadata.mimeType;
            file.parents = metadata.parents;
            file.markAsSaved();
            
            // Update document title with the opened filename
            document.title = `${metadata.name} - ChromEd`;
            
            // Update status bar with Google Drive info
            const fileTypeElement = document.getElementById('file-type');
            if (fileTypeElement) {
                const fileExt = metadata.name.split('.').pop().toUpperCase();
                fileTypeElement.textContent = `Google Drive: ${fileExt || 'TXT'}`;
            }

            return file;
        } catch (error) {
            throw new Error(`Failed to load Google Drive file: ${error.message}`);
        }
    }

    // Save file to existing location on Google Drive
    async save() {
        console.debug(`Saving Google Drive file...${this.fileId}`);
        if (!this.fileId) {
            return await GDriveFile.saveAs(this.fileName, this.content, this.mimeType);
        }

        const accessToken = await GDriveFile.getValidAccessToken();

        try {
            const response = await fetch(
                `https://www.googleapis.com/upload/drive/v3/files/${this.fileId}?uploadType=media`,
                {
                    method: 'PATCH',
                    headers: {
                'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': this.mimeType
                    },
                    body: this.content
                }
            );

            if (!response.ok) {
                throw new Error(`Failed to save file: ${response.statusText}`);
            }

            this.markAsSaved();
            this.invalidatePathCache(); // Invalidate path cache after saving
            
            // Update viewedByMeTime to make the file appear in Recent list
            await this.updateViewedByMeTime();
            
            return this;
        } catch (error) {
            throw new Error(`Failed to save Google Drive file: ${error.message}`);
        }
    }

    static async saveAs(fileName, content, mimeType = 'text/plain') {
        // Use static token management only
        const accessToken = await GDriveFile.getValidAccessToken();
        let fileInstance = new GDriveFile(fileName, content);
        try {
            // Use the new Windows-style dialog for saving
            return new Promise((resolve, reject) => {
                // Create Google Drive API helper functions
                const loadFolderContents = async (folderId) => {
                    try {
                        let url;
                        let fields;
                        
                        if (folderId === 'root') {
                            url = 'https://www.googleapis.com/drive/v3/files';
                            fields = 'files(id,name,mimeType,modifiedTime),nextPageToken';
                            folderId = 'root';
                        } else if (folderId === 'shared') {
                            url = 'https://www.googleapis.com/drive/v3/files';
                            fields = 'files(id,name,mimeType,modifiedTime),nextPageToken';
                            folderId = 'sharedWithMe';
                        } else if (folderId === 'starred') {
                            url = 'https://www.googleapis.com/drive/v3/files';
                            fields = 'files(id,name,mimeType,modifiedTime),nextPageToken';
                            folderId = 'starred=true';
                        } else if (folderId === 'recent') {
                            url = 'https://www.googleapis.com/drive/v3/files';
                            fields = 'files(id,name,mimeType,modifiedTime),nextPageToken';
                            // Keep folderId as 'recent' for identification
                        } else {
                            url = 'https://www.googleapis.com/drive/v3/files';
                            fields = 'files(id,name,mimeType,modifiedTime),nextPageToken';
                        }

                        // Query to get both folders and files
                        let query = `(
                            mimeType='text/plain' or
                            mimeType='application/json' or
                            mimeType='text/html' or
                            mimeType='text/css' or
                            mimeType='application/javascript' or
                            mimeType='application/x-javascript' or
                            mimeType='text/markdown' or
                            mimeType='application/vnd.google-apps.folder'
                        )`;

                        // Add folder filter
                        if (folderId === 'root') {
                            query += ` and 'root' in parents`;
                        } else if (folderId === 'sharedWithMe') {
                            query = `sharedWithMe=true and (${query})`;
                        } else if (folderId === 'starred=true') {
                            query = `starred=true and (${query})`;
                        } else if (folderId === 'recent') {
                            // For Recent view, filter out folders and only show files
                            query = query.replace(`or mimeType='application/vnd.google-apps.folder'`, '');
                            query += ` and mimeType!='application/vnd.google-apps.folder'`;
                        } else {
                            query += ` and '${folderId}' in parents`;
                        }

                        query += ` and trashed=false`;

                        // Build the URL with query parameter
                        let requestUrl = `${url}?q=${encodeURIComponent(query)}&fields=${encodeURIComponent(fields)}`;

                        // For Recent view, add orderBy parameter separately
                        if (folderId === 'recent') {
                            requestUrl += '&orderBy=viewedByMeTime%20desc';
                        }

                        const response = await fetch(
                            requestUrl,
                            {
                                headers: {
                                    'Authorization': `Bearer ${accessToken}`
                                }
                            }
                        );

                        if (!response.ok) {
                            throw new Error(`Failed to load folder: ${response.statusText}`);
                        }

                        const data = await response.json();

                        // Process the files to separate folders and files
                        const folders = [];
                        const files = [];

                        // Store the original timestamp values for custom sorting
                        let originalTimestamps = {};

                        data.files.forEach(file => {
                            // Store original timestamp for sorting
                            originalTimestamps[file.id] = {
                                modifiedTime: file.modifiedTime,
                                viewedByMeTime: file.viewedByMeTime
                            };

                            if (file.mimeType === 'application/vnd.google-apps.folder') {
                                folders.push({
                                    id: file.id,
                                    name: file.name,
                                    modifiedDate: new Date(file.modifiedTime).toLocaleString(),
                                    modifiedTime: file.modifiedTime,
                                    viewedByMeTime: file.viewedByMeTime,
                                    mimeType: file.mimeType
                                });
                            } else {
                                files.push({
                                    id: file.id,
                                    name: file.name,
                                    modifiedDate: new Date(file.modifiedTime).toLocaleString(),
                                    modifiedTime: file.modifiedTime,
                                    viewedByMeTime: file.viewedByMeTime,
                                    mimeType: file.mimeType
                                });
                            }
                        });

                        // Custom sort for Recent view - ensure folders and files are properly sorted by time
                        if (folderId === 'recent') {
                            // Sort files by viewedByMeTime in descending order (most recent first)
                            files.sort((a, b) => {
                                const aTime = originalTimestamps[a.id];
                                const bTime = originalTimestamps[b.id];
                                if (aTime.viewedByMeTime && bTime.viewedByMeTime) {
                                    return new Date(bTime.viewedByMeTime) - new Date(aTime.viewedByMeTime);
                                }
                                if (aTime.viewedByMeTime && !bTime.viewedByMeTime) {
                                    return -1;
                                }
                                if (!aTime.viewedByMeTime && bTime.viewedByMeTime) {
                                    return 1;
                                }
                                return new Date(bTime.modifiedTime) - new Date(aTime.modifiedTime);
                            });
                        }

                        // Get folder name
                        let folderName = 'My Drive';
                        if (folderId !== 'root' && folderId !== 'sharedWithMe' && folderId !== 'starred=true' && folderId !== 'recent') {
                            try {
                                const folderResponse = await fetch(
                                    `https://www.googleapis.com/drive/v3/files/${folderId}?fields=name`,
                                    {
                                        headers: {
                                            'Authorization': `Bearer ${accessToken}`
                                        }
                                    }
                                );
                                if (folderResponse.ok) {
                                    const folderData = await folderResponse.json();
                                    folderName = folderData.name;
                                }
                            } catch (error) {
                                console.error('Error getting folder name:', error);
                            }
                        } else if (folderId === 'sharedWithMe') {
                            folderName = 'Shared with me';
                        } else if (folderId === 'starred=true') {
                            folderName = 'Starred';
                        } else if (folderId === 'viewedByMeTime desc') {
                            folderName = 'Recent';
                        }

                        return {
                            folderName,
                            folders,
                            files
                        };
                    } catch (error) {
                        console.error('Error loading folder contents:', error);
                        throw error;
                    }
                };

                const createFolder = async (parentFolderId, folderName) => {
                    try {
                        const response = await fetch(
                            'https://www.googleapis.com/drive/v3/files',
                            {
                                method: 'POST',
                                headers: {
                        'Authorization': `Bearer ${accessToken}`,
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    name: folderName,
                                    mimeType: 'application/vnd.google-apps.folder',
                                    parents: [parentFolderId === 'root' ? 'root' : parentFolderId]
                                })
                            }
                        );

                        if (!response.ok) {
                            throw new Error(`Failed to create folder: ${response.statusText}`);
                        }

                        const data = await response.json();
                        
                        return {
                            id: data.id,
                            name: folderName,
                            modifiedDate: new Date().toLocaleString(),
                            mimeType: 'application/vnd.google-apps.folder'
                        };
                    } catch (error) {
                        console.error('Error creating folder:', error);
                        throw error;
                    }
                };

                // Initialize the dialog
                const dialog = new GDriveWindowsStyleDialog({
                    mode: 'save',
                    title: 'Save to Google Drive',
                    initialPath: 'root', // Explicitly set initial path to root
                    initialFileName: fileName || '', // Pass the current or suggested filename
                    loadFolderContents,
                    createFolder,
                    fileTypes: FileTypes.getAllFileTypes(),
                    getFileIconByType: (mimeType) => {
                        if (mimeType.includes('javascript')) {
                            return 'assets/icons/js-file.svg';
                        } else if (mimeType.includes('html')) {
                            return 'assets/icons/html-file.svg';
                        } else if (mimeType.includes('css')) {
                            return 'assets/icons/css-file.svg';
                        } else if (mimeType.includes('json')) {
                            return 'assets/icons/json-file.svg';
                        } else if (mimeType.includes('markdown')) {
                            return 'assets/icons/md-file.svg';
                        } else {
                            return 'assets/icons/text-file.svg';
                        }
                    },
                    getFileTypeLabel: (mimeType) => {
                        return FileTypes.getFileTypeByMime(mimeType)?.displayName || 'Text';
                    },
                    onSelect: async (file) => {
                        try {
                            console.log('onSelect called with file:', file);
                            if (!file) {
                                throw new Error('File object is undefined');
                            }
                            let fileName = file.name || 'Untitled.txt';
                            console.log('fileName:', fileName);
                            const folderId = file.folderId || 'root';
                            console.log('folderId:', folderId);
                            let selectedType = file.fileType || 'text/plain';
                            console.log('Selected file type from dialog:', selectedType);
                            try {
                                if (selectedType !== 'application/octet-stream') {
                                    // Only append extension if there is no extension present
                                    const lastDot = fileName.lastIndexOf('.');
                                    if (lastDot === -1 || lastDot === 0 || lastDot === fileName.length - 1) {
                                        // No extension or dot is at start/end, so append
                                        fileName += `.${FileTypes.getExtensionForMimeType(selectedType)}`;
                                        console.log(`Appended extension to filename: ${fileName}`);
                                    } else {
                                        // There is already an extension, do not append
                                        console.log('Filename already has an extension, not appending.');
                                    }
                                }
                            } catch (err) {
                                console.error('Error processing file type:', err);
                                if (!fileName.toLowerCase().endsWith('.txt')) {
                                    fileName += '.txt';
                                    console.log(`Added default extension: ${fileName}`);
                                }
                            }

                            // Check for existing file with the same name in the selected folder
                            const checkQuery = `name = '${fileName.replace(/'/g, "\\'")}' and '${folderId}' in parents and trashed = false`;
                            const checkUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(checkQuery)}&fields=files(id,name)`;
                            const checkResp = await fetch(checkUrl, {
                                headers: {
                                    'Authorization': `Bearer ${accessToken}`
                                }
                            });
                            if (!checkResp.ok) {
                                throw new Error('Failed to check for existing file');
                            }
                            const checkData = await checkResp.json();
                            if (checkData.files && checkData.files.length > 0) {
                                // File exists, prompt user to overwrite or cancel
                                const confirmOverwrite = window.confirm(`A file named "${fileName}" already exists in this folder. Do you want to overwrite it? Click OK to overwrite, or Cancel to abort.`);
                                if (!confirmOverwrite) {
                                    resolve(false);
                                    return;
                                }
                                // Overwrite: use PATCH to update the file in place (do not set parents)
                                const existingFileId = checkData.files[0].id;
                                const patchResp = await fetch(
                                    `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`,
                                    {
                                        method: 'PATCH',
                                        headers: {
                                            'Authorization': `Bearer ${accessToken}`,
                                            'Content-Type': 'multipart/related; boundary="boundary"'
                                        },
                                        // Only set name in metadata, do not set parents
                                        body: GDriveFile.createMultipartBody(mimeType, { name: fileName }, content)
                                    }
                                );
                                if (!patchResp.ok) {
                                    throw new Error(`Failed to overwrite file: ${patchResp.statusText}`);
                                }
                                const result = await patchResp.json();
                                // Set fileId to the existing file's ID
                                fileInstance.fileId = existingFileId;
                                fileInstance.fileName = fileName;
                                fileInstance.filePath = fileName;
                                fileInstance.markAsSaved();
                                fileInstance.invalidatePathCache();
                                await fileInstance.updateViewedByMeTime();
                                document.title = `${fileName} - ChromEd`;
                                const fileTypeElement = document.getElementById('file-type');
                                if (fileTypeElement) {
                                    fileTypeElement.textContent = `Google Drive: ${selectedType.toUpperCase()}`;
                                }
                                resolve(fileInstance);
                                return;
                            }

                            // No file exists, proceed to create new file
                            const metadata = {
                                name: fileName,
                                parents: folderId ? [folderId] : ['root']
                            };
                            console.log('Saving file with metadata:', metadata);
                            const response = await fetch(
                                'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
                                {
                                    method: 'POST',
                                    headers: {
                                        'Authorization': `Bearer ${accessToken}`,
                                        'Content-Type': 'multipart/related; boundary="boundary"'
                                    },
                                    body: GDriveFile.createMultipartBody(mimeType, metadata, content)
                                }
                            );
                            if (!response.ok) {
                                throw new Error(`Failed to create file: ${response.statusText}`);
                            }
                            const result = await response.json();
                            fileInstance.fileId = result.id;
                            fileInstance.fileName = fileName;
                            fileInstance.filePath = fileName;
                            fileInstance.markAsSaved();
                            fileInstance.invalidatePathCache();
                            await fileInstance.updateViewedByMeTime();
                            document.title = `${fileName} - ChromEd`;
                            const fileTypeElement = document.getElementById('file-type');
                            if (fileTypeElement) {
                                fileTypeElement.textContent = `Google Drive: ${selectedType.toUpperCase()}`;
                            }
                            resolve(fileInstance);
                        } catch (error) {
                            reject(error);
                        }
                    },
                    onCancel: () => {
                        resolve(false); // Return the current file instance on cancel
                    }
                });
                
                // Set suggested filename if provided (as a fallback in case initialFileName didn't work)
                if (fileName && !fileInstance.elements?.fileName?.value) {
                    setTimeout(() => {
                        const fileNameInput = document.getElementById('file-name');
                        if (fileNameInput && !fileNameInput.value) {
                            fileNameInput.value = fileName;
                            console.log('Set suggested filename (fallback):', fileName);
                        }
                    }, 100);
                }
            });
        } catch (error) {
            throw new Error(`Failed to save Google Drive file: ${error.message}`);
        }
    }

    // Load file content from Google Drive (refresh)
    async load() {

        if (!this.fileId) {
            throw new Error('No file ID available');
        }
        const accessToken = await GDriveFile.getValidAccessToken();

        try {
            const response = await fetch(
                `https://www.googleapis.com/drive/v3/files/${this.fileId}?alt=media`,
                {
                    headers: {
                            'Authorization': `Bearer ${accessToken}`
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`Failed to load file: ${response.statusText}`);
            }

            this.content = await response.text();
            this.markAsSaved();
            return this.content;
        } catch (error) {
            throw new Error(`Failed to load Google Drive file: ${error.message}`);
        }
    }

    // Create multipart body for file upload
    static createMultipartBody(mimeType, metadata, content) {
        const delimiter = 'boundary';
        const close_delim = `\r\n--${delimiter}--`;
        
        let body = `--${delimiter}\r\n`;
        body += 'Content-Type: application/json\r\n\r\n';
        body += JSON.stringify(metadata) + '\r\n';
        body += `--${delimiter}\r\n`;
        body += `Content-Type: ${mimeType}\r\n\r\n`;
        body += content;
        body += close_delim;
        
        return body;
    }

    // Check if file has a valid Google Drive file ID
    hasFileId() {
        return !!this.fileId;
    }

    // Get Google Drive file ID
    getFileId() {
        return this.fileId;
    }

    // Set Google Drive file ID
    setFileId(fileId) {
        this.fileId = fileId;
    }
    
    // Set file handle for compatibility with LocalFile
    setFileHandle(fileHandle) {
        // For Google Drive files, we use the fileHandle parameter as the file ID
        this.fileId = fileHandle;
        console.log(`File handle set for: ${this.fileName}`, fileHandle ? 'Valid' : 'Null');
    }
    
    // Implement hasFileHandle for compatibility with LocalFile
    hasFileHandle() {
        // Google Drive files don't use file handles, but we can consider a file ID as equivalent
        return !!this.fileId;
    }
    
    // Implement getFileHandle for compatibility with LocalFile
    getFileHandle() {
        // For Google Drive files, return the file ID as a handle equivalent
        return this.fileId;
    }
    
    // Implement hasValidFileHandle for compatibility with LocalFile
    async hasValidFileHandle() {
        if (!this.fileId) return false;
        
        try {
            // Verify file is still accessible by fetching its metadata
                const accessToken = await GDriveFile.getValidAccessToken();
                if (!accessToken) return false;
            
            const response = await fetch(
                `https://www.googleapis.com/drive/v3/files/${this.fileId}?fields=id`,
                {
                    headers: {
                            'Authorization': `Bearer ${accessToken}`
                    }
                }
            );
            
            return response.ok;
        } catch (error) {
            console.error('Error validating file handle:', error);
            return false;
        }
    }

    // Deprecated: getAccessToken/setAccessToken removed. Use static token management.

    // Create a new unsaved Google Drive file
    static createNew(fileName) {
        return new GDriveFile(fileName, '', null, null);
    }

    // Serialize for storage
    serialize() {
        const base = super.serialize();
        console.debug(`[GDriveFile::serialize] Serializing file ${this.fileName} with fileId: ${this.fileId}`);
        return {
            ...base,
            fileId: this.fileId,
            mimeType: this.mimeType,
            parents: this.parents
        };
    }

    // Deserialize from storage    // Check if file is stored on Google Drive
    // Get the formatted path for display
    async getFormattedPath() {
        // Return cached path if available
        if (this.cachedPath) {
            return this.cachedPath;
        }

        // If a request is already in progress, return that promise
        if (this.pathRequestInProgress) {
            return this.pathRequestInProgress;
        }

        if (!this.fileId) {
            return 'Google Drive';
        }

        // Create a new request and store the promise
        this.pathRequestInProgress = this._fetchFormattedPath();
        
        try {
            // Wait for the result
            const result = await this.pathRequestInProgress;
            // Clear the in-progress request
            this.pathRequestInProgress = null;
            return result;
        } catch (error) {
            // Clear the in-progress request on error
            this.pathRequestInProgress = null;
            throw error;
        }
    }

    // Fetch path with optimized algorithm
    async _fetchFormattedPath() {
        if (!this.fileId) {
            return 'Google Drive';
        }

        try {
            const accessToken = await GDriveFile.getValidAccessToken();
            // Optimization: Get all parent info in a batch request when possible
            // First, get the file details
            const fileResponse = await fetch(
                `https://www.googleapis.com/drive/v3/files/${this.fileId}?fields=id,name,parents`,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    }
                }
            );

            if (!fileResponse.ok) {
                return 'Google Drive';
            }

            const fileData = await fileResponse.json();
            
            // If there are no parents, just return "Google Drive"
            if (!fileData.parents || fileData.parents.length === 0) {
                const path = 'Google Drive/' + this.fileName;
                this.cachedPath = path;
                return path;
            }

            // Build the path using an iterative approach instead of recursion
            const path = await this._buildPathIteratively(fileData.parents[0]);
            const fullPath = path + '/' + this.fileName;
            
            // Cache the result
            this.cachedPath = fullPath;
            
            return fullPath;
        } catch (error) {
            console.error('Error getting formatted path:', error);
            return 'Google Drive/' + this.fileName;
        }
    }

    // Build path iteratively to avoid deep recursion
    async _buildPathIteratively(startFolderId) {
        if (startFolderId === 'root') {
            return 'My Drive';
        }

        // Keep track of visited folders to handle potential circular references
        const visited = new Set();
        
        // Use an array to build the path in reverse (from child to parent)
        const pathParts = [];
        let currentFolderId = startFolderId;

        try {
            // Process up to 10 levels deep to prevent infinite loops
            // and excessive API calls
            for (let i = 0; i < 10 && currentFolderId && currentFolderId !== 'root'; i++) {
                // Avoid circular references
                if (visited.has(currentFolderId)) {
                    break;
                }
                visited.add(currentFolderId);

                // Get folder details
                const accessToken = await GDriveFile.getValidAccessToken();
                const response = await fetch(
                    `https://www.googleapis.com/drive/v3/files/${currentFolderId}?fields=id,name,parents`,
                    {
                        headers: {
                            'Authorization': `Bearer ${accessToken}`
                        }
                    }
                );

                if (!response.ok) {
                    break;
                }

                const folderData = await response.json();
                
                // Add folder name to path parts
                pathParts.unshift(folderData.name);
                
                // Move to parent folder or exit if no parent
                if (!folderData.parents || folderData.parents.length === 0) {
                    break;
                }
                
                currentFolderId = folderData.parents[0];
                
                // If we've reached root, add "My Drive" and exit
                if (currentFolderId === 'root') {
                    pathParts.unshift('My Drive');
                    break;
                }
            }

            // If we didn't reach root or have no path parts, prepend "Google Drive"
            if (pathParts.length === 0 || pathParts[0] !== 'My Drive') {
                pathParts.unshift('Google Drive');
            }

            // Join path parts and return
            return pathParts.join('/');
        } catch (error) {
            console.error('Error building path iteratively:', error);
            return 'Google Drive';
        }
    }

    // Invalidate cached path
    invalidatePathCache() {
        this.cachedPath = null;
    }
    
    // Helper method to update the viewedByMeTime of a file
    // This ensures files appear in the Recent list immediately after saving
    async updateViewedByMeTime() {
        if (!this.fileId) return;
        
        try {
            const accessToken = await GDriveFile.getValidAccessToken();
            // Simply fetch the file metadata to update viewedByMeTime
            await fetch(
                `https://www.googleapis.com/drive/v3/files/${this.fileId}?fields=id,name`,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    }
                }
            );
            
            console.log('Updated viewedByMeTime for file:', this.fileName);
        } catch (error) {
            console.error('Error updating viewedByMeTime:', error);
            // Don't throw an error as this is a non-critical operation
        }
    }

    isCloudFile() {
        return true;
    }

    // Get sharing URL (if file is shareable)
    async getSharingUrl() {
        if (!this.fileId) {
            return null;
        }

        try {
            const accessToken = await GDriveFile.getValidAccessToken();
            const response = await fetch(
                `https://www.googleapis.com/drive/v3/files/${this.fileId}?fields=webViewLink`,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`Failed to get sharing URL: ${response.statusText}`);
            }

            const data = await response.json();
            return data.webViewLink;
        } catch (error) {
            console.error('Failed to get sharing URL:', error);
            return null;
        }
    }
}