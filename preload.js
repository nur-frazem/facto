const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  salirApp: () => ipcRenderer.send('salir-app'),
  listPdfs: () => ipcRenderer.invoke('list-pdfs'), 
});


