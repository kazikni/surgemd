import { Graphics2D, HideElement, Key, ShowElement, type SMDEMenu, type SMDEWindow } from "common/engine/web.ts";
import { Layers, zIndexes } from "common/scripts/others/constants.ts";
import { CircleHitbox2D, ColorM, DynamicStream, Hitbox2D, HitboxGroup2D, HitboxType2D, NullHitbox2D, random, RectHitbox2D, split_strings_array, StaticStream, Stream, v2, Vec2 } from "common/engine/core.ts";
import { CircleHitboxEditorObject, EditorObject, FloorImageEditorObject, ObstacleEditorObject, RectHitboxEditorObject, WallEditorObject, WallPoint, WallSegment } from "../defs/editor_objects.ts";
import { build_setting_input, RectInput, SettingDef, Vec2Input } from "../defs/settings.ts";
import { BuildingDef } from "common/scripts/definitions/objects/buildings_base.ts";
import { GComponent } from "../others/component.ts";

export class EditorWindow{
    elem:SMDEWindow
    editor:EditorManager
    constructor(editor:EditorManager,id:string,closable:boolean=true){
        this.editor=editor
        if(closable){
            this.elem=new SMDEWindow()
            this.elem.addEventListener("close",(e:CustomEvent)=>{
                e.preventDefault()
                this.elem.style.display="none"
            })
            this.elem.style.display="none"
            this.editor.ui.appendChild(this.elem)
        }else{
            this.elem=new SMDEWindow()
        }
        this.elem.id=id
        this.elem.className="editor-window"
    }
    make_context_menu(menu:SMDEMenu){

    }
    reset(){
        this.elem.style.left=""
        this.elem.style.top=""
        this.elem.style.width=""
        this.elem.style.height=""
        this.elem.style.display="none"
    }
}
export class ObjectsEditorWindow extends EditorWindow{
    create_btn:HTMLButtonElement
    objects:HTMLDivElement
    tree!:any
    constructor(editor:EditorManager,id:string,closable?:boolean){
        super(editor,id,closable)
        this.create_btn=document.createElement("button")
        this.objects=document.createElement("div")

        this.create_btn.className="btn-green"
        this.create_btn.textContent="Create"
        this.create_btn.onclick=()=>{
            if(this.editor.menu)this.editor.menu.remove()
            const menu=this.editor.create_menu()
            menu.add_option("Floor Image",()=>{
                this.editor.objects.selected_object=this.editor.objects.add_object(new FloorImageEditorObject())
            })
            menu.add_option("Rectangle Hitbox",()=>{
                this.editor.objects.selected_object=this.editor.objects.add_object(new RectHitboxEditorObject())
            })
            menu.add_option("Circle Hitbox",()=>{
                this.editor.objects.selected_object=this.editor.objects.add_object(new CircleHitboxEditorObject())
            })
            menu.add_option("Obstacle",()=>{
                this.editor.objects.selected_object=this.editor.objects.add_object(new ObstacleEditorObject())
            })
            menu.add_option("Wall",()=>{
                const wall=new WallEditorObject()
                this.editor.objects.selected_object=this.editor.objects.add_object(wall)

                const w=wall.add_child(new WallSegment())

                const p1=new WallPoint()
                p1.position=v2(-5,0)
                w.add_child(p1)

                const p2=new WallPoint()
                p2.position=v2(5,0)
                w.add_child(p2)

            })
            this.editor.ui.appendChild(menu)
            this.editor.to_mouse_position(menu)
            this.editor.menu=menu
        }

        this.elem.content.appendChild(this.create_btn)
        this.elem.content.appendChild(document.createElement("hr"))
        this.elem.content.appendChild(this.objects)

        this.objects.innerHTML=""
        this.tree=new SMDETree()
        this.objects.appendChild(this.tree)
    }
    override make_context_menu(menu:any){
        menu.add_option("Objects",()=>{
            this.elem.style.display=""
            this.editor.to_mouse_position(this.elem)
        })
    }
}
export class EditorObjectsManager{
    objects:EditorObject[]=[]
    selected_object?:EditorObject
    editor:EditorManager
    constructor(editor:EditorManager){
        this.editor=editor
    }

