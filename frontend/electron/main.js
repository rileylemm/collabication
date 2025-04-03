const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const url = require('url');
const Store = require('electron-store');

// Initialize Store for app settings
const store = new Store();

// Keep a global reference of the window object to avoid garbage collection
let mainWindow;

// Create the main window
function createWindow() {
  // Get saved window dimensions or use defaults
  const windowState = store.get('windowState', {
    width: 1200,
    height: 800,
    x: undefined,
    y: undefined,
    maximized: false,
  });

  // Create the browser window
  mainWindow = new BrowserWindow({
    width: windowState.width,
    height: windowState.height,
    x: windowState.x,
    y: windowState.y,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false, // Don't show until ready to avoid flashing
  });

  // Maximize if the window was maximized previously
  if (windowState.maximized) {
    mainWindow.maximize();
  }
  
  // Save window position and dimensions on close
  mainWindow.on('close', () => {
    const isMaximized = mainWindow.isMaximized();
    const bounds = mainWindow.getBounds();
    
    store.set('windowState', {
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y,
      maximized: isMaximized,
    });
  });

  // Load the correct URL based on environment
  const startUrl = process.env.NODE_ENV === 'development'
    ? 'http://localhost:3000' // React dev server
    : url.format({
        pathname: path.join(__dirname, '../../build/index.html'),
        protocol: 'file:',
        slashes: true,
      });

  mainWindow.loadURL(startUrl);

  // Show the window when ready to avoid flashing
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open DevTools in development mode
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // Window closed event
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  
  // Create and set application menu
  const menu = Menu.buildFromTemplate(createMenuTemplate());
  Menu.setApplicationMenu(menu);
}

// Create menu template
function createMenuTemplate() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Document',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu:new-document');
            }
          },
        },
        {
          label: 'Open Document',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu:open-document');
            }
          },
        },
        { type: 'separator' },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu:save');
            }
          },
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Alt+F4',
          click: () => {
            app.quit();
          },
        },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'delete' },
        { type: 'separator' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu:about');
            }
          },
        },
      ],
    },
  ];

  // Add extra menu items for macOS
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    });
  }

  return template;
}

// App ready event
app.whenReady().then(() => {
  createWindow();

  // On macOS, recreate window when dock icon is clicked and no windows are open
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit app when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle IPC events from renderer process
ipcMain.handle('get-app-path', () => {
  return app.getPath('userData');
}); 