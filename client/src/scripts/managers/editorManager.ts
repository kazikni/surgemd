import { HideElement, Key, ShowElement } from "common/engine/client.ts";
import { type Game } from "../others/game.ts";
import { Layers } from "common/scripts/others/constants.ts";
import { ColorM, DynamicStream, split_strings_array, StaticStream, Stream, v2 } from "common/engine/core.ts";
import { CircleHitboxEditorObject, EditorObject, FloorImageEditorObject, ObstacleEditorObject, RectHitboxEditorObject } from "../defs/editor_objects.ts";
import { build_setting_input, SettingDef, Vec2Input } from "../defs/settings.ts";
export class EditorObjectsManager{
    objects:EditorObject[]=[]
    selected_object?:EditorObject
    editor:EditorManager
    constructor(editor:EditorManager){
        this.editor=editor
    }

    clear(){
        for(const c of this.objects){
            c.on_destroy()
        }
        this.objects.length=0
        this.editor.update_objects_window()
    }

    create_object(type:number):EditorObject{
        switch(type){
            case 1:
                return new RectHitboxEditorObject()
            case 2:
                return new CircleHitboxEditorObject()
            case 3:
                return new FloorImageEditorObject()
            case 4:
                return new ObstacleEditorObject()
            default:
                throw new Error("Unknown object type")
        }
    }
    add_object(obj:EditorObject){
        const ret=this._add_object(obj)
        this.editor.update_objects_window()
        return ret
    }
    _add_object(obj:EditorObject){
        obj.editor=this.editor
        this.objects.push(obj)
        obj.on_create()
        return obj
    }
    clone_object(obj:EditorObject){
        const ret=this.add_object(obj.clone())
        this.selected_object=ret
        this.editor.update_propertys_window(ret)
        return ret
    }

    encode(stream:Stream){
        stream.write_array(this.objects,obj=>{
            stream.write_uint8(obj.type)
            obj.encode(stream)
        },2)
    }
    decode(stream:Stream){
        this.clear()
        this.selected_object=undefined
        stream.read_array(()=>{
            const type=stream.read_uint8()
            const obj:EditorObject=this.create_object(type)
            this._add_object(obj)
            obj.decode(stream)
        },2)
        this.editor.update_objects_window()
        this.editor.update_propertys_window()
    }
    tick(dt:number){
        if(this.editor.can_act){
            if(this.editor.game.input_manager.keyPress(Key.F)){
                if(this.selected_object)this.selected_object.on_drag(v2.dscale(this.editor.game.input_manager.mouse_delta,this.editor.game.cam2d.meter_size))
            }
            if(this.editor.game.input_manager.keyUp(Key.F)){
                if(this.selected_object)this.selected_object.on_drag_over(v2.dscale(this.editor.game.input_manager.mouse_delta,this.editor.game.cam2d.meter_size))
            }
            if(this.editor.game.input_manager.keyDown(Key.C)){
                if(this.selected_object)this.clone_object(this.selected_object)
            }
            if(this.editor.game.input_manager.keyDown(Key.Delete)){
                if(this.selected_object)this.selected_object.destroyed=true
            }
        }
        for(let o=0;o<this.objects.length;o++){
            if(this.objects[o].destroyed){
                if(this.objects[o]===this.selected_object)this.selected_object=undefined
                this.objects[o].on_destroy()
                this.objects.splice(o,1)
                this.editor.update_objects_window()
                o--
                break
            }
            this.objects[o].on_tick(dt,this.selected_object===this.objects[o])
        }
    }
}
export class EditorManager{
    game:Game
    ui!:HTMLDivElement

    context_menu:SMDEMenu
    menu?:SMDEMenu

    windows:Record<string,SMDEWindow>={}

    settings:Record<string,any>={}
    settings_default:Record<string,any>={
        "textures":'"assets/img/kspr/common"',

        "m_size_x":100,
        "m_size_y":100,
    }

    objects:EditorObjectsManager
    can_act:boolean=true

    constructor(game:Game){
        this.game=game
        this.objects=new EditorObjectsManager(this)
    }
    to_mouse_position(elem:HTMLElement){
        elem.style.left=this.game.input_manager.real_mouse_position.x+"px"
        elem.style.top=this.game.input_manager.real_mouse_position.y+"px"
    }
    create_menu(){
        const menu=new SMDEMenu()
        menu.className="editor-menu"
        return menu
    }
    create_window(){
        const menu=new SMDEWindow()
        menu.className="editor-window"
        return menu
    }
    create_closable_window(id:string){
        const window=this.create_window()
        window.id="editor-objects-window"
        window.addEventListener("close",(e:CustomEvent)=>{
            e.preventDefault()
            window.style.display="none"
        })
        window.style.display="none"
        this.ui.appendChild(window)
        return window
    }

