import { BotAi } from "./simple_bot_ai.ts";
import { type Human } from "../../objects/human.ts";
import { astar_path2d, Numeric, random, v2, Vec2 } from "common/engine/core.ts";
import { NetStream } from "common/engine/core/net/stream.ts";
import { InputActionType } from "common/scripts/packets/input_packet.ts";
import { type ServerGameObject } from "../../others/gameObject.ts";
import { GameObjectType } from "common/scripts/others/constants.ts";
import { type Obstacle } from "../../objects/obstacle.ts";
enum Intent {
    None,
    EscapeGas,
    Fight,
    Loot,
    Wander
}
type LootTarget = {
    pos: Vec2
    type: "ground" | "obstacle"
    obj: any
}
export class DumbBotAI extends BotAi {
    override params={
        deadzone:true,
        loot:true,
        fight:true,

        reaction_time:random.float(3,9)
    }
    _personality_offset = random.float(-0.1, 0.1)

    private _move_timer=0
    private _move_dir=0
    private _move_scale=0
    private _move_rotation=0

    private _dz_path?: Vec2[]
    private _dz_index = 0
    private _dz_target?: Vec2
    private _dz_urgency = 0
    private _dz_should_escape = false
    private _dz_path_cooldown=0

    private _loot_target?: LootTarget
    private _loot_timer:number=0

    _last_pos = v2.zero()
    _stuck_timer = 0
    constructor(human:Human){
        super(human)

        this.human.input.rotation=random.rad()
    }

