import { app, BrowserWindow, session, Menu } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';

const {ipcMain } = require('electron');

// Remove the menu bar (File, Edit, View, Window, Help)
Menu.setApplicationMenu(null);
// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}



const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    titleBarStyle: 'default',
    frame: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: false, // Disabled for security - enable only if needed
      plugins: true, // Enable PDF viewer plugin
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  // Open DevTools only in development mode
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.webContents.openDevTools();
  }

  // Handle new windows (like PDF viewer) - ensure they have PDF plugin enabled
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Allow blob URLs for PDFs to open in a new window with proper settings
    if (url.startsWith('blob:')) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 800,
          height: 600,
          webPreferences: {
            plugins: true, // Enable PDF viewer plugin
            contextIsolation: true,
            nodeIntegration: false,
          }
        }
      };
    }
    return { action: 'allow' };
  });
};


// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Check if running in development mode
  const isDev = !!MAIN_WINDOW_VITE_DEV_SERVER_URL;

  // Set Content Security Policy
  // In development: Allow unsafe-inline/eval for Vite HMR
  // In production: Strict CSP without unsafe-inline/eval
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const scriptSrc = isDev
      ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
      : "script-src 'self'; ";

    // Note: 'unsafe-inline' kept for style-src because React's style prop creates inline styles
    // This is a lower security risk than script unsafe-inline
    const styleSrc = "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; ";

    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; " +
          scriptSrc +
          styleSrc +
          "font-src 'self' https://fonts.gstatic.com data:; " +
          "img-src 'self' data: blob: https:; " +
          "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.cloudfunctions.net wss://*.firebaseio.com https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com; " +
          "frame-src 'self' blob: data:; " +
          "object-src 'self' blob: data:;"
        ]
      }
    });
  });

  createWindow();

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.



ipcMain.on('salir-app', () => {
  app.quit();
});