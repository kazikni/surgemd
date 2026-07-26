export class WasmModule<t>{
    initialized:boolean=false
    module!: WebAssembly.Module
    instance!: WebAssembly.Instance
    exports!: t
    constructor(){
    }
    async load(bytes:BufferSource){
        this.module=await WebAssembly.compile(bytes)
        this.instance=(await WebAssembly.instantiate(bytes)).instance
        this.exports=this.instance.exports as WebAssembly.Exports as t
        this.initialized=true
    }
}