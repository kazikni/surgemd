import { Stream, v2, Vec2 } from "../../engine/core.ts";
import { GameADefinitions, GameDefinition } from "../definitions/game_defs.ts";
import { MapBiomeDef, MapBiomeTD } from "../definitions/maps/base.ts";
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
export type MapConfig={
    minimap_enabled:boolean
    seed:number
    objects:MapObjectEncode[]
    regions:MapRegion[]
    biome:MapBiomeDef
    terrain:Floor[]
    definitions?:GameADefinitions
    size:Vec2
}

export function encode_map_config(map:MapConfig,stream:Stream){
    stream.write_boolean_group(map.minimap_enabled)
    stream.write_array(map.terrain,(t)=>{
        stream.write_boolean_group(t.smooth,t.visible,t.tint!==undefined)
        .write_hitbox(t.hb)
        .write_uint8(t.type)
        .write_int8(t.layer)
        if(t.tint!==undefined){
            stream.write_uint32(t.tint)
        }
    },2)
    if(map.minimap_enabled){
        stream.write_array(map.objects,(i)=>{
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
        .write_array(map.regions,(v)=>{
            stream.write_string(v.name,1)
            .write_pos2(v.position)
        },1)
        .write_uint32(map.seed)
    }
    stream.write_uint16(map.size.x)
    .write_uint16(map.size.y)
    .write_td(map.biome,MapBiomeTD)
    //write_biome(map.biome,stream)

    //const old_len=stream.length
    stream.write_td(map.definitions,GameDefinition.add_client_td)
    //stream.write_any(map.definitions)
    //console.log(stream.length-old_len)
}
export function decode_map_config(stream:Stream):MapConfig{
    const map:MapConfig={
        biome:{
            floors:{},
            musics:[],
            particles:[],
            textures:[]
        },
        minimap_enabled:false,
        objects:[],
        regions:[],
        seed:0,
        size:v2.zero(),
        terrain:[]
    }
    const [minimap]=stream.read_boolean_group()
    map.minimap_enabled=minimap
    map.terrain=stream.read_array(()=>{
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
    if(map.minimap_enabled){
        map.objects=stream.read_array(()=>{
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
        map.regions=stream.read_array(()=>{
            return {
                name:stream.read_string(1),
                position:stream.read_pos2()
            }
        },1)
        map.seed=stream.read_uint32()
    }else{
        map.objects=[]
        map.regions=[]
        map.seed=0
    }

    map.size=v2(stream.read_uint16(),stream.read_uint16())
    map.biome=stream.read_td(MapBiomeTD)

    map.definitions=stream.read_td(GameDefinition.add_client_td)
    //map.definitions=stream.read_any()

    return map
}