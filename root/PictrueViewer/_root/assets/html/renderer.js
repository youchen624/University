const { ipcRenderer } = require('electron');
const wheelSpeed = 0.5;     //滾動速度

const img = document.getElementById('viewer');

ipcRenderer.on('load-image', (event, filePath) => {
    const timestamp = new Date().getTime();
    img.src = `file://${filePath}?t=${timestamp}`;
    img.style.width = 'auto';
    img.style.height = 'auto';
    document.title = filePath.split(path.sep).pop();
});

window.addEventListener('wheel', (e) => {
    if (e.ctrlKey) {
        const scaleAmount = e.deltaY > 0 ? 0.9 : 1.1;
        img.style.width = (img.clientWidth * scaleAmount) + 'px';
    } else if (e.shiftKey) {
        window.scrollBy(e.deltaY * wheelSpeed, 0);
    } else {
        window.scrollBy(0, e.deltaY * wheelSpeed);
    }
});
