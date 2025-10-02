// CacheStorage.js
// Handles persistent state storage for the editor (localStorage and Chrome storage)

const CacheStorage = {

    /**
     * Save global state, tabs, and file handles in one call.
     * @param {Object} globalState
     * @param {Object} tabMap - { tabId: tabData, ... }
     * @param {Map<string, FileSystemFileHandle>} fileHandles - Map of tabId to file handle
     */
    async save(globalState, tabMap = {}, fileHandles = new Map()) {
        // Save global state
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            const storageOps = { globalEditorState: globalState };
            for (const [key, value] of Object.entries(tabMap)) {
                storageOps[key] = value;
            }
            await chrome.storage.local.set(storageOps);
        } else {
            localStorage.setItem('globalEditorState', JSON.stringify(globalState));
            for (const [key, value] of Object.entries(tabMap)) {
                localStorage.setItem(key, JSON.stringify(value));
            }
        }
        // Save file handles using IndexedDB
        await CacheStorage._storeFileHandles(fileHandles);
    },

    /**
     * Internal: Store file handles in IndexedDB
     * @param {Map<string, FileSystemFileHandle>} fileHandles
     */
    async _storeFileHandles(fileHandles) {
        if (!('indexedDB' in window)) {
            console.warn('IndexedDB not available');
            return;
        }
        const db = await CacheStorage._openDB();
        const transaction = db.transaction(['fileHandles'], 'readwrite');
        const store = transaction.objectStore('fileHandles');
        // Clear existing handles
        await new Promise((resolve, reject) => {
            const request = store.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
        // Store current handles
        for (const [tabId, handle] of fileHandles) {
            try {
                await new Promise((resolve, reject) => {
                    const request = store.put({ tabId, handle });
                    request.onsuccess = () => resolve();
                    request.onerror = () => reject(request.error);
                });
            } catch (error) {
                console.error(`Failed to store file handle for tab ${tabId}:`, error);
            }
        }
        // Wait for transaction to complete
        await new Promise((resolve, reject) => {
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    },

    /**
     * Internal: Open IndexedDB for file handles
     */
    async _openDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('NotepadPlusEditor', 1);
            request.onerror = () => {
                console.error('IndexedDB error:', request.error);
                reject(request.error);
            };
            request.onsuccess = () => {
                resolve(request.result);
            };
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('fileHandles')) {
                    db.createObjectStore('fileHandles', { keyPath: 'tabId' });
                }
            };
        });
    },

    async saveTab(tabId, tabData) {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            const obj = {};
            obj[`tab_${tabId}`] = tabData;
            await chrome.storage.local.set(obj);
        } else {
            localStorage.setItem(`tab_${tabId}`, JSON.stringify(tabData));
        }
    },

    async saveTabsBulk(tabMap) {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            await chrome.storage.local.set(tabMap);
        } else {
            for (const [key, value] of Object.entries(tabMap)) {
                localStorage.setItem(key, JSON.stringify(value));
            }
        }
    },

    async removeTab(tabId) {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            await chrome.storage.local.remove([`tab_${tabId}`]);
        } else {
            localStorage.removeItem(`tab_${tabId}`);
        }
    },

    async loadGlobalState() {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            return new Promise((resolve) => {
                chrome.storage.local.get(['globalEditorState'], (result) => {
                    resolve(result.globalEditorState || null);
                });
            });
        } else {
            const data = localStorage.getItem('globalEditorState');
            return data ? JSON.parse(data) : null;
        }
    },

    async loadTab(tabId) {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            return new Promise((resolve) => {
                chrome.storage.local.get([`tab_${tabId}`], (result) => {
                    resolve(result[`tab_${tabId}`] || null);
                });
            });
        } else {
            const data = localStorage.getItem(`tab_${tabId}`);
            return data ? JSON.parse(data) : null;
        }
    },

    async removeOrphanedTabs(validTabIds) {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            // Not implemented: would require listing all keys
        } else {
            for (let key in localStorage) {
                if (key.startsWith('tab_')) {
                    const tabId = key.substring(4);
                    if (!validTabIds.includes(tabId)) {
                        localStorage.removeItem(key);
                    }
                }
            }
        }
    },

    /**
     * Remove orphaned file handles from IndexedDB (handles whose tabId is not in validTabIds).
     * @param {string[]} validTabIds
     */
    async removeOrphanedFileHandles(validTabIds) {
        if (!('indexedDB' in window)) {
            console.warn('IndexedDB not available');
            return;
        }
        const db = await CacheStorage._openDB();
        const transaction = db.transaction(['fileHandles'], 'readwrite');
        const store = transaction.objectStore('fileHandles');
        const allHandles = await new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
        for (const item of allHandles) {
            if (!validTabIds.includes(item.tabId)) {
                try {
                    await new Promise((resolve, reject) => {
                        const req = store.delete(item.tabId);
                        req.onsuccess = () => resolve();
                        req.onerror = () => reject(req.error);
                    });
                    console.log(`Removed orphaned file handle for tab: ${item.tabId}`);
                } catch (error) {
                    console.error(`Failed to remove orphaned file handle for tab ${item.tabId}:`, error);
                }
            }
        }
        await new Promise((resolve, reject) => {
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }    


};

