export abstract class HTMLManager<Game> {
    protected game!: Game
    content:Record<string,HTMLElement>={}

    constructor(game:Game){
        this.game=game
    }
    register_html(name:string,elem?:HTMLElement){
        if(elem&&!this.content[name])this.content[name]=elem
    }
    init() {
        this.onInit()
    }
    destroy() {
        this.onDestroy()
    }

    protected abstract onInit(): void
    protected abstract onDestroy(): void
}
export abstract class UIModule<Game> {
    game!:Game
    root!:UIRoot<Game>
    constructor(){

    }
    init(game: Game,root:UIRoot<Game>): void{
        this.game=game
        this.root=root
        this.on_init()
    }
    update(dt: number): void{
        this.on_update(dt)
    }
    destroy(): void{
        this.on_destroy()
    }
    clear(): void{
        this.on_clear()
    }

    abstract on_signal(signal:string,content:any):void
    abstract on_init():void
    abstract on_update(dt:number):void
    abstract on_destroy():void
    abstract on_clear():void
}
export class UIRoot<Game> extends HTMLManager<Game> {
    private modules: UIModule<Game>[] = []

    initialized:boolean=false
    add(module: UIModule<Game>) {
        this.modules.push(module)
        if(this.initialized)module.init(this.game,this)
    }
    signal(signal:string,value:any){
        for (const m of this.modules) {
            m.on_signal(signal,value)
        }
    }

    protected onInit() {
        this.initialized=true
        for (const m of this.modules) {
            m.init(this.game,this)
        }
    }

    update(dt: number) {
        for (const m of this.modules) {
            m.update?.(dt)
        }
    }
    clear() {
        for (const m of this.modules) {
            m.clear()
        }
    }

    protected onDestroy() {
        this.initialized=false
        for (const m of this.modules) {
            m.destroy()
        }
        this.modules.length = 0
    }
}