    random_noob_dir(){
        if(Math.random() < 0.8){
            return random.choose([
                0,
                Math.PI/2,
                Math.PI,
                Math.PI*1.5
            ])
        }else{
            return Math.round(random.rad() / (Math.PI/4)) * (Math.PI/4)
        }
    }
    update_stuck(dt:number){
        const dist = v2.distance(this.human.position, this._last_pos)
        if(dist < 0.1){
            this._stuck_timer += dt
        }else{
            this._stuck_timer = 0
        }
        this._last_pos = v2.clone(this.human.position)
    }
    get_deadzone_urgency(){
        const self = this.human
        const dz = self.game.deadzone
        const dist = v2.distance(self.position, dz.state.position)
        const radius = dz.state.radius
        const edgeDist = dist - radius
        const t = Numeric.clamp(edgeDist / 10, -1, 1)

        if(edgeDist > 0){
            return Numeric.clamp(0.6 + t, 0, 1)
        }

        return Numeric.clamp(0.3 + t, 0, 0.6)
    }
    do_deadzone(dt:number){
        const self = this.human
        const dz = self.game.deadzone
        this.update_stuck(dt)
        const center = dz.state.position
        if(!this._dz_target || Math.random() < 0.01){
            const dist = random.float(3, 10)
            this._dz_target = v2.add(
                center,
                v2.from_RadAngle(random.rad(), dist)
            )
        }
        if(this._stuck_timer < 0.6){
            const dir = v2.lookTo(self.position, this._dz_target)

            this.human.input.movement = {
                dir: Math.random() < 0.2 ? this.random_noob_dir() : dir,
                scale: 1
            }

            return
        }
        if(!this._dz_path && this._dz_path_cooldown <= 0){
            this._dz_path = astar_path2d(
                self,
                self.base_hitbox,
                this._dz_target,
                self.isBlockedForPath.bind(self),
                { cellSize: 0.6 }
            )
            this._dz_index = 0
            this._dz_path_cooldown = 5
        }
        this._dz_path_cooldown -= dt

        const node = this._dz_path?.[this._dz_index]

        if(!node){
            this._dz_path = undefined
            this._stuck_timer = 0
            return
        }

        const to = v2.sub(node, self.position)

        if(v2.len(to) < 0.5){
            this._dz_index++
            return
        }

        this.human.input.movement = {
            dir: Math.atan2(to.y,to.x),
            scale:1
        }
    }
    update_deadzone_urgency(dt:number){
        const target = this.get_deadzone_urgency()

        this._dz_urgency = Numeric.lerp(
            this._dz_urgency,
            target,
            Numeric.dt_expo_inter(2, dt)
        )
    }
    update_escape_state(){
        if(this._dz_should_escape){
            if(this._dz_urgency+this._personality_offset<0.3){
                this._dz_should_escape = false
            }
        }else{
            if(this._dz_urgency+this._personality_offset>0.5){
                this._dz_should_escape = true
            }
        }
    }
    do_wander(dt:number){
        const self = this.human
        const dz = self.game.deadzone
        if(this._move_timer > 0){
            this._move_timer -= dt

            this.human.input.rotation = Numeric.lerp_rad(
                this.human.input.rotation,
                this._move_rotation,
                Numeric.dt_expo_inter(random.float(1,10),dt)
            )

            this.human.input.movement.dir = this._move_dir
            this.human.input.movement.scale = this._move_scale
            return
        }
        this._move_timer = random.float(1,5)
        let dir = this.random_noob_dir()
        if(this.params.deadzone){
            const center = dz.state.position
            const testPos = v2.add(
                self.position,
                v2.from_RadAngle(dir, 3)
            )
            const distNow = v2.distance(self.position, center)
            const distNext = v2.distance(testPos, center)
            if(distNext > distNow){
                if(Math.random() < 0.7){
                    dir = v2.lookTo(self.position, center)
                    dir += random.float(-0.5,0.5)
                }
            }
        }
        this._move_dir = dir
        this._move_scale = Math.random() <= 0.3 ? 0 : 1
        if(this._move_scale === 0){
            this._move_timer *= random.float(1,3)
        }
        if(Math.random() < 0.2){
            this._move_rotation = random.rad()
        }
    }
    do_loot(dt:number){
        const self = this.human
        const target = this._loot_target
        if(!target) return
        this._loot_timer -= dt
        if(this._loot_timer <= 0){
            this._loot_target = undefined
            return
        }
        const dir = v2.lookTo(self.position, target.pos)
        self.input.movement = {
            dir: Math.random() < 0.2 ? this.random_noob_dir() : dir,
            scale: 1
        }
        const dist = v2.distance(self.position, target.pos)
        if(target.type === "ground"){
            if(dist < 1.2){
                this.human.input.interaction=true
                if(Math.random() < 0.3){
                    this._loot_target = undefined
                }
            }
        }
        if(target.type === "obstacle"){
            if(dist < 2){
                if(self.inventory.weapon_idx !== 0 && Math.random() < 0.3){
                    self.input.actions.push({
                        type: InputActionType.set_hand,
                        hand: 0
                    })
                }
                if(Math.random() < 0.5){
                    self.input.using_item = true
                    self.input.using_item_down = true
                }
                if(Math.random() < 0.3){
                    self.input.rotation = dir
                }
                if(Math.random() < 0.01){
                    this._loot_target = undefined
                }
            }
        }
    }
    update_loot_target(){
        if(!this.params.loot) return
        if(Math.random() > 0.02) return
        const self = this.human
        const nearby:ServerGameObject[] = this.human.manager.cells.get_objects(
            self.hitbox,
            self.layer
        )
        let best:any = undefined
        let bestScore = Infinity

        for(const obj of nearby){
            if(obj.layer!==this.human.layer)continue
            if(obj.number_type===GameObjectType.Loot){
                const d = v2.distance(self.position, obj.position)
                if(d < bestScore){
                    best = {
                        pos: obj.position,
                        type: "ground",
                        obj
                    }
                    bestScore = d
                }
            }
            if(obj.number_type===GameObjectType.Obstacle){
                if((obj as Obstacle).loot&&(obj as Obstacle).loot.length > 0&&!(obj as Obstacle).health_data.dead){
                    const d = v2.distance(self.position, obj.position)
                    if(d < bestScore){
                        best = {
                            pos: obj.position,
                            type: "obstacle",
                            obj
                        }
                        bestScore = d
                    }
                }
            }
        }
        if(best){
            this._loot_target = best
            this._loot_timer = random.float(2,6)
        }
    }
    update_target(){
        if(Math.random() < 0.02){
            const players = this.human.game.humans.humans
            for(let i=0;i<5;i++){
                const target = random.choose(players)
                if(target&&target.id!==this.human.id&&!this.human.game.modeManager.is_ally(this.human,target)||v2.distance(this.human.position,target.position)<=this.human.scope_zoom){
                    this.target=target
                    break
                }
            }
        }
    }
    choose_intent(dt:number){
        this.update_deadzone_urgency(dt)
        this.update_escape_state()

        if(this.params.deadzone && this._dz_should_escape){
            return Intent.EscapeGas
        }
        /*if(this.params.fight && this.target && this._reaction_ok()){
            return Intent.Fight
        }*/
        if(this.params.loot && this._loot_target && this._loot_timer > 0){
            return Intent.Loot
        }
        if(Math.random() < this._dz_urgency * 0.3){
            return Intent.EscapeGas
        }

        return Intent.Wander
    }
    AI(dt:number){
        this.reset_inputs()
        this.update_target()
        this.update_loot_target()
        const intent = this.choose_intent(dt)

        switch(intent){
            case Intent.EscapeGas:
                this.do_deadzone(dt)
                break
            /*case Intent.Fight:
                //this.do_fight()
                break*/
            case Intent.Loot:
                this.do_loot(dt)
                break
            default:
                this.do_wander(dt)
        }
    }
    override net_update(_general_update: NetStream): void {

    }
}