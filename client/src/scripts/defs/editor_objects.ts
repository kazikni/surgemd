import { cloneDeep, ColorM, FrameDef, Stream, v2, v2m, Vec2 } from "common/engine/core.ts";
import { type EditorManager } from "../managers/editorManager.ts";
import { Sprite2D } from "common/engine/web.ts";
import { Layers, zIndexes } from "common/scripts/others/constants.ts";
import { FrameSettings, RGBAInput, SettingDef, Vec2Input } from "./settings.ts";
import { Obstacle } from "../objects/obstacle.ts";
import { WallsDef } from "common/scripts/definitions/objects/walls.ts";
import { Walls } from "../objects/walls.ts";
export interface EditorObjectTransform{
    position:Vec2
}
export abstract class EditorObject{
    type:number=0
    editor!:EditorManager
    destroyed:boolean=false

    _tree_option_element?:HTMLElement

    parent?:EditorObject
    childs?:{
        content:EditorObject[]
        tree_element?:any
    }

    name:string="Object"

    constructor(){

    }

    abstract set_property(name:string,value:any):void
    abstract get_property(name:string):any
    abstract get_propertys():SettingDef[]

    make_context_menu(menu:any){}
    on_name_clicked(){
        if(this.editor.menu)this.editor.menu.remove()
        const menu=this.editor.create_menu()
        menu.add_option("Select",()=>{
            this.editor.objects.selected_object=this
            this.editor.update_propertys_window(this)
        })
        this.make_context_menu(menu)
        menu.add_option("Clone",()=>{
            this.editor.objects.clone_object(this)
        })
        menu.add_option("Delete",()=>{
            this.destroyed=true
        })
        this.editor.to_mouse_position(menu)
        this.editor.ui.appendChild(menu)
        this.editor.menu=menu
    }

    add_child(c:EditorObject,index?:number,allow_childs_modify:boolean=false):EditorObject{
        if(!this.childs?.content)return c

        if(c.childs){
            c.childs.tree_element=new SMDETree()
            c._tree_option_element=this.childs.tree_element.add_subtree(c.name,c.childs.tree_element,c.on_name_clicked.bind(c),index)
        }else{
            const node=document.createElement("span")
            node.innerText=c.name
            c._tree_option_element=this.childs.tree_element.add_option(c.name,node,c.on_name_clicked.bind(c),index)
        }

        c.parent=this
        c.editor=this.editor

        if(index === undefined)this.childs.content.push(c)
        else this.childs.content.splice(index, 0, c)
        c.on_create()

        if(allow_childs_modify)this.on_childs_modify()
        return c
    }
    on_childs_modify():void{}

    on_reload():void{}

    on_tick(dt:number,selected:boolean):void{}
    tick(dt:number,selected:boolean):void{
        this.on_tick(dt,selected)
        if(this.childs){
            for(let i=0;i<this.childs.content.length;i++){
                if(this.childs.content[i].destroyed){
                    this.childs.content[i]._destroy()
                    this.childs.content.splice(i,1)
                    this.on_childs_modify()
                    i--
                    continue
                }
                this.childs.content[i].tick(dt,selected)
            }
        }
    }

    on_create():void{}

    on_destroy():void{}
    _destroy(){
        this.on_destroy()
        for(const c of this.childs?.content??[]){
            c._destroy()
        }
        if(this._tree_option_element)this._tree_option_element.remove()
    }

    can_select(position:Vec2):boolean{return false}

    abstract clone():EditorObject

    on_encode(stream:Stream){}
    encode(stream:Stream){
        this.on_encode(stream)
        if(this.childs){
            stream.write_array(this.childs.content,obj=>{
                stream.write_uint8(obj.type)
                obj.encode(stream)
            },2)
        }
    }
    on_decode(stream:Stream){}
    decode(stream:Stream){
        this.on_decode(stream)
        if(this.childs){
            stream.read_array(()=>{
                const type=stream.read_uint8()
                const obj:EditorObject=this.editor.objects.create_object(type)
                this.add_child(obj,undefined,false)
                obj.decode(stream)
            },2)
            this.on_childs_modify()
        }
    }

