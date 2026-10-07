const {app, BrowserWindow} = require("electron")
const path = require("path")
const port=3000
app.once("ready", () => {
    const window = new BrowserWindow({
        autoHideMenuBar: true,
    })
    window.setTitle("Surgemd")
    window.loadURL(`http://localhost:${port}`,{
    })
});