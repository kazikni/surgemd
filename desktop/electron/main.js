const{app,BrowserWindow,protocol,net,Menu,ipcMain}=require("electron")
const path=require("path")
const fsp=require("fs/promises")
const fs=require("fs")
const{pathToFileURL}=require("url")

protocol.registerSchemesAsPrivileged([{
    scheme:"app",
    privileges:{
        standard:true,
        secure:true,
        supportFetchAPI:true,
        corsEnabled:true,
        stream:true
    }
}])

function createWindow(){
    const win=new BrowserWindow({
        width:1280,
        height:720,
        webPreferences:{
            devTools:true,
            preload:path.join(__dirname,"preload.js")
        }
    })
    //win.webContents.openDevTools();

    ipcMain.handle("is-binary",()=>true)
    ipcMain.handle("fs-make-dir",(_,path)=>fsp.mkdir(path))
    ipcMain.handle("fs-read",async(_,path)=>{
        return await fsp.readFile(path,"utf8")
    })
    ipcMain.handle("fs-write",async(_,path,content)=>{
        await fsp.writeFile(path,content,{encoding:"utf8"})
    })
    ipcMain.handle("fs-read-b",async(_,path)=>{
        return (await fsp.readFile(path)).toString("base64")
    })
    ipcMain.handle("fs-write-b",async(_,path,content)=>{
        await fsp.writeFile(path,Buffer.from(content,"base64"))
    })
    ipcMain.handle("fs-exist",async(_,path)=>{
        try{
            await fsp.access(path)
            return true
        }catch{
            return false
        }
    })
    ipcMain.handle("fs-list",async(_,path)=>{
        return await fs.readdir(path)
    })
    ipcMain.handle("fullscreen",async(_,enable)=>{
        win?.setFullScreen?.(enable)
    })

    win.loadURL("app://index.html")
    Menu.setApplicationMenu(null)

    win.webContents.on("did-fail-load",(e,code,desc,url)=>{
        console.error("Failed:",code,desc,url)
    })
}

app.whenReady().then(()=>{
    protocol.handle("app",request=>{
        const url=new URL(request.url)
        let pathname=decodeURIComponent(url.pathname)

        if(pathname==="/")pathname="/index.html"

        const filePath=path.normalize(
            path.join(__dirname,"../main",pathname)
        )

        return net.fetch(pathToFileURL(filePath).toString())
    })

    createWindow()
})