    get_transform():EditorObjectTransform{
        return {position:v2.zero()}
    }
    set_transform(transform:EditorObjectTransform){
        
    }
}
export class RectHitboxEditorObject extends EditorObject{
    override type=1
    group:string=""
    min:Vec2=v2.zero()
    max:Vec2=v2.one()
    override name="Rect Hitbox"
    override get_property(name: string) {
        switch(name){
            case "min": return this.min
            case "max": return this.max
        }
    }
    override set_property(name: string, value: any): void {
        switch(name){
            case "min": this.min=value; break
            case "max": this.max=value; break
        }
    }


    override get_propertys(): SettingDef[] {
        return [
            {type:"input",name:"Group",var:"group"},
            {...Vec2Input,name:"Min",var:"min"},
            {...Vec2Input,name:"Max",var:"max"},
        ]
    }
    override on_tick(dt: number,selected:boolean): void {
        this.editor.hitbox_gfx.ctx.fill_color=ColorM.hex(selected?"#ff05":"#f00a")
        this.editor.hitbox_gfx.ctx.begin_path()
        this.editor.hitbox_gfx.ctx.rect(this.min,this.max)
        this.editor.hitbox_gfx.ctx.fill()
    }
    override get_transform(): EditorObjectTransform {
        return {
            position:this.min,
        }
    }
    override can_select(position: Vec2): boolean {
        return position.x>=this.min.x&&position.x<=this.max.x&&position.y>=this.min.y&&position.y<=this.max.y
    }

    override clone(): EditorObject {
        const ret=new RectHitboxEditorObject()
        ret.min=v2.clone(this.min)
        ret.max=v2.clone(this.max)
        return ret
    }
    override on_encode(stream:Stream){
        stream.write_string(this.group,1).write_pos2(this.min).write_pos2(this.max)
    }
    override on_decode(stream:Stream){
        this.group=stream.read_string(1)
        this.min=stream.read_pos2()
        this.max=stream.read_pos2()
    }
}
export class CircleHitboxEditorObject extends EditorObject{
    override type=2
    group:string=""
    center:Vec2=v2.zero()
    radius:number=1
    override name="Circle Hitbox"
    override get_property(name: string) {
        switch(name){
            case "center": return this.center
            case "radius": return this.radius
        }
    }
    override set_property(name: string, value: any): void {
        switch(name){
            case "center": this.center.x=value;break
            case "radius": this.radius=parseFloat(value);break
        }
    }

    override get_propertys(): SettingDef[] {
        return [
            {type:"input",name:"Group",var:"group"},
            {...Vec2Input,name:"Center",var:"center"},
            {type:"input",name:"Radius",var:"radius"},
        ]
    }

    override on_tick(dt: number,selected:boolean): void {
        this.editor.hitbox_gfx.ctx.fill_color=ColorM.hex(selected?"#ff05":"#f00a")
        this.editor.hitbox_gfx.ctx.begin_path()
        this.editor.hitbox_gfx.ctx.circle(this.center,this.radius,100)
        this.editor.hitbox_gfx.ctx.fill()
    }
    override can_select(position: Vec2): boolean {
        return v2.distance(this.center,position)<=this.radius
    }

    override clone(): EditorObject {
        const ret=new CircleHitboxEditorObject()
        ret.center=v2.clone(this.center)
        ret.radius=this.radius
        return ret
    }
    override on_encode(stream:Stream){
        stream.write_string(this.group,1).write_pos2(this.center).write_rad(this.radius)
    }
    override on_decode(stream:Stream){
        this.group=stream.read_string(1)
        this.center=stream.read_pos2()
        this.radius=stream.read_rad()
    }
}
export class FloorImageEditorObject extends EditorObject{
    override type=3
    sprite=new Sprite2D()

