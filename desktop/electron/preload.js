const{contextBridge,ipcRenderer}=require("electron")

contextBridge.exposeInMainWorld("electronAPI",{
    isBinary:()=>ipcRenderer.invoke("is-binary"),
    readFile:path=>ipcRenderer.invoke("fs-read",path),
    writeFile:(path,content)=>ipcRenderer.invoke("fs-write",path,content),
    readFileB:path=>ipcRenderer.invoke("fs-read-b",path),
    writeFileB:(path,content)=>ipcRenderer.invoke("fs-write-b",path,content),
    exist:path=>ipcRenderer.invoke("fs-exist",path),
    listDir:path=>ipcRenderer.invoke("fs-list",path),
    fullscreen:enable=>ipcRenderer.invoke("fullscreen",enable)
})