import { Hitbox2D, Container2DObject, Sprite2D, ColorM, Numeric, NetStream, Angle, v2, Orientation, Sound } from "common/engine/client.ts"
import { BuildingDef } from "common/scripts/definitions/objects/buildings_base.ts"
import { GameObjectType, zIndexes } from "common/scripts/others/constants.ts"
import { StaticBody, StaticBodyAssetData } from "./static_body.ts";
export class Building extends StaticBody{
    ////////////////////////////
    // Definition             //
    ////////////////////////////
    override string_type:string="building"
    override number_type: number=GameObjectType.Building
    def!:BuildingDef

    objects:Container2DObject[]=[]

    ceilings:{
        collided:boolean
        opacity:number
        hitbox:Hitbox2D
        container:Container2DObject
    }[]=[]

    
    ////////////////////////////
    // Assets                 //
    ////////////////////////////
    override assets_data: StaticBodyAssetData&{
        sounds:{    
            break?:Sound
        }
    }={
        frame:{
            particles:[]
        },
        sounds:{
            hit:[],
        }
    }

    override on_destroy(): void {
        for(const o of this.objects){
            o.destroy()
        }
    }
    update(dt:number): void {
        for(const c of this.ceilings){
            if(!c.collided){
                c.container.tint.a=Numeric.lerp(c.container.tint.a,1,1/(1+dt*1000))
            }
            c.collided=false
        }
    }
    constructor(){
        super()
    }
    set_definition(def:BuildingDef){
        if(this.def)return
        if(def.hitbox)this.base_hitbox=def.hitbox

        this.def=def
        const rot=Angle.side_rad(this.physical_data.side as Orientation)

        for(const f of def.floor_image??[]){
            const sprite=new Sprite2D()
            sprite.set_frame({
                image:f.image,
                position:f.position?v2.add(this.position,f.position):undefined,
                hotspot:f.hotspot,
                rotation:rot+(f.rotation??0),
                scale:f.scale,
                zIndex:f.zIndex??zIndexes.BuildingsFloor,
                tint:f.tint
            },this.game.resources)

            sprite.layer=this.layer+(f.layer??0)
            this.game.cam2d.addObject(sprite)
            this.objects.push(sprite)
        }
        for(const c of def.ceiling??[]){
            const sprite=new Sprite2D()
            sprite.set_frame({
                image:c.frame.image,
                position:c.frame.position?v2.add(this.position,c.frame.position):undefined,
                hotspot:c.frame.hotspot,
                rotation:rot+(c.frame.rotation??0),
                scale:c.frame.scale,
                zIndex:c.frame.zIndex??zIndexes.BuildingsCeiling,
                tint:c.frame.tint
            },this.game.resources)
            sprite.layer=this.layer+(c.layer??0)
            this.game.cam2d.addObject(sprite)
            this.objects.push(sprite)

            this.ceilings.push({
                container:sprite,
                hitbox:c.hitbox.transform(this.position),
                opacity:c.visible_opacity??0.5,
                collided:false
            })
        }
        
        this.assets_data.frame={
            particles:[]
        }

        this.assets_data.frame.particles.push((this.def.assets?.particles)??(this.def.idString+"_particle"))

        if(this.def.assets?.particles_tint){
            this.assets_data.particles_tint=ColorM.number(this.def.assets.particles_tint)
        }
        if(this.def.assets?.particles_variation){
            const fn=this.assets_data.frame.particles[0]
            this.assets_data.frame.particles.length=0

            for(let i=0;i<this.def.assets.particles_variation;i++){
                this.assets_data.frame.particles.push(`${fn}_${i+1}`)
            }
        }
        this.manager.cells.updateObject(this)
    }
    override decode(stream: NetStream, full: boolean): void {
        const [physical_data_part,physical_data]=stream.readBooleanGroup()
        if(physical_data_part||physical_data||full){
            this.decode_physical_data(stream,physical_data||full)
        }
        if(full){
            const def=this.game.definitions.buildings.getFromNumber(stream.readID())
            this.set_definition(def)
            this.manager.cells.updateObject(this)
        }
    }
}