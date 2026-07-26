import { Stream, Packet, v2, Vec2 } from "../../engine/core.ts";
import { GameADefinitions, GameDefinition } from "../definitions/game_defs.ts";
import { MapBiomeDef, MapBiomeTD } from "../definitions/maps/base.ts";
import { NormalBiome } from "../definitions/maps/normal.ts";
import { PacketType } from "../definitions/utils.ts";
import { Floor } from "../others/terrain.ts";
export interface MapRegion{
    name:string
    position:Vec2
}
export interface MapObjectObstacle{
    type:0,
    def:number
    rotation:number
    variation:number
    position:Vec2
    scale:number
    skin:number
}
export type MapObjectEncode=MapObjectObstacle
export interface MapConfig{
    terrain:Floor[]
    size:Vec2
    seed:number
    biome:MapBiomeDef
    objects:MapObjectEncode[]
    regions:MapRegion[]
    definitions?:GameADefinitions
}
export class MapPacket extends Packet{
    ID=PacketType.Map
    Name="map"
    map:MapConfig={terrain:[],size:v2(0,0),objects:[],seed:0,biome:NormalBiome,regions:[]}
    constructor(){
        super()
    }
    encode(stream: Stream): void {
        stream.write_array(this.map.terrain,(t)=>{
            stream.write_boolean_group(t.smooth,t.visible,t.tint!==undefined)
            .write_hitbox(t.hb)
            .write_uint8(t.type)
            .write_int8(t.layer)
            if(t.tint!==undefined){
                stream.write_uint32(t.tint)
            }
        },2)
        .write_array(this.map.objects,(i)=>{
            stream.write_uint8(i.type)
            switch(i.type){
                case 0:
                    stream.write_id(i.def)
                    .write_rad(i.rotation)
                    .write_uint8(i.variation)
                    .write_uint8(i.skin)
                    .write_pos2(i.position)
                    .write_float(i.scale,0,10,2)
            }
        },2)
        .write_uint32(this.map.seed)
        .write_uint16(this.map.size.x)
        .write_uint16(this.map.size.y)
        .write_td(this.map.biome,MapBiomeTD)
        //write_biome(this.map.biome,stream)

        //const old_len=stream.length
        stream.write_td(this.map.definitions,GameDefinition.add_client_td)
        //stream.write_any(this.map.definitions)
        //console.log(stream.length-old_len)

        stream.write_array(this.map.regions,(v)=>{
            stream.write_string(v.name,1)
            .write_pos2(v.position)
        },1)
    }
    decode(stream: Stream): void {
        this.map.terrain=stream.read_array(()=>{
            const bg=stream.read_boolean_group()
            const hb=stream.read_hitbox()
            const floor:Floor={
                type:stream.read_uint8(),
                layer:stream.read_int8(),
                smooth:bg[0],
                visible:bg[1],
                hb:hb,
            }
            if(bg[2]){
                floor.tint=stream.read_uint32()
            }
            return floor
        },2)
        this.map.objects=stream.read_array(()=>{
            const tp=stream.read_uint8()
            switch(tp){
                default:
                    return {
                        type:0,
                        def:stream.read_id(),
                        rotation:stream.read_rad(),
                        variation:stream.read_uint8(),
                        skin:stream.read_uint8(),
                        position:stream.read_pos2(),
                        scale:stream.read_float(0,10,2),
                    }
            }
        },2)
        this.map.seed=stream.read_uint32()
        this.map.size=v2(stream.read_uint16(),stream.read_uint16())
        this.map.biome=stream.read_td(MapBiomeTD)

        this.map.definitions=stream.read_td(GameDefinition.add_client_td)
        //this.map.definitions=stream.read_any()

        this.map.regions=stream.read_array(()=>{
            return {
                name:stream.read_string(1),
                position:stream.read_pos2()
            }
        },1)
    }
}