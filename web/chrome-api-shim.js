/**
 * Chrome API Shim for Web Version
 * Replaces chrome.storage with localStorage
 * Allows extension code to run in regular browser
 */

console.log('🌐 Chrome API Shim loaded (Web Version)');

// Create a mock chrome object if it doesn't exist
if (typeof chrome === 'undefined') {
    window.chrome = {};
}

// Mock chrome.storage.local with localStorage
if (!chrome.storage) {
    chrome.storage = {
        local: {
            get: function(keys, callback) {
                try {
                    const result = {};
                    
                    if (keys === null || keys === undefined) {
                        // Get all items
                        for (let i = 0; i < localStorage.length; i++) {
                            const key = localStorage.key(i);
                            try {
                                result[key] = JSON.parse(localStorage.getItem(key));
                            } catch (e) {
                                result[key] = localStorage.getItem(key);
                            }
                        }
                    } else if (Array.isArray(keys)) {
                        // Get multiple items
                        keys.forEach(key => {
                            const value = localStorage.getItem(key);
                            if (value !== null) {
                                try {
                                    result[key] = JSON.parse(value);
                                } catch (e) {
                                    result[key] = value;
                                }
                            }
                        });
                    } else if (typeof keys === 'object') {
                        // Get items with defaults
                        Object.keys(keys).forEach(key => {
                            const value = localStorage.getItem(key);
                            if (value !== null) {
                                try {
                                    result[key] = JSON.parse(value);
                                } catch (e) {
                                    result[key] = value;
                                }
                            } else {
                                result[key] = keys[key]; // Use default
                            }
                        });
                    } else if (typeof keys === 'string') {
                        // Get single item
                        const value = localStorage.getItem(keys);
                        if (value !== null) {
                            try {
                                result[keys] = JSON.parse(value);
                            } catch (e) {
                                result[keys] = value;
                            }
                        }
                    }
                    
                    if (callback) callback(result);
                } catch (error) {
                    console.error('Storage get error:', error);
                    if (callback) callback({});
                }
            },
            
            set: function(items, callback) {
                try {
                    Object.keys(items).forEach(key => {
                        const value = items[key];
                        localStorage.setItem(key, JSON.stringify(value));
                    });
                    if (callback) callback();
                } catch (error) {
                    console.error('Storage set error:', error);
                    if (callback) callback();
                }
            },
            
            remove: function(keys, callback) {
                try {
                    if (Array.isArray(keys)) {
                        keys.forEach(key => localStorage.removeItem(key));
                    } else {
                        localStorage.removeItem(keys);
                    }
                    if (callback) callback();
                } catch (error) {
                    console.error('Storage remove error:', error);
                    if (callback) callback();
                }
            },
            
            clear: function(callback) {
                try {
                    localStorage.clear();
                    if (callback) callback();
                } catch (error) {
                    console.error('Storage clear error:', error);
                    if (callback) callback();
                }
            },
            
            getBytesInUse: function(keys, callback) {
                // Approximate size calculation
                try {
                    let totalBytes = 0;
                    
                    if (keys === null || keys === undefined) {
                        // Calculate all items
                        for (let i = 0; i < localStorage.length; i++) {
                            const key = localStorage.key(i);
                            const value = localStorage.getItem(key);
                            totalBytes += key.length + (value ? value.length : 0);
                        }
                    } else if (Array.isArray(keys)) {
                        keys.forEach(key => {
                            const value = localStorage.getItem(key);
                            if (value) {
                                totalBytes += key.length + value.length;
                            }
                        });
                    } else if (typeof keys === 'string') {
                        const value = localStorage.getItem(keys);
                        if (value) {
                            totalBytes += keys.length + value.length;
                        }
                    }
                    
                    // Multiply by 2 for UTF-16 encoding
                    if (callback) callback(totalBytes * 2);
                } catch (error) {
                    console.error('Storage getBytesInUse error:', error);
                    if (callback) callback(0);
                }
            }
        }
    };
}

// Mock chrome.runtime if needed
if (!chrome.runtime) {
    chrome.runtime = {
        lastError: null,
        getURL: function(path) {
            // Return relative path for web version
            return path.startsWith('/') ? path : './' + path;
        },
        sendMessage: function(message, callback) {
            console.log('Mock sendMessage:', message);
            if (callback) callback({ success: true });
        }
    };
}

// Mock chrome.tabs if needed (for extension compatibility)
if (!chrome.tabs) {
    chrome.tabs = {
        query: function(queryInfo, callback) {
            if (callback) callback([]);
        },
        sendMessage: function(tabId, message, callback) {
            console.log('Mock tabs.sendMessage:', message);
            if (callback) callback({ success: true });
        }
    };
}

console.log('✅ Chrome API Shim ready - localStorage backend active');
