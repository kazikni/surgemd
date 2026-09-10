import { Sound, WallShape2D } from "common/engine/web.ts"
import { GameObjectType, zIndexes } from "common/scripts/others/constants.ts"
import { StaticBody, StaticBodyAssetData, StaticBodyPhysicalData } from "./static_body.ts";
import { Angle, ColorM, HitboxGroup2D, NullHitbox2D, Orientation, Stream, v2, v2m, Vec2} from "common/engine/core.ts";
import { HitParticlesDef, HitSoundsDef } from "common/scripts/definitions/utils.ts";
export class Walls extends StaticBody{
    ////////////////////////////
    // Definition             //
    ////////////////////////////
    override string_type:string="walls"
    override number_type: number=GameObjectType.Walls

    override physical_data:StaticBodyPhysicalData={
        hitbox:new NullHitbox2D(v2.zero),
        
        no_bullets_collision:false,
        no_collision:false,
        reflect_bullets:false,
        passable_by_bullets:false,

        side:0
    }

    wall:WallShape2D=new WallShape2D()

    ////////////////////////////
    // Assets                 //
    ////////////////////////////
    override assets_data: StaticBodyAssetData&{
        sounds:{
            break?:Sound
        }
    }={
        particles:{
            images:[]
        },
        sounds:{
            hit:[],
        }
    }

    constructor(){
        super()
    }

    set_wall(pos:Vec2[][],tint:number,width=0.3,stroke_width=0.1,hit_sounds:HitSoundsDef,hit_particles:HitParticlesDef){
        this.wall.position=this.position
        this.wall.rotation=Angle.side_rad(this.physical_data.side as Orientation)
        this.wall.fill_color=ColorM.number(tint)
        this.wall.stroke_color=ColorM.mult_hsv(this.wall.fill_color,1.2,undefined,0.55)
        this.wall.set_wall(pos,width,stroke_width)
        if(hit_sounds)this.set_hit_sounds_def(hit_sounds)
        if(hit_particles)this.set_hit_particles_def("wall",0,{
            tint:tint,
            particle:"plank_particle",
        })

        this.physical_data.hitbox=new HitboxGroup2D(...HitboxGroup2D.walls(pos,width))
        this.base_hitbox=this.physical_data.hitbox.transform(undefined,undefined,undefined,this.physical_data.side)
        this.physical_data.no_bullets_collision=false
        this.physical_data.no_collision=false
    }
    override on_destroy(): void {
        this.wall.destroy()
    }
    override on_layer_set(): void {
        this.wall.layer=this.layer
    }
    override on_create(args: any): void {
        super.on_create(args)
        this.wall.zIndex=zIndexes.BuildingsWalls1
        this.scene.camera.add_object(this.wall)
    }
    override on_decode_net(stream: Stream, full: boolean): void {
        const [physical_data]=stream.read_boolean_group()
        if(physical_data||full){
            const bg=stream.read_boolean_group()
            this.physical_data.no_collision=bg[0]
            this.physical_data.no_bullets_collision=bg[1]
            this.physical_data.passable_by_bullets=bg[2]
            this.position=stream.read_pos2()
            this.physical_data.side=stream.read_uint8()

            const positions=stream.read_array(()=>stream.read_array(()=>stream.read_pos2(),2),1)
            const assets=stream.read_any(4,4)
            const width=stream.read_float32()
            const stroke_width=stream.read_float32()
            const tint=stream.read_uint32()

            this.set_wall(positions,tint,width,stroke_width,assets?.sounds,assets?.particles)
        }
    }
}