    layer:number=Layers.Normal
    frame:(FrameDef&{create_shadow?:boolean})={}

    override name="Floor Image"
    constructor(){
        super()
    }
    override on_create(): void{
        this.editor.game.scene_2d.camera.add_object(this.sprite)
        this.update_sprite()
    }
    override on_destroy(): void{
        this.sprite.destroy();
    }
    update_sprite(){
        this.sprite.hotspot=v2.half_one
        this.sprite._scale.set(2,2)
        this.sprite.zIndex=zIndexes.BuildingsFloor3
        this.sprite.set_frame({
            image:this.frame.image,
            position:this.frame.position ?? v2.zero(),
            rotation:this.frame.rotation ?? 0,
            layer:this.layer+(this.frame.layer??0),
            scale:this.frame.scale,
            scale2:this.frame.scale2,
            tint:this.frame.tint,
            alpha:this.frame.alpha,
            hotspot:this.frame.hotspot,
            visible:this.frame.visible,
            zIndex:this.frame.zIndex??zIndexes.BuildingsFloor3,
        },this.editor.game.resources)
    }
    override get_property(name:string){
        return (this.frame as any)[name]
    }
    override set_property(name:string,value:any){
        switch(name){
            case "position":
            case "scale2":
            case "image":
                this.frame[name]=value
                break
            case "tint":
            case "alpha":
            case "rotation":
            case "layer":
            case "scale":
            case "zIndex":
                this.frame[name]=value===undefined?undefined:parseFloat(value)
                break
            case "create_shadow": this.frame.create_shadow=value===undefined?undefined:!!value;break;

        }
        this.update_sprite()
    }

    override get_propertys(): SettingDef[]{
        return [
            ...FrameSettings,
            {type:"toggle",can_disable:true,name:"Create Shadow",var:"create_shadow"}
        ];

    }

    override can_select(position:Vec2):boolean{
        const p=this.frame.position ?? v2.zero()
        return (position.x>=p.x-0.5&&position.x<=p.x+0.5&&position.y>=p.y-0.5&&position.y<=p.y+0.5)
    }

    override on_reload(): void {
        this.update_sprite()
    }

    override clone(): EditorObject {
        const ret=new FloorImageEditorObject()
        ret.frame=cloneDeep(this.frame)
        return ret
    }
    override on_encode(stream:Stream){
        stream.write_boolean_group2(
            this.frame.image!==undefined,
            this.frame.position!==undefined,
            this.frame.rotation!==undefined,
            this.frame.scale!==undefined,

            this.frame.scale2!==undefined,
            this.frame.layer!==undefined,
            this.frame.tint!==undefined,
            this.frame.alpha!==undefined,
            this.frame.zIndex!==undefined,

            this.frame.create_shadow!==undefined
        )

        if(this.frame.image)stream.write_string(this.frame.image)
        if(this.frame.position)stream.write_pos2(this.frame.position)
        if(this.frame.rotation!==undefined)stream.write_rad(this.frame.rotation)
        if(this.frame.scale!==undefined)stream.write_rad(this.frame.scale)
        if(this.frame.scale2)stream.write_pos2(this.frame.scale2)
        if(this.frame.layer!==undefined)stream.write_int16(this.frame.layer)
        if(this.frame.tint!==undefined)stream.write_uint32(this.frame.tint)
        if(this.frame.alpha!==undefined)stream.write_uint8(this.frame.alpha)
        if(this.frame.zIndex!==undefined)stream.write_int16(this.frame.zIndex)
        if(this.frame.create_shadow!==undefined)stream.write_boolean_group(this.frame.create_shadow)
    }
    override on_decode(stream:Stream){
        const [
            image,
            position,
            rotation,
            scale,

            scale2,
            layer,
            tint,
            alpha,

            zIndex,
            shadow
        ]=stream.read_boolean_group2();

        if(image)this.frame.image=stream.read_string()
        if(position)this.frame.position=stream.read_pos2()
        if(rotation)this.frame.rotation=stream.read_rad()
        if(scale)this.frame.scale=stream.read_float32()
        if(scale2)this.frame.scale2=stream.read_pos2()
        if(layer)this.frame.layer=stream.read_int16()
        if(tint)this.frame.tint=stream.read_uint32()
        if(alpha)this.frame.alpha=stream.read_uint8()
        if(zIndex)this.frame.zIndex=stream.read_int16();
        if(shadow){
            const [v]=stream.read_boolean_group();
            this.frame.create_shadow=v;
        }

        this.update_sprite()
    }
}
export class ObstacleEditorObject extends EditorObject{
    override type: number=4
    obstacle?:Obstacle

