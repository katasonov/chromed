// File.js - Abstract File interface
class CEFile {
    constructor(fileName, content = '', filePath = null) {
        if (this.constructor === File) {
            throw new Error("File is an abstract class and cannot be instantiated directly");
        }
        this.fileName = fileName;
        this.content = content;
        this.filePath = filePath;
        this.modified = false;
    }

    // Abstract methods that must be implemented by subclasses
    // should return new file instance, same instance if canceled, or false on error
    async save() {
        throw new Error("save() method must be implemented");
    }

    async load() {
        throw new Error("load() method must be implemented");
    }

    // Common methods
    setContent(content) {
        console.log(`[FILE::setContent] File name: ${this.fileName}`);
        if (this.content !== content) {
            this.content = content;
            this.modified = true;
        }
    }

    getContent() {
        return this.content;
    }

    getFileName() {
        return this.fileName;
    }

    getFilePath() {
        return this.filePath;
    }

    isModified() {
        return this.modified;
    }

    markAsSaved() {
        this.modified = false;
    }

    markAsModified() {
        this.modified = true;
    }

    // Get file extension for syntax highlighting
    getExtension() {
        return this.fileName.split('.').pop().toLowerCase();
    }

    // Get CodeMirror mode based on file extension
    getMode() {
        const extension = this.getExtension();
        const modeMap = {
            'js': 'javascript',
            'json': 'javascript',
            'html': 'htmlmixed',
            'htm': 'htmlmixed',
            'css': 'css',
            'py': 'python',
            'java': 'text/x-java',
            'c': 'text/x-csrc',
            'cpp': 'text/x-c++src',
            'xml': 'xml',
            'md': 'markdown',
            'txt': 'text/plain',
            'factor': 'factor'
        };
        return modeMap[extension] || 'text/plain';
    }

    // Serialize for storage (without file handles)
    serialize() {
        return {
            fileName: this.fileName,
            content: this.content,
            filePath: this.filePath,
            modified: this.modified,
            type: this.constructor.name
        };
    }

    hasFileHandle() {
        // Override in subclasses that support file handles
        return false;
    }

    // Create file instance from serialized data
    static deserialize(data) {
        // This will be overridden by specific implementations
        const file = new this(data.fileName, data.content, data.filePath);
        file.modified = data.modified;
        return file;
    }
}