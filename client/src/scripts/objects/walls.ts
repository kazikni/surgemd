import { Sound, WallShape2D } from "common/engine/web.ts"
import { GameObjectType, zIndexes } from "common/scripts/others/constants.ts"
import { StaticBody, StaticBodyAssetData, StaticBodyPhysicalData } from "./static_body.ts";
import { HitboxGroup2D, NullHitbox2D, Stream, v2, Vec2} from "common/engine/core.ts";
export class Wall extends StaticBody{
    ////////////////////////////
    // Definition             //
    ////////////////////////////
    override string_type:string="walls"
    override number_type: number=GameObjectType.Walls

    override physical_data: StaticBodyPhysicalData={
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

    set_wall(position:Vec2[][],width=0.3,stroke_width=0.1){
        this.wall.set_wall(position,width,stroke_width)
        this.physical_data.hitbox=new HitboxGroup2D(...HitboxGroup2D.walls(position,width))
        this.base_hitbox=this.physical_data.hitbox
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
        this.game.scene_2d.camera.add_object(this.wall)
    }
    override on_decode_net(stream: Stream, full: boolean): void {
        const [physical_data]=stream.read_boolean_group()
        if(physical_data||full){
            this.position=stream.read_pos2()
            this.physical_data.side=stream.read_uint8()
        }
    }
}