import { cloneDeep, ColorM, FrameDef, Stream, v2, v2m, Vec2 } from "common/engine/core.ts";
import { type EditorManager } from "../managers/editorManager.ts";
import { Sprite2D } from "common/engine/web.ts";
import { Layers, zIndexes } from "common/scripts/others/constants.ts";
import { FrameSettings, SettingDef, Vec2Input } from "./settings.ts";
import { Obstacle } from "../objects/obstacle.ts";

export abstract class EditorObject{
    type:number=0
    editor!:EditorManager
    destroyed:boolean=false

    constructor(){

    }
    abstract set_property(name:string,value:any):void
    abstract get_property(name:string):any

    name():string{return "Object"}
    abstract get_propertys():SettingDef[]

    on_reload():void{}
    on_tick(dt:number,selected:boolean):void{}
    on_create():void{}
    on_destroy():void{}
    can_select(position:Vec2):boolean{return false}

    on_drag(delta:Vec2){}
    on_drag_over(delta: Vec2): void {
        this.editor.update_propertys_window(this)
    }

    abstract clone():EditorObject
    encode(stream:Stream){}
    decode(stream:Stream){}
}
export class RectHitboxEditorObject extends EditorObject{
    override type=1
    group:string=""
    min:Vec2=v2.zero()
    max:Vec2=v2.one()
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


    override name():string{return "Rect Hitbox"}
    override get_propertys(): SettingDef[] {
        return [
            {type:"input",name:"Group",var:"group"},
            {...Vec2Input,name:"Min",var:"min"},
            {...Vec2Input,name:"Max",var:"max"},
        ]
    }
    override on_tick(dt: number,selected:boolean): void {
        this.editor.game.hitboxes_gfx.ctx.fill_color=ColorM.hex(selected?"#ff05":"#f00a")
        this.editor.game.hitboxes_gfx.ctx.rect(this.min,this.max)
        this.editor.game.hitboxes_gfx.ctx.fill()
    }
    override on_drag(delta: Vec2): void {
        v2m.add(this.min,this.min,delta)
        v2m.add(this.max,this.max,delta)
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
    override encode(stream:Stream){
        stream.write_string(this.group,1).write_pos2(this.min).write_pos2(this.max)
    }
    override decode(stream:Stream){
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

    override name():string{return "Circle Hitbox"}
    override get_propertys(): SettingDef[] {
        return [
            {type:"input",name:"Group",var:"group"},
            {...Vec2Input,name:"Center",var:"center"},
            {type:"input",name:"Radius",var:"radius"},
        ]
    }

    override on_tick(dt: number,selected:boolean): void {
        this.editor.game.hitboxes_gfx.ctx.fill_color=ColorM.hex(selected?"#ff05":"#f00a")
        this.editor.game.hitboxes_gfx.ctx.circle(this.center,this.radius,100)
        this.editor.game.hitboxes_gfx.ctx.fill()
    }
    override on_drag(delta: Vec2): void {
        v2m.add(this.center,this.center,delta)
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
    override encode(stream:Stream){
        stream.write_string(this.group,1).write_pos2(this.center).write_rad(this.radius)
    }
    override decode(stream:Stream){
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
    constructor(){
        super()
    }
    override on_create(): void{
        this.editor.game.cam2d.add_object(this.sprite)
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

    override name():string{return "Floor Image: "+this.frame.image}
    override get_propertys(): SettingDef[]{
        return [
            ...FrameSettings,
            {type:"toggle",can_disable:true,name:"Create Shadow",var:"create_shadow"}
        ];

    }

    override on_drag(delta: Vec2): void {
        if(!this.frame.position)this.frame.position=v2(0,0)
        v2m.add(this.frame.position,this.frame.position,delta)
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
    override encode(stream:Stream){
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
    override decode(stream:Stream){
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
    override on_drag(delta: Vec2): void {
        v2m.add(this.position,this.position,delta)
        this.update_obstacle()
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
    override name():string{return "Obstacle: "+this.def}
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
            this.editor.game.hitboxes_gfx.ctx.fill_color=ColorM.hex("#f005")
            this.editor.game.hitboxes_gfx.ctx.hitbox(this.obstacle.hitbox)
            this.editor.game.hitboxes_gfx.ctx.fill()
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
    override decode(stream: Stream): void {
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
    override encode(stream: Stream) {
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