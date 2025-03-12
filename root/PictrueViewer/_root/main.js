const { app, BrowserWindow, Menu, dialog, clipboard, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const {  } = require('electron');

let mainWindow;
let lastImagePath = '';
let isAlwaysOnTop = false;

app.whenReady().then(() => {
    loadLastImage();
    createMainWindow();
    console.log('✅運行中');
});

function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        icon: path.join(`${__dirname}/assets/`, 'icon.ico'),
        alwaysOnTop: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    mainWindow.loadFile('./assets/html/index.html');
    createContextMenu(mainWindow);  // 對主視窗設置選單
    createMenu(mainWindow);  // 為主視窗設置應用程式菜單

    mainWindow.webContents.once('did-finish-load', () => {
        if (lastImagePath) {
            mainWindow.webContents.send('load-image', lastImagePath);
        }
    });
}

function createMenu(win) {
    const menu = Menu.buildFromTemplate([
        {
            label: '檔案',
            submenu: [
                { label: '開啟', click: openImage },
                { label: '另存新檔' },
                { type: "separator" },
                { label: '結束', click: app.quit }
            ]
        },
        {
            label: '編輯',
            submenu: [
                { label: '復原' },
                { label: '重做' },
                { type: "separator" },
                { label: '複製', click: copyImage },
                { label: '貼上', click: pasteImage},
                { type: "separator" },
                { label: '擷取畫面' }
            ]
        },
        {
            label: '檢視',
            submenu: [
                {
                    label: '最上層顯示',
                    type: 'checkbox',
                    checked: isAlwaysOnTop,                                         // 初始狀態
                    click: (menuItem) => {
                        isAlwaysOnTop = !isAlwaysOnTop;                      // 切換變數
                        mainWindow.setAlwaysOnTop(isAlwaysOnTop); // 設置窗口置頂狀態
                        menuItem.checked = isAlwaysOnTop;                 // 更新選單勾選狀態
                    }
                }
            ]
        },
        {
            label: '圖片',
            submenu: [
                { label: '水平鏡像' },
                { label: '垂直鏡像' },
                { type: "separator" },
                { label: '順時針旋轉 90°' },
                { label: '逆時針旋轉 90°' },
                { label: '旋轉 180°' },
                { type: "separator" },
                { label: 'test' },
            ]
        },
        {
            label: '工具',
            submenu: [
                { label: 'test' },
                {
                    label: '繪製',
                    submenu: [
                        { label: '畫筆', },
                        { label: '橡皮擦', },
                        { type: "separator" },
                        { label: '清除', },
                    ]
                }
            ]
        },
    ]);
    Menu.setApplicationMenu(menu);
}

function createContextMenu(win) {
    const contextMenu = Menu.buildFromTemplate([
        { label: '複製', click: copyImage },
        { label: '貼上', click: pasteImage},
        { label: 'test' }
    ]);

    win.webContents.on('context-menu', (event, params) => {
        contextMenu.popup({ window: win, x: params.x, y: params.y });
    });
}

function openImage() {
    const files = dialog.showOpenDialogSync(mainWindow, {
        filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif'] }]
    });
    if (files && files.length > 0) {
        loadImage(files[0]);
    }
}

function pasteImage() {
    const image = clipboard.readImage();
    if (image.isEmpty()) {
        console.log('❌剪貼簿內沒有圖片');
        return;
    }

    const savePath = path.join(__dirname, 'last-img.png'); // 固定存放位置
    const pngBuffer = image.toPNG(); // 轉成 PNG 格式

    fs.promises.writeFile(savePath, pngBuffer, (err) => {
        if (err) {
            console.error('圖片儲存失敗:', err);
            return;
        }
        console.log('圖片已儲存至', savePath);
        // mainWindow.webContents.send('load-image', savePath); // 更新畫面
    }).then(loadImage(savePath));
}

function loadImage(filepath) {
    lastImagePath = filepath;
    saveLastImage();
    mainWindow.webContents.send('load-image', filepath);
}

function saveLastImage() {
    fs.writeFileSync('config.json', JSON.stringify({ lastImagePath }, null, 4));
}

function loadLastImage() {
    if (fs.existsSync('config.json')) {
        const config = JSON.parse(fs.readFileSync('config.json'));
        lastImagePath = config.lastImagePath || '';
    }
}

function copyImage() {
    mainWindow.capturePage().then(image => {
        clipboard.writeImage(image);
    });
    /*
    if (!lastImagePath) return;
    const image = nativeImage.createFromPath(lastImagePath);  // 使用 nativeImage.createFromPath 來創建圖片
    clipboard.writeImage(image);  // 將圖片寫入剪貼簿
    */
}