    create_settings(parent:HTMLElement,settings:(SettingDef|undefined)[]){
        for(const def of settings){
            if(!def)continue
            parent.appendChild(build_setting_input(def,this.game.language,def.var?(this.settings[def.var]??this.settings_default[def.var]):"",
                {
                    on_change:(val:any)=>{
                        if(def.var!==undefined)this.settings[def.var]=val
                    },
                    on_focus:(val:any)=>this.can_act=false,
                    on_blur:(val:any)=>this.can_act=true
                }))
        }
    }
    create_settings_defs():SettingDef[]{
        return [
            {type:"h1",name:"Assets"},
            {type:"input",name:"Textures",var:"textures"},
            {type:"button",on_click:this.reload_sources.bind(this),name:"Reload"},
            {type:"h1",name:"Map"},
            {...Vec2Input,name:"Size",var:"m_size"},
            {type:"h1",name:"Building"},
            {type:"input",name:"ID String",var:"b_idString"},
            {type:"toggle",name:"No Collisions",var:"b_no_collisions"},
            {type:"toggle",name:"No Bullet Collision",var:"b_no_bullet_collision"},
            {type:"toggle",name:"Reflect Bullets",var:"reflect_bullets"},
        ]
    }
    make_context_menu():SMDEMenu{
        const menu=this.create_menu()

        const fm=this.create_menu()
        fm.add_option("Save", () => this.save_file())
        fm.add_option("Load", () => this.load_file())
        fm.add_option("Reset", () => this.reset())
        menu.add_submenu("File",fm)

        const wm=this.create_menu()
        wm.add_option("Objects",()=>{
            this.windows["objects"].style.display=""
            this.to_mouse_position(this.windows["objects"])
            this.update_objects_window()
        })
        wm.add_option("Propertys",()=>{
            this.windows["propertys"].style.display=""
            this.to_mouse_position(this.windows["propertys"])
            this.update_propertys_window(this.objects.selected_object)
        })
        wm.add_option("Settings",()=>{
            this.windows["settings"].style.display=""
            this.to_mouse_position(this.windows["settings"])
        })

        menu.add_submenu("Windows",wm)
        menu.add_option("Close",()=>this.game.close_game())

        return menu
    }

    async reload_sources(_e?:MouseEvent){
        HideElement(this.ui)
        const textures=split_strings_array(this.settings.textures??this.settings_default.textures)
        try{
            await this.game.load_resources(textures,{})
        }catch(e){
            console.error(e)
            this.game.menu.hide_loading_screen()
        }
        for(const o of this.objects.objects){
            o.on_reload()
        }
        ShowElement(this.ui)
    }
    tick(dt:number){
        this.game.hitboxes_gfx.ctx.clear()
        this.objects.tick(dt)
        if(this.can_act){
            if(this.game.input_manager.keyDown(Key.Mouse_Left)){
                if(!this.context_menu.hover)this.context_menu.style.display="none"
                if(this.menu&&!this.menu.hover)this.menu.remove()
            }
            if(this.game.input_manager.keyDown(Key.Mouse_Right)){
                this.context_menu.style.display=""
                this.to_mouse_position(this.context_menu)
            }
        }
    }
    start(){
        HideElement(this.game.ui.content.game_gui)
        HideElement(this.game.ui.content.post_proccess.tiltshift)
        HideElement(this.game.ui.content.post_proccess.vignetting)

        this.game.cam2d.layer=Layers.Normal
        this.game.cam2d.position=v2(0,0)
        this.game.terrain.clear()
        this.game.terrain.draw(this.game.terrain_gfx,Layers.Normal)

        this.game.ui_gfx.ctx.fill_color=ColorM.hex("#fff8")
        this.game.ui_gfx.ctx.circle(v2.zero,0.2)
        this.game.ui_gfx.ctx.fill()

        this.ui=document.createElement("div")
        this.ui.classList="game-editor-ui"
        document.body.appendChild(this.ui)

        this.windows["settings"]=this.create_closable_window("game-editor-settings-window")
        this.create_settings(this.windows["settings"],this.create_settings_defs())

        this.windows["objects"]=this.create_closable_window("game-editor-objects-window")

        this.windows["propertys"]=this.create_closable_window("game-editor-propertys-window")
        this.windows["propertys"].content.style.display="flex"
        this.windows["propertys"].content.style.flexDirection="column"

        this.context_menu=this.make_context_menu()
        this.context_menu.style.display="none"
        this.context_menu.addEventListener("close",(e:CustomEvent)=>{
            e.preventDefault()
            this.context_menu.style.display="none"
        })
        this.ui.appendChild(this.context_menu)

        this.update_objects_window()
        this.reload_sources()
    }
    close(){
        ShowElement(this.game.ui.content.game_gui)
        this.ui.remove()
    }

