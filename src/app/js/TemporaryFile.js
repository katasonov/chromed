// TemporaryFile.js - Stub implementation of File.js inherited class
class TemporaryFile extends CEFile {

    static createNew(fileName) {
        return new TemporaryFile(fileName);
    }

	constructor(fileName, content = '', filePath = null) {
		super(fileName, content, filePath);		
	}


    isModified() {
        return true; // Always consider temporary files as modified
    }

	/**
	 * Show a dialog to pick Local or GDrive file option, then delegate saveAs to the chosen file type.
	 * Replaces this TemporaryFile instance with the new file instance if successful.
	 * Returns true if saved, false otherwise.
	 */
	async save() {
		// Use the custom dialog module
		console.log('[TemporaryFile] save() called. Prompting user to choose file type for saving.');
		return FileFactory.saveAs(this);
	}

	async load() {
		return this.content; // Nothing to load for temporary file
	}

}
