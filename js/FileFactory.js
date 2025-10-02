// FileFactory.js
class FileFactory {

    static getFileNameByCounter(counter) {
        return `New ${counter}`;
    }

    static createLocalFile(counter = 1) {
        return LocalFile.createNew(FileFactory.getFileNameByCounter(counter));
    }
    static createGDriveFile(counter = 1) {
        return GDriveFile.createNew(FileFactory.getFileNameByCounter(counter));
    }
    
    static createGDriveFileFromData(data) {
        const cefile = CEFile.deserialize(data);
        const file = new GDriveFile(
            cefile.fileName,
            cefile.content,
            cefile.filePath,
        );
        
        file.fileId = data.fileId || null;
        file.mimeType = data.mimeType || 'text/plain';
        file.parents = data.parents;

        file.modified = data.modified || false;
        file.lastModified = data.lastModified || null;
        
        return file;
    }

    static createLocalFileFromData(data) {
        const cefile = CEFile.deserialize(data);
        const file = new LocalFile(
            cefile.fileName,
            cefile.content,
            cefile.filePath,
            null // File handle will be restored separately
        );

        file.modified = data.modified || false;
        file.lastModified = data.lastModified || null;
        
        return file;
    }


    static createTemporaryFile(counter = 1) {
        return TemporaryFile.createNew(FileFactory.getFileNameByCounter(counter));
    }

    static createTemporaryFileFromData(data) {
        let file = new TemporaryFile(data.fileName, data.content, data.filePath);

        // Restore lastModified if available
        if (data.lastModified) {
            file.lastModified = data.lastModified;
        }
        return file;
    }

    static async saveAs(file, suggestedName) {
        		// Use the custom dialog module
		console.log('[FileFactory] save() called. Prompting user to choose file type for saving.');
		const result = await TemporaryFileSaveDlg.show();
		let fileInstance;
		if (result === 'local') {
            return LocalFile.saveAs(suggestedName || file.fileName, file.content);
		} else if (result === 'gdrive') {

            return GDriveFile.saveAs(suggestedName || file.fileName, file.content);
		} else {
			// Cancelled
			return file; // Return same instance
		}
    }
}