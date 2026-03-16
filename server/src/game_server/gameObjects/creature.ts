import { LootTableItemRet, NetStream, v2, v2m, Vec2 } from "common/engine/core.ts";
import { ServerGameObject } from "../others/gameObject.ts";
import { type Player } from "./player.ts";
import { type CreatureDef } from "common/scripts/definitions/objects/creatures.ts";
import { CreaturesUpdates, CreatureUFunc } from "../defs/creatures_extra.ts";
import { DamageParams } from "../others/utils.ts";
import { Obstacle } from "./obstacle.ts";
import { GameItem } from "common/scripts/definitions/alldefs.ts";

export class Creature extends ServerGameObject{
    string_type:string="creature"
    number_type: number=10

    update_func?:CreatureUFunc

    def!:CreatureDef
    state:number=0

    angle:number=0
    velocity:Vec2=v2.new(0,0)

    old_position=v2.new(-1,-1)
    old_rotation=0
    
    health:number=100
    dead:boolean=false

    loot:LootTableItemRet<GameItem>[]=[]

    constructor(){
        super()
    }
    kill(){
        if(this.dead)return
        this.dead=true
        this.dirty=true
        for(const l of this.loot){
            this.game.add_loot(this.position,l.item,l.count)
        }
    }
    damage(params:DamageParams){
        if(this.def.imortal)return
        this.health=Math.max(this.health-params.amount,0)
        if(this.health<=0){
            this.kill()
        }
    }

    update(dt:number): void {
        if(this.dead)return
        if(this.update_func)this.update_func(this,dt)
        if(!v2.is(this.old_position,this.position)||this.old_rotation!==this.angle){
            this.dirtyPart=true
            this.old_position=v2.clone(this.position)
            this.old_rotation=this.angle
            this.manager.cells.updateObject(this)
        }
        v2m.add(this.position,this.position,v2.scale(this.velocity,dt))
        //Collision
        const objs=this.manager.cells.get_objects(this.hitbox,this.layer)
        for(const obj of objs){
            if(obj.id===this.id)continue
            switch(obj.string_type){
                case "obstacle":
                    if((obj as Obstacle).def.no_collision)break
                    if((obj as Obstacle).hitbox&&!(obj as Obstacle).dead){
                        const ov=this.hitbox.overlapCollision((obj as Obstacle).hitbox)
                        for(const o of ov){
                            this.position=v2.sub(this.position,v2.scale(o.dir,o.pen))
                        }
                    }
                    break
            }
        }
        this.position=this.game.map.clamp_hitbox(this.position,this.hitbox)
    }
    override interact(_user: Player): void {
    }
    create(args: {position:Vec2,def:CreatureDef}): void {
        this.hitbox=args.def.hitbox.transform(args.position)
        this.def=args.def
        this.update_func=this.def.server_side.update?CreaturesUpdates[this.def.server_side.update](this.def.server_side.update_parameters,this):undefined
        this.health=this.def.health
        if(this.def.lootTable){
            this.loot=this.game.loot_tables.get_loot(this.def.lootTable,{withammo:true})
        }
    }
    override encode(stream: NetStream, full: boolean): void {
        stream.writePos2(this.position)
        .writeRad(this.angle)
        .writeUint8(this.state)
        if(full){
            stream.writeBooleanGroup(this.dead)
            stream.writeUint16(this.def.idNumber!)
        }
    }
}