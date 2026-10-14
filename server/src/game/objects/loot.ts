import { GameConstants, GameObjectType, LootData } from "common/scripts/others/constants.ts";
import { ServerGameObject } from "../others/gameObject.ts";
import { GameItemType } from "common/scripts/definitions/utils.ts";
import { FloorType } from "common/scripts/others/terrain.ts";
import { CircleHitbox2D, DefaultGELvents, ObjectComponent, Stream, v2, Vec2 } from "common/engine/core.ts";
import { Human } from "./human.ts";
import { c_loot_entity, Loot_CData, LootEntity_CData } from "common/scripts/game/objects/loot.ts"
import { SimulatedObject } from "common/scripts/game/objects/base.ts";
import { encode_loot_data } from "common/scripts/others/functions.ts";
export const c_loot_ns:ObjectComponent<Loot_CData&SimulatedObject>={
    number_name:0,
    string_name:"loot_ns",
    events:{
        [DefaultGELvents.net_encode]:[
            (obj,stream:Stream,full:boolean)=>{
                stream.write_pos2(  obj.position)
                if(full){
                    encode_loot_data(obj.game.definitions,obj.loot_data,stream)
                }
            }
        ]
    },
    methods:{
        set_loot_data(ctx,loot:LootData){
            ctx.object.loot_data={
                ...loot
            }
            let radius=1
            switch(loot.item.item_type){
                case GameItemType.gun:
                case GameItemType.melee:
                    radius=GameConstants.loot.radius.weapon
                    break
                case GameItemType.ammo:
                    radius=GameConstants.loot.radius.ammo
                    break
                case GameItemType.consumible:
                    radius=GameConstants.loot.radius.consumible
                    break
                case GameItemType.helmet:
                    radius=GameConstants.loot.radius.equipament
                    break
                case GameItemType.backpack:
                case GameItemType.vest:
                    radius=GameConstants.loot.radius.equipament
                    break
                case GameItemType.grenade:
                    radius=GameConstants.loot.radius.grenade
                    break
                case GameItemType.accessory:
                    radius=GameConstants.loot.radius.accessory
                    break
                case GameItemType.scope:
                    radius=GameConstants.loot.radius.scopes
                    break
            }
            ;(ctx.object.base_hitbox as CircleHitbox2D).radius=radius
        }
    }
}
export class Loot extends ServerGameObject implements LootEntity_CData{
    string_type:string="loot"
    number_type: number=GameObjectType.Loot

    real_radius:number=0
    loot_data!:LootData

    old_position!:Vec2
    velocity!:Vec2
    current_floor!:FloorType

    push!:(speed:number,angle:number)=>void
    set_loot_data!:(loot: LootData)=>void

    constructor(){
        super()

        this.add_component(c_loot_entity)
        this.add_component(c_loot_ns)
    }
    reduce_count(count:number){
        this.loot_data.count-=count
        this.destroy()
        if(this.loot_data.count>0){
            this.scene.add_loot(this.position,this.loot_data,this.layer)
        }
    }
    override can_interact(user: Human): boolean {
        return user.hitbox.colliding_with(this.hitbox)&&!this.destroyed&&this.loot_data.count>0
    }
    override on_interact(user: Human): void {
        const c=user.inventory.give_item(this.loot_data.item,this.loot_data.count,false,this.loot_data.ammo,this.loot_data.skin)
        for(const l of this.loot_data.aditional??[]){
            user.inventory.give_loot(l,undefined,undefined,this.position,this.layer)
        }
        this.loot_data.aditional=[]
        if(c!==this.loot_data.count){
            this.reduce_count(this.loot_data.count-c)
        }
        return
    }
    override on_create(args?: {position:Vec2,loot:LootData,pre_proccess?:number}): void {
        this.base_hitbox=new CircleHitbox2D(v2(0,0),1)
        if(args?.position)this.position=args.position
        if(args)this.set_loot_data(args.loot)
    }
}