    def:string=""
    id?:number
    position=v2.zero()
    rotation?:number
    layer?:number
    variation?:number
    skin?:number
    scale?:number
    allow_biome_skin?:boolean

    constructor(){
        super()
    }

    rebuild_obstacle(){
        this.obstacle?.destroy()
        this.obstacle=undefined
        const def=this.editor.game.definitions.obstacles.getFromStringSafe(this.def);
        if(!def)return
        const obj=this.editor.game.scene_2d.objects.add_object(new Obstacle(),Layers.Normal+(this.layer??0)) as Obstacle

        obj.health_data.dead=false
        obj.health_data.health=1
        obj.set_definition(def)
        obj.set_visual(this.skin,this.variation)
        obj.set_physical(this.scale??1,this.position,this.rotation??0)

        this.name="Obstacle:"+def.idString
        this.obstacle=obj
    }
    update_obstacle(){
        if(!this.obstacle||this.obstacle.def.idString!==this.def){
            this.rebuild_obstacle()
            return
        }
        const obj=this.obstacle
        obj.set_visual(this.skin,this.variation)
        obj.set_physical(this.scale??1,this.position,this.rotation??0)
        obj.manager.set_layer(obj,Layers.Normal+(this.layer??0))
    }
    override on_create(): void {
        this.rebuild_obstacle()
    }
    override on_destroy(){
        if(this.obstacle)this.obstacle.destroy()
    }

