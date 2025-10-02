// LocalFile.js - File System Access API implementation
class LocalFile extends CEFile {
    constructor(fileName, content = '', filePath = null, fileHandle = null) {
        super(fileName, content, filePath);
        this.fileHandle = fileHandle;
        this.lastModified = Date.now(); // Initialize with current timestamp
    }

    // Check if File System Access API is supported
    static isSupported() {
        return 'showOpenFilePicker' in window && 'showSaveFilePicker' in window;
    }

    // Create file from file handle (when opening existing file)
    static async fromFileHandle(fileHandle) {
        try {
            const file = await fileHandle.getFile();
            const content = await file.text();
            const newFile = new LocalFile(file.name, content, file.name, fileHandle);
            
            // Store the last modified timestamp for change detection
            newFile.lastModified = file.lastModified;
            
            // Update document title with the opened filename
            document.title = `${file.name} - ChromEd`;
            
            // Update status bar with file type info
            const fileTypeElement = document.getElementById('file-type');
            if (fileTypeElement) {
                const fileExt = file.name.split('.').pop().toUpperCase() || 'TXT';
                fileTypeElement.textContent = fileExt;
            }
            
            return newFile;
        } catch (error) {
            throw new Error(`Failed to load file: ${error.message}`);
        }
    }

   static async openFiles() {
    if (!LocalFile.isSupported()) {
        throw new Error("File System Access API is not supported");
    }

    try {
        // clone & fix fileTypes
        let fileTypes = FileTypes.getAllFileTypes().map(type => {
            if (type.displayName.toLowerCase() === 'all files') {
                return {
                    ...type,
                    mimeType: '*/*',
                    fileExtensions: []
                };
            }
            return type;
        });

        const fileHandles = await window.showOpenFilePicker({
            multiple: true,
            types: fileTypes.map(type => ({
                description: type.displayName,
                accept: {
                    [type.mimeType]: type.fileExtensions.map(
                        ext => '.' + ext.replace(/^\./, '')
                    )
                }
            }))
        });

        const files = [];
        for (const fileHandle of fileHandles) {
            const file = await LocalFile.fromFileHandle(fileHandle);
            file.markAsSaved(); // File is fresh from disk
            files.push(file);
        }
        return files;
    } catch (error) {
        if (error.name === 'AbortError') {
            return []; // User cancelled
        }
        throw new Error(`Failed to open files: ${error.message}`);
    }
}

    // Save file to existing location
    async save() {
        console.debug(`LocalFile.save started for file: ${this.fileName}`);
        
        if (!this.fileHandle) {
            console.debug(`No file handle, treating as Save As`);
            return await LocalFile.saveAs(this.fileName, this.content);
        }

        try {
            // Verify handle is still valid by checking permissions
            console.debug(`Checking file handle permissions`);
            const permission = await this.fileHandle.queryPermission({ mode: 'readwrite' });
            console.debug(`File permission status: ${permission}`);
            
            if (permission !== 'granted') {
                // Request permission again
                console.debug(`Permission not granted, requesting permission`);
                const newPermission = await this.fileHandle.requestPermission({ mode: 'readwrite' });
                console.debug(`New permission status: ${newPermission}`);
                
                if (newPermission !== 'granted') {
                    console.debug(` Permission denied after request`);
                    throw new Error('File permission denied');
                }
            }

            // First try to get the file to ensure the handle is still valid
            try {
                console.debug(`Testing file handle validity by getting file`);
                await this.fileHandle.getFile();
                console.debug(`File handle is valid`);
            } catch (error) {
                console.debug(` File handle is no longer valid:`, error);
                throw new Error('File handle is no longer valid, possibly due to external changes');
            }

            console.debug(`Writing to file...`);
            const writable = await this.fileHandle.createWritable();
            await writable.write(this.content);
            await writable.close();
            console.debug(`File write successful`);
            
            // Update last modified timestamp after saving
            const file = await this.fileHandle.getFile();
            this.lastModified = file.lastModified;
            
            this.markAsSaved();
            console.log('File saved successfully');
            return this;
        } catch (error) {
            // Handle might be stale or invalid - fall back to Save As
            console.warn('File handle invalid, falling back to Save As:', error);
            this.fileHandle = null; // Clear invalid handle
            try {
                return await LocalFile.saveAs(this.fileName, this.content);
            }  catch (e) {
                console.error(`Error saving file ${this.file.getFileName()}:`, e);
                // Fallback to download if FSA fails
                if (!LocalFile.isSupported()) {
                    this.download();
                    console.log('File downloaded as fallback');
                }
                return false; // Re-throw to notify caller
            }
        }
    }