    encode(stream:Stream){
        stream.write_string_sized(".SMDE",5)
        stream.write_array(Object.keys(this.windows),(i,s)=>{
            stream.write_string(i)
            const rect=this.windows[i].getBoundingClientRect()
            const invisible=this.windows[i].style.display=="none"
            stream.write_boolean_group(invisible)
            if(!invisible){
                stream.write_int16(rect.left)
                .write_int16(rect.top)
                .write_uint16(rect.width)
                .write_uint16(rect.height)
            }
        })
        this.objects.encode(stream)
        stream.write_any(this.settings)
    }
    decode(stream:Stream){
        const magic=stream.read_string_sized(5)
        stream.read_array(()=>{
            const id=stream.read_string()
            const [invisible]=stream.read_boolean_group()
            this.windows[id].style.display=invisible?"none":""
            if(!invisible){
                this.windows[id].style.left=stream.read_int16()+"px"
                this.windows[id].style.top=stream.read_int16()+"px"
                this.windows[id].style.width=stream.read_uint16()+"px"
                this.windows[id].style.height=stream.read_uint16()+"px"
            }
        })
        this.objects.decode(stream)
        this.settings=stream.read_any()
        this.reload_sources()
    }

    async save_file(name:string="map") {
        const stream = new DynamicStream()
        this.encode(stream)
        const blob = new Blob([stream.buffer.slice(0, stream.length) as BlobPart], {
            type: "application/octet-stream"
        })
        const a=document.createElement("a")
        a.href=URL.createObjectURL(blob)
        a.download=name+".smde"
        a.click()
        URL.revokeObjectURL(a.href)
    }
    async load_file() {
        const input = document.createElement("input")
        input.type = "file"
        input.accept = ".smde"
        input.onchange = async () => {
            const file = input.files?.[0]
            if (!file) return
            const buffer = await file.arrayBuffer()
            const stream = new StaticStream(buffer)
            this.decode(stream)
        }
        input.click();
    }
    reset() {
        this.objects.clear()
        this.settings={}
        for (const id in this.windows) {
            const w=this.windows[id]
            w.style.left=""
            w.style.top=""
            w.style.width=""
            w.style.height=""
            w.style.display="none"
        }
    }

    update_propertys_window(obj?:EditorObject){
        const parent=this.windows["propertys"].content
        parent.innerHTML=""
        if(!obj){
            parent.innerHTML="<h2>No object selected</h2>"
            return
        }
        for(const def of obj.get_propertys()){
            parent.appendChild(build_setting_input(def,this.game.language,def.var?obj.get_property(def.var):undefined,{
                on_change(val:any){
                    if(def.var!==undefined){
                        obj!.set_property(def.var,val)
                    }
                },
                on_focus:(val:any)=>this.can_act=false,
                on_blur:(val:any)=>this.can_act=true
            }))
        }
    }
    update_objects_window(){
        const parent=this.windows["objects"].content
        parent.innerHTML=""

        const create=document.createElement("button")
        create.className="btn-green"
        create.textContent="Create"
        create.onclick=()=>{
            if(this.menu)this.menu.remove()
            const menu=this.create_menu()
            menu.add_option("Floor Image",()=>{
                this.objects.add_object(new FloorImageEditorObject())
            })
            menu.add_option("Rectangle Hitbox",()=>{
                this.objects.add_object(new RectHitboxEditorObject())
            })
            menu.add_option("Circle Hitbox",()=>{
                this.objects.add_object(new CircleHitboxEditorObject())
            })
            menu.add_option("Obstacle",()=>{
                this.objects.add_object(new ObstacleEditorObject())
            })
            this.ui.appendChild(menu)
            this.to_mouse_position(menu)
            this.menu=menu
        }
        parent.appendChild(create)
        parent.appendChild(document.createElement("hr"))

        this.objects.objects.forEach((obj,index)=>{
            const row=document.createElement("button")
            row.className="btn-blue editor-object-row"
            row.addEventListener("click",(e)=>{
                if(this.menu)this.menu.remove()
                const menu=this.create_menu()
                menu.add_option("Select",()=>{
                    this.objects.selected_object=obj
                    this.update_propertys_window(obj)
                })
                menu.add_option("Clone",()=>{
                    this.objects.clone_object(obj)
                })
                menu.add_option("Move Up",()=>{
                    if(index===0)return
                    [this.objects.objects[index-1],this.objects.objects[index]]=[this.objects.objects[index],this.objects.objects[index-1]]
                    this.update_objects_window()
                })
                menu.add_option("Move Down",()=>{
                    if(index===this.objects.objects.length-1)return
                    [this.objects.objects[index], this.objects.objects[index+1]]=[this.objects.objects[index+1],this.objects.objects[index]]
                    this.update_objects_window()
                })
                menu.add_option("Delete",()=>{
                    obj.destroyed=true
                })
                this.to_mouse_position(menu)
                this.ui.appendChild(menu)
                this.menu=menu
            })
            if(obj===this.objects.selected_object){
                row.classList.add("selected")
            }
            const title=document.createElement("span")
            title.style.flex="1"
            title.innerHTML=obj.name()
            row.appendChild(title)
            parent.appendChild(row)
        })
    }
}