const { app, BrowserWindow, Menu, dialog, ipcMain, shell } = require('electron');
const path = require('path');
const url = require('url');
const { autoUpdater } = require('electron-updater');
const isDev = require('electron-is-dev');
const fs = require('fs');
const Store = require('electron-store');

// Initialize Store for app settings
const store = new Store();

// Auto-update configuration
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

// Keep a global reference of the window object to avoid garbage collection
let mainWindow;

// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (require('electron-squirrel-startup')) {
  app.quit();
}

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
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
    icon: path.join(__dirname, '../../assets/icons/icon.png'),
    show: false, // Don't show until ready to avoid flashing
    backgroundColor: '#f5f5f5',
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
  const startUrl = isDev
    ? 'http://localhost:3000' // React dev server
    : url.format({
        pathname: path.join(__dirname, '../../build/index.html'),
        protocol: 'file:',
        slashes: true,
      });

  mainWindow.loadURL(startUrl)
    .catch(err => {
      console.error('Failed to load application:', err);
      dialog.showErrorBox(
        'Application Error',
        `Failed to load the application: ${err.message}`
      );
    });

  // Show the window when ready to avoid flashing
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Check for updates in production
    if (!isDev) {
      autoUpdater.checkForUpdatesAndNotify()
        .catch(err => {
          console.error('Failed to check for updates:', err);
        });
    }
  });

  // Open DevTools in development mode
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // Open external links in the default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Only allow specific protocols
    if (url.startsWith('https:') || url.startsWith('http:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Window closed event
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  
  // Create and set application menu
  createApplicationMenu();
}

// Create the application menu
function createApplicationMenu() {
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
          label: 'Preferences',
          accelerator: 'CmdOrCtrl+,',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu:preferences');
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
        ...(isDev ? [{ role: 'toggleDevTools' }] : []),
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(process.platform === 'darwin'
          ? [
              { type: 'separator' },
              { role: 'front' },
              { type: 'separator' },
              { role: 'window' },
            ]
          : [{ role: 'close' }]),
      ],
    },
    {
      role: 'help',
      submenu: [
        {
          label: 'Learn More',
          click: async () => {
            await shell.openExternal('https://github.com/rileylemm/collabication');
          },
        },
        {
          label: 'Documentation',
          click: async () => {
            await shell.openExternal('https://github.com/rileylemm/collabication/wiki');
          },
        },
        { type: 'separator' },
        {
          label: 'About',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              title: 'About Collabication',
              message: 'Collabication',
              detail: `Version: ${app.getVersion()}\nAn agent-native collaboration platform that integrates humans and AI agents for knowledge work.\n\n© 2023 Collabication Team`,
              buttons: ['OK'],
              icon: path.join(__dirname, '../../assets/icons/icon.png'),
            });
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

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
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
  
  // Check for app updates every hour in production
  if (!isDev) {
    setInterval(() => {
      autoUpdater.checkForUpdatesAndNotify()
        .catch(err => {
          console.error('Failed to check for updates:', err);
        });
    }, 60 * 60 * 1000); // 1 hour
  }
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

// Auto-updater events
autoUpdater.on('update-available', (info) => {
  dialog.showMessageBox({
    type: 'info',
    title: 'Update Available',
    message: `A new version (${info.version}) is available!`,
    detail: 'It will be downloaded in the background. You will be notified when it is ready to install.',
    buttons: ['OK'],
  });
});

autoUpdater.on('update-downloaded', (info) => {
  dialog.showMessageBox({
    type: 'info',
    title: 'Update Ready',
    message: 'Update Downloaded',
    detail: `Version ${info.version} has been downloaded and will be installed when you quit the application.`,
    buttons: ['Restart Now', 'Later'],
  }).then((returnValue) => {
    if (returnValue.response === 0) {
      autoUpdater.quitAndInstall();
    }
  });
});

// Handle errors
autoUpdater.on('error', (err) => {
  console.error('Auto-updater error:', err);
});

// Error handling
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  
  dialog.showErrorBox(
    'Application Error',
    `An unexpected error occurred: ${error.message}\n\nThe application will now close.`
  );
  
  // Attempt to create a log file
  try {
    const logPath = path.join(app.getPath('userData'), 'error.log');
    const logContent = `
      Time: ${new Date().toISOString()}
      Error: ${error.message}
      Stack: ${error.stack}
    `;
    fs.appendFileSync(logPath, logContent);
  } catch (logError) {
    console.error('Failed to write error log:', logError);
  }
  
  app.quit();
}); 