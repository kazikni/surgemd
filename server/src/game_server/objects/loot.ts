import { GameConstants, GameObjectType } from "common/scripts/others/constants.ts";
import { ServerGameObject } from "../others/gameObject.ts";
import { InventoryItemType } from "common/scripts/definitions/utils.ts";
import { Floors, FloorType } from "common/scripts/others/terrain.ts";
import { CircleHitbox2D, NetStream, v2, v2m, Vec2 } from "common/engine/core.ts";
import { Human } from "./human.ts";
import { StaticBody } from "./static_body.ts";
import { GameItem } from "common/scripts/definitions/game_defs.ts";

export class Loot extends ServerGameObject{
    string_type:string="loot"
    number_type: number=GameObjectType.Loot

    current_floor:FloorType=FloorType.Water
    loot_data!:{
        real_radius:number

        count:number
        item:GameItem
    }

    old_position:Vec2=v2.new(-1,-1)
    velocity:Vec2

    constructor(){
        super()
        this.velocity=v2.zero()
        this.old_position=v2.clone(this.position)
    }
    reduce_count(count:number){
        this.loot_data.count-=count
        this.destroy()
        if(this.loot_data.count>0){
            this.game.add_loot(this.position,this.loot_data.item,this.loot_data.count,this.layer)
        }
    }
    override can_interact(user: Human): boolean {
        return user.hitbox.collidingWith(this.hitbox)&&!this.destroyed
    }
    interact(user: Human): void {
        const c=user.inventory.give_item(this.loot_data.item,this.loot_data.count,false)
        if(c!==this.loot_data.count){
            this.reduce_count(this.loot_data.count-c)
        }
        return
    }
    override net_update(): void {
        super.net_update()
    }
    update(dt:number): void {
        const cf=Floors[this.current_floor]
        const speed=1
                  * (cf.speed_mult??1)
        const others:ServerGameObject[]=this.manager.cells.get_objects(this.hitbox,this.layer)
        for(const other of others){
            switch(other.number_type){
                case GameObjectType.Loot:{
                    if(other.id===this.id)continue
                    const col=this.hitbox.overlapCollision(other.hitbox)
                    if(col.length>0){
                        this.velocity=v2.sub(this.velocity,v2.scale((col[0].dir.x===1&&col[0].dir.y===0)?v2.random(-1,1):col[0].dir,6*dt))
                    }
                    break
                }
                case GameObjectType.StaticBody:
                case GameObjectType.Obstacle:
                case GameObjectType.Building:{
                    if((other as StaticBody).physical_data.no_collision)break
                    const col=this.hitbox.overlapCollision(other.hitbox)
                    for(const c of col){
                        this.position=v2.sub(this.position,v2.scale(c.dir,c.pen))
                        this.velocity=v2.sub(this.velocity,v2.scale((c.dir.x===1&&c.dir.y===0)?v2.random(-1,1):c.dir,0.03))
                    }
                    break
                }
            }
            
        }
        if(this.velocity.x!=0||this.velocity.y!=0){
            v2m.scale(this.velocity,this.velocity,1/(1+dt*(
                GameConstants.loot.velocityDecay/
                ((cf.acceleration??13)/13)
            )))
            const pos=v2.add(this.position,v2.scale(this.velocity,speed*dt))
            this.position=this.game.map.clamp_hitbox(pos,this.base_hitbox)
        }
        if(!v2.is(this.position,this.old_position)){
            this.net_sync.part=true

            this.old_position=v2.clone(this.position)
            this.current_floor=this.game.map.terrain.get_floor_type(this.position,this.layer,this.game.map.def.default_floor??FloorType.Water)
            this.manager.cells.updateObject(this)
        }
    }
    push(speed:number,angle:number){
        const a=v2.from_RadAngle(angle)
        v2m.add_component(this.velocity,a.x*speed,a.y*speed)
    }
    create(args: {position:Vec2,item:GameItem,count:number}): void {
        this.base_hitbox=new CircleHitbox2D(v2.new(0,0),0.3)

        this.position=args.position

        this.loot_data={
            count:args.count,
            item:args.item,
            real_radius:this.base_hitbox.radius
        }

        switch(this.loot_data.item.item_type){
            case InventoryItemType.gun:
            case InventoryItemType.melee:
                this.base_hitbox.radius=GameConstants.loot.radius.weapon
                break
            case InventoryItemType.ammo:
                this.base_hitbox.radius=GameConstants.loot.radius.ammo
                break
            case InventoryItemType.consumible:
                this.base_hitbox.radius=GameConstants.loot.radius.consumible
                break
            case InventoryItemType.backpack:
            case InventoryItemType.helmet:
            case InventoryItemType.vest:
                this.base_hitbox.radius=GameConstants.loot.radius.equipament
                break
            case InventoryItemType.grenade:
                this.base_hitbox.radius=GameConstants.loot.radius.grenade
                break
            case InventoryItemType.accessorie:
            case InventoryItemType.skin:
                this.base_hitbox.radius=GameConstants.loot.radius.skin
                break
        }

        this.manager.cells.updateObject(this)
    }
    override on_destroy(): void {
        const idx=this.game.loot.indexOf(this)
        if(idx!==-1){
            this.game.loot.splice(idx,1)
        }
    }
    override encode(stream: NetStream, full: boolean): void {
        stream.writePos2(this.position)
        if(full){
            stream.writeUint16(this.game.definitions.game_items.keysString[this.loot_data.item.idString])
            .writeUint8(this.loot_data.count)
        }
    }
}