    override can_select(pos:Vec2){
        return this.obstacle?.hitbox.point_inside(pos)??false
    }
    override get_property(name: string) {
        switch(name){
            case "def":
            case "id":
            case "position":
            case "rotation":
            case "scale":
            case "layer":
            case "variation":
            case "skin":
            case "allow_biome_skin":
                return this[name]
        }
    }
    override get_propertys(): SettingDef[] {
        return [
            {type:"input",name:"Definition",var:"def"},
            {type:"input",name:"ID",can_disable:true,var:"id"},
            {...Vec2Input,name:"Position",var:"position"},
            {type:"input",name:"Rotation",can_disable:true,var:"rotation"},
            {type:"input",can_disable:true,name:"Scale",var:"scale"},
            {type:"input",can_disable:true,name:"Layer",var:"layer"},
            {type:"input",can_disable:true,name:"Variation",var:"variation"},
            {type:"input",can_disable:true,name:"Skin",var:"skin"},
            {type:"toggle",can_disable:true,name:"Allow biome skin",var:"allow_biome_skin"}
        ]
    }
    override set_property(name:string,value:any){
        switch(name){
            case "def":
                this.def=value??"";
                break;
            case "position":
            case "allow_biome_skin":
                this[name]=value;
                break;
            case "id":
            case "variation":
            case "layer":
            case "rotation":
            case "skin":
            case "scale":
                this[name]=value===undefined?value:parseFloat(value);
                break;
        }
        this.update_obstacle()
    }
    override on_tick(dt: number, selected: boolean): void {
        if(this.obstacle&&selected){
            this.editor.hitbox_gfx.ctx.fill_color=ColorM.hex("#f005")
            this.editor.hitbox_gfx.ctx.begin_path()
            this.editor.hitbox_gfx.ctx.hitbox(this.obstacle.hitbox)
            this.editor.hitbox_gfx.ctx.fill()
        }
    }
    override clone(): EditorObject {
        const ret=new ObstacleEditorObject()
        ret.def=this.def
        ret.position=v2.clone(this.position)
        ret.rotation=this.rotation
        ret.layer=this.layer
        ret.variation=this.variation
        ret.skin=this.skin
        ret.scale=this.scale
        ret.allow_biome_skin=this.allow_biome_skin
        return ret
    }
    override on_decode(stream: Stream): void {
        this.def = stream.read_string()
        this.position = stream.read_pos2()

        const[
            id,
            rotation,
            layer,
            variation,
            skin,

            scale,
            allowBiomeSkin
        ]=stream.read_boolean_group2()

        this.id=undefined
        this.rotation=undefined
        this.layer=undefined
        this.variation=undefined
        this.skin=undefined
        this.scale=undefined
        this.allow_biome_skin=undefined

        if(id)this.id=stream.read_id()
        if(rotation)this.rotation=stream.read_float32()
        if(layer)this.layer=stream.read_int16()
        if(variation)this.variation=stream.read_uint8()
        if(skin)this.skin=stream.read_uint8()
        if(scale)this.scale=stream.read_float32()

        if(allowBiomeSkin){
            const [v]=stream.read_boolean_group()
            this.allow_biome_skin=v
        }

        this.rebuild_obstacle()
    }
    override on_encode(stream: Stream) {
        stream.write_string(this.def,1)
        .write_pos2(this.position)
        .write_boolean_group2(
            this.id!==undefined,
            this.rotation!==undefined,
            this.layer!==undefined,
            this.variation!==undefined,
            this.skin!==undefined,

            this.scale!==undefined,
            this.allow_biome_skin!==undefined
        )
        if(this.id!==undefined)stream.write_id(this.id)
        if(this.rotation!==undefined)stream.write_float32(this.rotation)
        if(this.layer!==undefined)stream.write_int16(this.layer)
        if(this.variation!==undefined)stream.write_uint8(this.variation)
        if(this.skin!==undefined)stream.write_uint8(this.skin)
        if(this.scale!==undefined)stream.write_float32(this.scale)
        if(this.allow_biome_skin!==undefined)stream.write_boolean_group(this.allow_biome_skin)
    }
}
export class WallEditorObject extends EditorObject{
    override type=5
    def:WallsDef={
        positions:[],
        tint:0xffffff,
        width:0.4,
        stroke_width:0.15,
    }
    wall:Walls=new Walls()
    override name: string="Wall"
    override childs:{content:EditorObject[]}={content:[]}

    override make_context_menu(menu: any): void {
        menu.add_option("Add Segment",()=>{
            this.editor.objects.selected_object=this.add_child(new WallSegment())
        })
    }
    update_wall_positions(){
        this.def.positions.length=0
        for(const s of this.childs.content){
            const segment:Vec2[]=[]
            if(s instanceof WallSegment){
                for(const p of s.childs.content){
                    if(p instanceof WallPoint)segment.push(p.position)
                }
            }
            this.def.positions.push(segment)
        }
    }
    update_wall(){
        this.update_wall_positions()
        this.wall.set_def(this.def)
    }
    wall_modify(){
        this.update_wall()
    }
    override on_childs_modify(): void {
        this.update_wall()
    }

    override on_create(): void {
        this.editor.game.scene_2d.add_object(this.wall,Layers.Normal+(this.def.layer??0))
        this.update_wall()
    }
    override on_destroy(): void {
        this.wall.destroy()
    }
    override get_property(name: string) {
        switch(name){
            case "layer":
            case "position":
            case "width":
            case "tint":
            case "stroke_width": return this.def[name]
        }
    }
    override set_property(name: string, value: any): void {
        switch(name){
            case "width":
            case "stroke_width":
            case "layer":
            case "tint":
                this.def[name]=value
                this.update_wall()
                break
            case "position":
                this.def[name]=value
                this.wall.position=value??v2.zero
                this.wall.wall.position=this.wall.position
                break
        }
    }

