const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  // File system operations
  filesystem: {
    getAppPath: () => ipcRenderer.invoke('get-app-path'),
  },
  
  // App menu events
  menu: {
    onNewDocument: (callback) => {
      ipcRenderer.on('menu:new-document', callback);
      return () => {
        ipcRenderer.removeListener('menu:new-document', callback);
      };
    },
    onOpenDocument: (callback) => {
      ipcRenderer.on('menu:open-document', callback);
      return () => {
        ipcRenderer.removeListener('menu:open-document', callback);
      };
    },
    onSave: (callback) => {
      ipcRenderer.on('menu:save', callback);
      return () => {
        ipcRenderer.removeListener('menu:save', callback);
      };
    },
    onAbout: (callback) => {
      ipcRenderer.on('menu:about', callback);
      return () => {
        ipcRenderer.removeListener('menu:about', callback);
      };
    },
  },
  
  // App version
  version: process.env.npm_package_version,
}); 