    clear(){
        for(const c of this.objects){
            c._destroy()
        }
        this.objects.length=0
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
            case 5:
                return new WallEditorObject()
            case 6:
                return new WallSegment()
            case 7:
                return new WallPoint()
            default:
                throw new Error("Unknown object type")
        }
    }
    make_hitbox():Hitbox2D{
        let hitbox:Hitbox2D=new NullHitbox2D(v2.zero)
        for(const obj of this.objects){
            if(obj.type===1||obj.type===2){
                const hb=obj.type===1?new RectHitbox2D((obj as RectHitboxEditorObject).min,(obj as RectHitboxEditorObject).max):new CircleHitbox2D((obj as CircleHitboxEditorObject).center,(obj as CircleHitboxEditorObject).radius)
                if(hitbox.type===HitboxType2D.null){
                    hitbox=hb
                }else if(hitbox.type===HitboxType2D.group){
                    hitbox.hitboxes.push(hb)
                }else{
                    hitbox=new HitboxGroup2D(hitbox,hb)
                }
            }
        }
        return hitbox
    }

    add_object(obj:EditorObject){
        obj.editor=this.editor

        if(obj.childs){
            obj.childs.tree_element=new SMDETree()
            obj._tree_option_element=this.editor.objects_window.tree.add_subtree(obj.name,obj.childs.tree_element,obj.on_name_clicked.bind(obj))
        }else{
            const node=document.createElement("span")
            node.innerText=obj.name
            obj._tree_option_element=this.editor.objects_window.tree.add_option(obj.name,node,obj.on_name_clicked.bind(obj))
        }

        this.objects.push(obj)
        obj.on_create()
        return obj
    }
    clone_object(obj:EditorObject){
        const ret=obj.clone()
        if(obj.parent){
            let idx=obj.parent.childs?.content.indexOf?.(obj)
            if(idx===-1)idx=undefined
            obj.parent.add_child(ret,idx)
        }else{
            this.add_object(ret)
        }
        if(obj.childs){
        }
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
    decode_object(stream:Stream){
        
    }
    decode(stream:Stream){
        this.clear()
        this.selected_object=undefined
        stream.read_array(()=>{
            const type=stream.read_uint8()
            const obj:EditorObject=this.create_object(type)
            this.add_object(obj)
            obj.decode(stream)
        },2)
        this.editor.update_propertys_window()
    }

    tick(dt:number){
        if(this.editor.can_act){
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
                this.objects[o]._destroy()
                this.objects.splice(o,1)
                o--
                continue
            }
            this.objects[o].tick(dt,this.selected_object===this.objects[o])
        }
    }
}
export function building_to_string(b:BuildingDef):string{
    let value=`{`
    value+=`idString:'${b.idString}'`
    if(b.hitbox)value+=`,hitbox:${b.hitbox.generate_code()}`
    if(b.spawnHitbox)value+=`,spawnHitbox:${b.spawnHitbox.generate_code()}`
    if(b.no_collisions!==undefined)value+=`,no_collisions:${b.no_collisions}`
    if(b.no_bullet_collision!==undefined)value+=`,no_bullet_collision:${b.no_bullet_collision}`
    if(b.reflect_bullets!==undefined)value+=`,reflect_bullets:${b.reflect_bullets}`
    if(b.is_ghost!==undefined)value+=`,is_ghost:${b.reflect_bullets}`
    if(b.floor_image!==undefined)value+=`,floor_image:${JSON.stringify(b.floor_image)}`
    value+=`,generate:{`
    let idx=0
    if(b.generate.obstacles!==undefined){
        value+=`obstacles:${JSON.stringify(b.generate.obstacles)}`
        idx++
    }
    if(b.generate.walls!==undefined){
        if(idx>0)value+=","
        value+=`walls:${JSON.stringify(b.generate.walls)}`
        idx++
    }
    value+="}}"
    return value
}
export class EditorManager extends GComponent{
    ui!:HTMLDivElement

    context_menu!:SMDEMenu
    menu?:SMDEMenu

    windows:Record<string,EditorWindow>={}

    settings:Record<string,any>={}
    settings_default:Record<string,any>={
        "textures":'"/assets/kspr/common"',

        "m.size":v2(100,100),
    }

    objects:EditorObjectsManager
    can_act:boolean=true

    hitbox_gfx:Graphics2D=new Graphics2D()

    move_scale?:Vec2

    objects_window!:ObjectsEditorWindow

    constructor(){
        super()
        this.objects=new EditorObjectsManager(this)
    }