    // Save file to new location
    static async saveAs(fileName, content) {
        let fileInstance = new LocalFile(fileName, content);
        if (!LocalFile.isSupported()) {
            fileInstance.download(); // Fallback to download
            //throw new Error("File System Access API is not supported");
            return false; // Assume download is successful
        }

        try {
            let fileTypes = FileTypes.getAllFileTypes().map(type => {
                if (type.displayName.toLowerCase() === 'all files') {
                    // replace the "All Files" record
                    return {
                        ...type,
                        mimeType: '*/*',
                        fileExtensions: []
                    };
                }
                return type;
            });
            const fileHandle = await window.showSaveFilePicker({
                suggestedName: fileName,
                types: fileTypes.map(type => ({
                    description: type.displayName,
                    accept: {
                        [type.mimeType]: type.fileExtensions.map(
                            ext => '.' + ext.replace(/^\./, '')
                        )
                    }
                }))
            });

            const writable = await fileHandle.createWritable();
            await writable.write(content);
            await writable.close();

            // Update file information
            const file = await fileHandle.getFile();

            fileInstance.fileName = file.name;
            fileInstance.filePath = file.name;
            fileInstance.fileHandle = fileHandle;
            fileInstance.lastModified = file.lastModified; // Store the timestamp
            fileInstance.markAsSaved();

            // Update document title with the new filename
            document.title = `${file.name} - ChromEd`;
            
            // Update status bar with file type info
            const fileTypeElement = document.getElementById('file-type');
            if (fileTypeElement) {
                const fileExt = file.name.split('.').pop().toUpperCase() || 'TXT';
                fileTypeElement.textContent = fileExt;
            }

            return fileInstance;
        } catch (error) {
            if (error.name === 'AbortError') {
                return false; // User cancelled
            }
            throw new Error(`Failed to save file: ${error.message}`);
        }
    }

    // Load file content (refresh from disk)
    async load() {
        if (!this.fileHandle) {
            throw new Error("No file handle available");
        }

        try {
            const file = await this.fileHandle.getFile();
            this.content = await file.text();
            this.markAsSaved();
            return this.content;
        } catch (error) {
            throw new Error(`Failed to load file: ${error.message}`);
        }
    }

    // Check if file has a valid handle
    async hasValidFileHandle() {
        if (!this.fileHandle) return false;
        
        try {
            // Try to query permission to verify handle is still valid
            const permission = await this.fileHandle.queryPermission({ mode: 'readwrite' });
            return permission === 'granted';
        } catch (error) {
            // Handle is invalid/stale
            return false;
        }
    }

    // Check if file has a valid handle
    hasFileHandle() {
        return !!this.fileHandle;
    }

    // Get file handle for persistence
    getFileHandle() {
        return this.fileHandle;
    }

    // Set file handle (used when restoring from storage)
    setFileHandle(fileHandle) {
        this.fileHandle = fileHandle;
        console.log(`File handle set for: ${this.fileName}`, fileHandle ? 'Valid' : 'Null');
    }
    
    // Check if the file has been modified externally
    async checkForExternalChanges() {
        if (!this.fileHandle || !this.lastModified) {
            return false; // No way to check without handle or last modified timestamp
        }
        
        try {
            const file = await this.fileHandle.getFile();
            const currentLastModified = file.lastModified;
            
            if (currentLastModified > this.lastModified) {
                console.log(`[LocalFile::checkForExternalChanges] File changed externally: ${this.fileName}, Last: ${this.lastModified}, Current: ${currentLastModified}`);
                return true;
            }
            
            return false;
        } catch (error) {
            console.error(`Error checking for external changes: ${error}`);
            return false;
        }
    }
    
    // Reload the file content from disk
    async load() {
        if (!this.fileHandle) {
            return false;
        }
        
        try {
            const file = await this.fileHandle.getFile();
            this.content = await file.text();
            this.lastModified = file.lastModified;
            this.markAsSaved();
            return true;
        } catch (error) {
            console.error(`Error reloading file from disk: ${error}`);
            return false;
        }
    }

    // Create a new unsaved file
    static createNew(fileName) {
        return new LocalFile(fileName, '', null, null);
    }

    // Serialize for storage
    serialize() {
        const base = super.serialize();
        return {
            ...base,
            hasFileHandle: !!this.fileHandle,
            lastModified: this.lastModified
        };
    }

    // Check if file is stored on Google Drive
    isCloudFile() {
        return false; // Local files are not cloud files
    }

    // Fallback download method
    download() {
        const blob = new Blob([this.content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = this.fileName;
        a.click();
        URL.revokeObjectURL(url);
        
        this.markAsSaved();
    }
}