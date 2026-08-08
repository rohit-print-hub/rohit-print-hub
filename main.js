const { app, BrowserWindow } = require('electron');
const path = require('path');

// Aapka pehle wala backend server background me chalu karega
require('./server.js');

function createWindow() {
    const win = new BrowserWindow({
        width: 1000,
        height: 800,
        title: "Rohit Auto Print Hub",
        autoHideMenuBar: true, // Ye upar ka File/Edit menu chupa dega, taaki asli software lage
        icon: path.join(__dirname, 'Public', 'icon.png'), // (Optional) Agar aapke paas koi logo hai
        webPreferences: {
            nodeIntegration: true
        }
    });

    // Aapka Express server localhost:3000 par chal raha hai, use is window me load karega
    win.loadURL('http://localhost:3000');
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// Jab user red 'X' button dabaye, toh software poora band ho jaye
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});