import { GameConstants, GameObjectType, LootData } from "common/scripts/others/constants.ts";
import { ServerGameObject } from "../others/gameObject.ts";
import { GameItemType } from "common/scripts/definitions/utils.ts";
import { FloorType } from "common/scripts/others/terrain.ts";
import { CircleHitbox2D, Stream, v2, v2m, Vec2 } from "common/engine/core.ts";
import { Human } from "./human.ts";
import { decode_loot_data, encode_loot_data } from "common/scripts/others/functions.ts";
import { loot_physics, LootBasePhysics } from "common/scripts/objects/moving_body.ts";

export class Loot extends ServerGameObject implements LootBasePhysics{
    string_type:string="loot"
    number_type: number=GameObjectType.Loot

    real_radius:number=0
    loot_data!:LootData

    old_position!:Vec2
    velocity!:Vec2
    current_floor!:FloorType

    constructor(){
        super()

        this.add_component(loot_physics)
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
    set_loot(position:Vec2,loot:LootData){
        this.position=position
        this.loot_data={
            item:loot.item,
            count:loot.count,
            aditional:loot.aditional,
            ammo:loot.ammo,
            skin:loot.skin
        }
        switch(loot.item.item_type){
            case GameItemType.gun:
            case GameItemType.melee:
                this.real_radius=GameConstants.loot.radius.weapon
                break
            case GameItemType.ammo:
                this.real_radius=GameConstants.loot.radius.ammo
                break
            case GameItemType.consumible:
                this.real_radius=GameConstants.loot.radius.consumible
                break
            case GameItemType.helmet:
                this.real_radius=GameConstants.loot.radius.equipament
                break
            case GameItemType.backpack:
            case GameItemType.vest:
                this.real_radius=GameConstants.loot.radius.equipament
                break
            case GameItemType.grenade:
                this.real_radius=GameConstants.loot.radius.grenade
                break
            case GameItemType.accessory:
                this.real_radius=GameConstants.loot.radius.accessory
                break
            case GameItemType.scope:
                this.real_radius=GameConstants.loot.radius.scopes
                break
        }
        (this.base_hitbox as CircleHitbox2D).radius=this.real_radius
    }
    override on_create(args?: {position:Vec2,loot:LootData,pre_proccess?:number}): void {
        this.base_hitbox=new CircleHitbox2D(v2(0,0),1)
        if(args)this.set_loot(args.position,args.loot)
    }
    override on_tick(dt:number): void {
    }
    push(speed:number,angle:number){
        const a=v2.from_RadAngle(angle)
        v2m.add_component(this.velocity,a.x*speed,a.y*speed)
    }

    override on_encode_net(stream: Stream, full: boolean): void {
        stream.write_pos2(this.position)
        if(full){
            encode_loot_data(this.game.definitions,this.loot_data,stream)
        }
    }
    override on_encode_checkpoint(stream: Stream): void {
        stream.write_pos2(this.position)
        .write_pos2(this.velocity)
        encode_loot_data(this.game.definitions,this.loot_data,stream)
    }
    override on_decode_checkpoint(stream: Stream): void {
        const position=stream.read_pos2()
        this.velocity=stream.read_pos2()
        this.set_loot(position,decode_loot_data(this.game.definitions,stream))
    }
}