import { Stream, Packet, v2, Vec2 } from "../../engine/core.ts";
import { MapBiomeDef } from "../definitions/maps/base.ts";
import { NormalBiome } from "../definitions/maps/normal.ts";
import { JSONBuildingDef } from "../definitions/objects/buildings_base.ts";
import { ObstacleDef } from "../definitions/objects/obstacles.ts";
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
    buildings?:JSONBuildingDef[]
    obstacles?:ObstacleDef[]
}
function write_biome(biome:MapBiomeDef,stream:Stream){
    stream.write_array(biome.musics??[],(i,_s)=>{
        stream.write_string(i,1)
    })
    .write_uint32(biome.particles_tint??0)
    .write_array(biome.particles,(i,_s)=>{
        stream.write_string(i,1)
    })
    .write_string(biome.ambient_sound??"",1)
    .write_number_dict(biome.floors as Record<number,number>,(i)=>{
        stream.write_uint32(i)
    },1)
}
function decode_biome(stream:Stream):MapBiomeDef{
    const biome:MapBiomeDef={
        floors:{},
        skin:"",
        musics:[],
        particles:[],
        textures:[]
    }
    biome.musics=stream.read_array(()=>{
        return stream.read_string(1)
    },1)
    biome.particles_tint=stream.read_uint32()
    biome.particles=stream.read_array(()=>stream.read_string(1),1)
    biome.ambient_sound=stream.read_string(1)
    biome.floors=stream.read_number_dict((_s)=>{
        return stream.read_uint32()
    },1)
    return biome
}
export class MapPacket extends Packet{
    ID=PacketType.Map
    Name="map"
    map:MapConfig={terrain:[],size:v2(0,0),objects:[],seed:0,biome:NormalBiome,buildings:[],regions:[]}
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
        write_biome(this.map.biome,stream)
        stream.write_object_advanced(this.map.buildings)
        .write_object_advanced(this.map.obstacles)
        .write_array(this.map.regions,(v)=>{
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
        this.map.biome=decode_biome(stream)
        this.map.buildings=stream.read_object_advanced()
        this.map.obstacles=stream.read_object_advanced()
        this.map.regions=stream.read_array(()=>{
            return {
                name:stream.read_string(1),
                position:stream.read_pos2()
            }
        },1)
    }
}