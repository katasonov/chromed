// HistoryManager.js - Utility functions for handling CodeMirror history
class HistoryManager {
    // LZString-inspired compression for editor history
    static compressHistory(history) {
        if (!history) return null;
        
        try {
            // Create a deep copy of the history to avoid modifying the original
            const historyCopy = JSON.parse(JSON.stringify(history));
            
            // Simple compression - for a real implementation, consider using a library like lz-string
            const compressed = {
                done: this.compressChangeList(historyCopy.done),
                undone: this.compressChangeList(historyCopy.undone)
            };
            
            return compressed;
        } catch (error) {
            console.error('Error compressing history:', error);
            return null;
        }
    }
    
    static compressChangeList(changes) {
        if (!changes || !Array.isArray(changes)) return [];
        
        return changes.map(change => {
            // Basic compression of common data patterns in history entries
            const compressed = { ...change };
            
            // Reduce selectionAfter and selectionBefore to minimal form if they exist
            if (compressed.selectionBefore) {
                compressed.selectionBefore = this.compressSelection(compressed.selectionBefore);
            }
            if (compressed.selectionAfter) {
                compressed.selectionAfter = this.compressSelection(compressed.selectionAfter);
            }
            
            // For changes, keep them as is - they are important for undo/redo
            
            return compressed;
        });
    }
    
    static compressSelection(selection) {
        // Only keep essential selection information
        if (!selection) return null;
        
        return {
            anchor: selection.anchor,
            head: selection.head
        };
    }
    
    static decompressHistory(compressed) {
        if (!compressed) return null;
        
        try {
            // Create a new history object with decompressed data
            return {
                done: compressed.done || [],
                undone: compressed.undone || []
            };
        } catch (error) {
            console.error('Error decompressing history:', error);
            return null;
        }
    }
    
    // Helper to check if a history is valid for restoration
    static isValidHistory(history) {
        return history && 
               typeof history === 'object' && 
               Array.isArray(history.done) && 
               Array.isArray(history.undone);
    }
    
    // Limit history size to prevent storage issues
    static limitHistorySize(history, maxSteps = 50) {
        if (!this.isValidHistory(history)) return null;
        
        const limited = {
            done: history.done.slice(-maxSteps),
            undone: history.undone.slice(-maxSteps)
        };
        
        return limited;
    }
    
    // Create a clean empty history
    static createCleanHistory() {
        return {
            done: [],
            undone: []
        };
    }
}

// For browser environments
if (typeof window !== 'undefined') {
    window.HistoryManager = HistoryManager;
}

// For module environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HistoryManager;
}