    override on_bind(): void {
        HideElement(this.game.ui.content.game_gui)
        HideElement(this.game.ui.content.post_proccess.tiltshift)
        HideElement(this.game.ui.content.post_proccess.vignetting)

        this.game.scene_2d.camera.layer=Layers.Normal
        this.game.scene_2d.camera.position=v2(0,0)
        this.game.terrain.clear()
        this.game.terrain.draw(this.game.terrain.terrain_gfx,Layers.Normal)

        this.hitbox_gfx.zIndex=zIndexes.UI
        this.hitbox_gfx.initialize(this.game.scene_2d.camera.ctx)
        this.game.scene_2d.camera.add_object(this.hitbox_gfx)

        this.ui=document.createElement("div")
        this.ui.classList="game-editor-ui"
        document.body.appendChild(this.ui)

        this.windows["settings"]=new EditorWindow(this,"game-editor-settings-window")
        this.create_settings(this.windows["settings"].elem,this.create_settings_defs())

        this.objects_window=new ObjectsEditorWindow(this,"game-editor-objects-window")
        this.windows["objects"]=this.objects_window

        this.windows["propertys"]=new EditorWindow(this,"game-editor-propertys-window")
        this.windows["propertys"].elem.content.style.display="flex"
        this.windows["propertys"].elem.content.style.flexDirection="column"

        this.context_menu=this.make_context_menu()
        this.context_menu.style.display="none"
        this.context_menu.addEventListener("close",(e:CustomEvent)=>{
            e.preventDefault()
            this.context_menu.style.display="none"
        })
        this.ui.appendChild(this.context_menu)

        this.reload_sources()
        this.game.dead_zone.set_current(v2.zero,0,false)
    }
    override on_unbind(): void {
        ShowElement(this.game.ui.content.game_gui)
        this.ui.remove()
        this.game.editor=undefined
        this.hitbox_gfx.destroy()
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

    get_setting(name:string):any{
        if(this.settings[name]===undefined)return this.settings_default[name]
        return this.settings[name]
    }
    create_settings(parent:HTMLElement,settings:(SettingDef|undefined)[]){
        parent.innerHTML=""
        for(const def of settings){
            if(!def)continue
            parent.appendChild(build_setting_input(def,this.game.language,def.var?(this.settings[def.var]??this.settings_default[def.var]):undefined,
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

            { ...Vec2Input, name: "Size", var: "m.size" },
            { ...RectInput, name: "Bounds", var: "m.bounds", can_disable: true },
            { type: "input", name: "Bounds Size", var: "m.bounds_size", can_disable: true },
            { type: "input", name: "Default Floor",placeholder:"void", var: "m.default_floor", can_disable: true },
            { type: "input", name: "Players Spawn", var: "m.players_spawn", can_disable: true },
            { type: "input", name: "Deadzone Initial Size", var: "m.deadzone_initial_size", can_disable: true },
            { type: "input", name: "Seed", var: "m.seed", can_disable: true },

            { type: "h2", name: "Generation" },
            { type: "input", name: "Base Floor",placeholder:"water",initial:"water", var: "m.generation.base" },
            { type: "input", name: "Base Tint", var: "m.generation.base_tint", can_disable: true },
            { type: "h2", name: "Biome" },
            { type: "input", name: "Skin", var: "m.biome.skin", can_disable: true },
            { type: "input", name: "Skin Chance",placeholder:"100",initial:"100", var: "m.biome.skin_chance", can_disable: true },
            { type: "input", name: "Particles Tint", var: "m.biome.particles_tint", can_disable: true },
            { type: "input", name: "Ambient Sound", var: "m.biome.ambient_sound", can_disable: true },
            {type:"input",name:"Particles",var:"m.biome.particles"},
            {type:"input",name:"Musics",var:"m.biome.musics"},
            {type:"input",name:"Textures",var:"m.biome.textures"},

            {type:"h1",name:"Building"},
            {type:"input",name:"ID String",var:"b.idString"},
            {type:"toggle",name:"No Collisions",var:"b.no_collisions"},
            {type:"toggle",name:"No Bullet Collision",var:"b.no_bullet_collision"},
            {type:"toggle",name:"Reflect Bullets",var:"reflect_bullets"},
            {type:"toggle",name:"Is Ghost",var:"is_ghost"},
        ]
    }
    make_context_menu():SMDEMenu{
        const menu=this.create_menu()

        const fm=this.create_menu()
        fm.add_option("Save", () => this.save_file())
        fm.add_option("Load", () => this.load_file())
        const em=this.create_menu()
        em.add_option("Hitbox",async()=>{
            await navigator.clipboard.writeText(this.objects.make_hitbox().generate_code())
            alert("Hitbox code copied.")
        })
        em.add_option("Building Object",async()=>{
            const building=this.make_building()
            await navigator.clipboard.writeText(building_to_string(building))
            alert("Building Objects code copied.")
        })
        fm.add_submenu("Export",em)
        fm.add_option("Reset", () => this.reset())
        menu.add_submenu("File",fm)

        const wm=this.create_menu()
        for(const w in this.windows){
            this.windows[w].make_context_menu(wm)
        }
        wm.add_option("Propertys",()=>{
            this.windows["propertys"].elem.style.display=""
            this.to_mouse_position(this.windows["propertys"].elem)
            this.update_propertys_window(this.objects.selected_object)
        })
        wm.add_option("Settings",()=>{
            this.windows["settings"].elem.style.display=""
            this.to_mouse_position(this.windows["settings"].elem)
        })

        menu.add_submenu("Windows",wm)
        menu.add_option("Close",()=>this.game.close_game())

        return menu
    }

    async reload_sources(_e?:MouseEvent){
        HideElement(this.ui)
        const textures=split_strings_array(this.settings.textures??this.settings_default.textures)
        await this.game.load_resources(textures,{})
        for(const o of this.objects.objects){
            o.on_reload()
        }
        ShowElement(this.ui)
        self.requestAnimationFrame(()=>{
            this.game.menu.hide_loading_screen()
        })
    }
    override on_tick(dt:number){
        this.game.ui_gfx.ctx.begin_path()
        this.game.ui_gfx.ctx.fill_color=ColorM.hex("#fff8")
        this.game.ui_gfx.ctx.circle(v2.zero,0.2)
        this.game.ui_gfx.ctx.fill()

        this.hitbox_gfx.layer=this.game.scene_2d.camera.layer
        this.hitbox_gfx.ctx.clear()
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
    on_game_close(){
        this.game.remove_component(this)
    }

    encode(stream:Stream){
        stream.write_string_sized(".SMDE",5)
        stream.write_uint32(0)
        stream.write_array(Object.keys(this.windows),(i,s)=>{
            stream.write_string(i)
            const rect=this.windows[i].elem.getBoundingClientRect()
            const invisible=this.windows[i].elem.style.display=="none"
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
        const version=stream.read_uint32()
        stream.read_array(()=>{
            const id=stream.read_string()
            const [invisible]=stream.read_boolean_group()
            this.windows[id].elem.style.display=invisible?"none":""
            if(!invisible){
                this.windows[id].elem.style.left=stream.read_int16()+"px"
                this.windows[id].elem.style.top=stream.read_int16()+"px"
                this.windows[id].elem.style.width=stream.read_uint16()+"px"
                this.windows[id].elem.style.height=stream.read_uint16()+"px"
            }
        })
        this.objects.decode(stream)
        this.settings=stream.read_any()
        this.reload_sources()
        this.create_settings(this.windows["settings"].elem,this.create_settings_defs())
    }

    make_building():BuildingDef{
        const ret:BuildingDef={
            idString:this.get_setting("b.idString"),
            generate:{},
            hitbox:this.objects.make_hitbox(),
            no_collisions:this.get_setting("b.no_collisions"),
            no_bullet_collision:this.get_setting("b.no_bullet_collision"),
            reflect_bullets:this.get_setting("b.reflect_bullets"),
            is_ghost:this.get_setting("b.is_ghost")
        }
        for(const obj of this.objects.objects){
            obj.generate_building_object(ret)
        }
        return ret
    }
    async save_file(name: string = "map") {
        const stream = new DynamicStream()
        this.encode(stream)
        const blob = new Blob(
            [stream.buffer.slice(0, stream.length) as BlobPart],
            {
                type: "application/octet-stream"
            }
        )
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `${name}.smde`
        document.body.appendChild(a)
        a.click()
        setTimeout(() => {
            URL.revokeObjectURL(url)
            a.remove()
        }, 1000)
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
        input.click()
    }
    reset() {
        this.objects.clear()
        this.settings={}
        for (const id in this.windows) {
            this.windows[id].reset()
        }
    }

    update_propertys_window(obj?:EditorObject){
        const parent=this.windows["propertys"].elem.content
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
}