    override get_propertys(): SettingDef[] {
        return [
            {...Vec2Input,name:"Position",var:"position",can_disable:true},
            {type:"input",name:"Layer",var:"layer",can_disable:true},
            {type:"input",name:"Width",var:"width",can_disable:true},
            {type:"input",name:"Stroke Width",var:"stroke_width",can_disable:true},
            {...RGBAInput,name:"Tint",var:"tint"},
        ]
    }

    override on_tick(dt: number,selected:boolean): void {
    }
    override can_select(position: Vec2): boolean {
        return false
    }

    override clone(): EditorObject {
        const wall=new WallEditorObject()
        wall.def=cloneDeep(this.def)
        return wall
    }
    override on_encode(stream:Stream){
        stream.write_boolean_group2(this.def.position!==undefined,this.def.side!==undefined,this.def.tint!==undefined,this.def.width!==undefined,this.def.stroke_width!==undefined)
        if(this.def.position!==undefined)stream.write_pos2(this.def.position)
        if(this.def.side!==undefined)stream.write_uint8(this.def.side)
        if(this.def.tint!==undefined)stream.write_uint32(this.def.tint)
        if(this.def.width!==undefined)stream.write_float32(this.def.width)
        if(this.def.stroke_width!==undefined)stream.write_float32(this.def.stroke_width)
    }
    override on_decode(stream:Stream){
        const [has_position,has_side,has_tint,has_width,has_stroke_width]=stream.read_boolean_group2()
        if(has_position)this.def.position=stream.read_pos2()
        if(has_side)this.def.side=stream.read_uint8()
        if(has_tint)this.def.tint=stream.read_uint32()
        if(has_width)this.def.width=stream.read_float32()
        if(has_stroke_width)this.def.stroke_width=stream.read_float32()
    }
}
export class WallSegment extends EditorObject{
    override type: number=6
    override childs:{content:EditorObject[];}={content:[]}
    override name:string="Wall Segment"

    override make_context_menu(menu: any): void {
        menu.add_option("Add Point",()=>{
            this.editor.objects.selected_object=this.add_child(new WallPoint())
        })
    }

    override on_childs_modify(): void {
        this.parent?.on_childs_modify?.()
    }
    override get_property(name: string) {
    }
    override set_property(name: string, value: any): void {
    }

    wall_modify(){
        if(this.parent instanceof WallEditorObject||this.parent instanceof WallSegment||this.parent instanceof WallPoint){
            this.parent.wall_modify()
        }
    }

    override get_propertys(): SettingDef[] {
        return []
    }
    override clone(): EditorObject {
        return new WallSegment()
    }
}
export class WallPoint extends EditorObject{
    override type: number=7
    position:Vec2=v2.zero()
    override name: string="Wall Point"

    wall_modify(){
        if(this.parent instanceof WallEditorObject||this.parent instanceof WallSegment||this.parent instanceof WallPoint){
            this.parent.wall_modify()
        }
    }

    override get_property(name: string) {
        if(name==="position")return this.position
    }
    override set_property(name: string, value: any): void {
        if(name==="position"){
            this.position=value
            this.wall_modify()
        }
    }

    override get_propertys(): SettingDef[] {
        return [
            {...Vec2Input,name:"Position",var:"position"},
        ]
    }
    override clone(): EditorObject {
        const ret=new WallPoint()
        ret.position=v2.clone(this.position)
        return ret
    }

    override on_encode(stream: Stream): void {
        stream.write_pos2(this.position)
    }
    override on_decode(stream: Stream): void {
        this.position=stream.read_pos2()
    }
}