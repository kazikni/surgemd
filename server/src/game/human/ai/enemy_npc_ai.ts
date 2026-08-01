import { Building } from "../../objects/building.ts"
import { GameItemType } from "common/scripts/definitions/utils.ts"
import { GunItem } from "../inventory.ts"
import { StatedBotAi } from "./simple_bot_ai.ts";
import { Angle, astar_path2d, random, v2, Vec2 } from "common/engine/core.ts";
import { type Human } from "../../objects/human.ts";
import { type Obstacle } from "../../objects/obstacle.ts";
import { InputActionType } from "common/scripts/packets/input_packet.ts";
import { Stream } from "common/engine/core/net/stream.ts";
import { ServerGameObject } from "../../others/gameObject.ts";
import { GameObjectType } from "common/scripts/others/constants.ts";
type EnemyState =
    | "idle"
    | "walking"
    | "detecting"
    | "engaged"
    | "go_last_seen"

export class EnemyNPCAI extends StatedBotAi<EnemyState> {
    override net_update(general_update: Stream): void {

    }
    /* =======================
       INTERNAL STATE
    ======================= */
    state_duration=10

    protected path: Vec2[] = []
    protected pathIndex = 0
    protected path_urgency:number=0

    protected seenHuman?: Human
    protected lastSeenPos?: Vec2

    protected playerCheckTimer = 0

    override params = {
        random_speed: 0.2,
        path_speed: 0.7,
        urgent_path_speed: 1,
        engaged_speed:0.25,

        shoot_angle_epsilon: 0.4,

        bravery: random.float(0, 1),
        accuracy: random.float(0.8, 1.2),
        greed: random.float(0, 1),

        vision_distance:13,    // 8 = Easy, 13 = Normal, 17 = Hard
        shoot_distance:25,     // 15 = Easy, 20 = Normal, 25 = Hard
        explosion_distance:25, // 20 = Easy, 25 = Normal, 30 = Hard

        detection_time: 0.5, // Easy = 1, Normal = 0.5, Hard = 0.25
    }
    pathfinding_quality:number=0.5
    constructor(human:Human) {
        super(human)
        /*
        =======================
           STATE REGISTRATION
        =======================
        */
        this.stateHandlers = {
            idle: this.state_idle.bind(this),
            walking: this.state_walking.bind(this),
            detecting: this.state_detecting.bind(this),
            engaged: this.state_engaged.bind(this),
            go_last_seen: this.state_go_last_seen.bind(this),
        }
        this.setState("idle")
    }
    /*
    =======================
       HELPERS
    =======================
    */
    protected isAimAligned(self: Human, target: Vec2): boolean {
        const desired = Math.atan2(
            target.y - self.position.y,
            target.x - self.position.x
        )
        return Math.abs(
            Angle.delta_rad(self.physical_data.rotation, desired)
        ) <= this.params.shoot_angle_epsilon
    }
    protected isPlayerVisible(self: Human, other: Human): boolean {
        const dist=v2.distance(self.position, other.position)
        if(other.dead || !other.is_player) return false
        if(dist>this.params.vision_distance) return false

        //const angleToPlayer = v2.lookTo(self.position, other.position)
        //const diff = Math.abs(Angle.delta_rad(self.physical_data.rotation, angleToPlayer))
        //if (diff > Math.PI / 1.8) return false

        const ray:ServerGameObject[] = self.manager.cells.ray(
            self.position,
            other.position,
            self.layer,
        )
        for (const o of ray) {
            if(o === other)continue
            switch(o.number_type){
                case GameObjectType.Obstacle:{
                    const obs = o as Obstacle
                    const h = obs.def.height ?? 0

                    if (h===0)return false// High Wall
                    if (h===1){
                        if(dist>this.params.vision_distance*0.1)return false // Medium Wall
                    }
                    if (h===2)break// Small Wall
                    break
                }
                case GameObjectType.Building:
                    if((o as Building).def.no_collisions)break
                    return false
            }
        }
        return true
    }

    protected updateDetection(self: Human, dt: number) {
        this.playerCheckTimer += dt
        if (this.playerCheckTimer >= 0.5) {
            if (!this.seenHuman) {
                for (const p of self.game.humans.humans) {
                    if (!p.game.modeManager.is_ally(p,this.human)&&this.isPlayerVisible(self, p)) {
                        this.seenHuman = p
                        this.lastSeenPos = v2.clone(p.position)
                        break
                    }
                }
                return
            }
            if (this.isPlayerVisible(self, this.seenHuman)) {
                this.lastSeenPos = v2.clone(this.seenHuman.position)
            } else {
                this.seenHuman = undefined
            }
            this.playerCheckTimer = 0
        }
    }

    /*=======================
       STATES
    =======================*/
    protected state_idle(self: Human,begin:boolean, dt: number) {
        this.updateDetection(self, dt)
        if (this.seenHuman) {
            this.setState("detecting")
            return
        }

        this.movement.dir = 0
        this.movement.scale = 0

        this.move_speed=this.params.random_speed
        if(begin) {
            this.state_duration=random.float(2,3)
            this.path_urgency=0
        }else if(this.stateTime>this.state_duration){
            this.setState("walking")
        }
    }
    protected state_walking(self: Human,begin:boolean, dt: number) {
        this.updateDetection(self, dt)
        if(this.seenHuman) {
            this.setState("detecting")
            return
        }
        if(begin){
            const rot=random.rad()
            this.rot_target=rot
            this.rot_speed=12
            this.state_duration=random.float(2,3)
            this.path_urgency=0
        }else if(this.stateTime>this.state_duration){
            this.setState("idle")
        }
        this.movement = {dir:this.rot_target,scale:1}
        this.move_speed=this.params.random_speed
    }
    protected state_detecting(self: Human,begin:boolean, dt: number) {
        if (!this.seenHuman) {
            this.setState("walking")
            return
        }
        this.rot_speed=1
        if (this.stateTime >= this.params.detection_time) {
            this.setState("engaged")
        }
    }
    protected state_engaged(self: Human,begin:boolean, dt: number) {
        this.updateDetection(self, dt);
        if (!this.seenHuman) {
            this.setState("go_last_seen");
            return;
        }

        const dist = v2.distance(self.position, this.seenHuman.position);
        this.rot_target = v2.lookTo(self.position, this.seenHuman.position);

        const idealDist = this.params.bravery > 0.5 ? 4 : 8;

        this.move_speed=this.params.engaged_speed
        if (dist > idealDist + 1) {
            this.movement={dir:this.rot_target,scale:1}
        } else if (dist < idealDist - 1) {
            this.movement={dir:this.rot_target,scale:-1}
        } else {
            this.movement={dir:this.rot_target + Math.PI / 2,scale:1}
        }

        self.input.reload =
            self.inventory.hand_item?.item_type === GameItemType.gun &&
            (
                (self.inventory.hand_item as GunItem).reloading ||
                !(self.inventory.hand_item as GunItem).has_ammo(self)
            )
        if (
            !self.input.reload &&
            this.isAimAligned(self, this.seenHuman.position)
        ) {
            self.input.using_item = true
            self.input.using_item_down = 1
        }
    }
    protected state_go_last_seen(self: Human,begin:boolean, dt: number) {
        if(!this.lastSeenPos){
            this.setState("idle")
            return
        }
        this.updateDetection(self, dt)
        if (this.seenHuman) {
            this.setState("engaged")
            return
        }
        if(begin){
            this.path = astar_path2d(
                self,
                self.base_hitbox,
                this.lastSeenPos,
                this.human.isBlockedForPath.bind(this),
                {
                    cellSize:this.pathfinding_quality
                }
            )
            this.pathIndex=0
            this.rot_speed=7
        }
        const target=this.path[this.pathIndex]
        if(target){
            const to = v2.sub(target, self.position)
            if (v2.len(to) < 0.4) {
                this.pathIndex++
                if(this.pathIndex>=this.path.length){
                    this.enemy_not_founded()
                    return
                }
            }
            this.movement={dir:Math.atan2(to.y,to.x),scale:1}
            //this.move_speed=this.path_urgency>=0.7?this.params.urgent_path_speed:this.params.path_speed
            this.move_speed=this.params.urgent_path_speed
            this.rot_target=Math.atan2(to.y,to.x)
        }else{
            this.enemy_not_founded()
        }
    }
    enemy_not_founded(){
        this.human.input.actions.push({type:InputActionType.emote_emote,emote:this.human.game.definitions.emotes.getFromString("emote_neutral").idNumber!})
        this.setState("idle")
    }
    /* =======================
       PATH BLOCK
    ======================= */
    /*override on_sound(origin: Vec2, sound_type: string,owner?:Human): void {
        if(!owner?.is_player||this.lastSeenPos||this.seenHuman)return
        const dist = v2.distance(this.human.position, origin)
        if (
            (sound_type === "shot" && dist <= this.params.shoot_distance) ||
            (sound_type === "explosion" && dist <= this.params.explosion_distance)
        ) {
            this.lastSeenPos = v2.clone(origin)
            this.path.length = 0
            this.path_urgency+=dist/this.params.explosion_distance
            this.setState("go_last_seen")
        }
    }
    override on_hitted(params:DamageParams): void {
        if(this.seenHuman||this.lastSeenPos||!params.owner)return
        this.rot_target=v2.lookTo(params.owner.position,params.position)
        this.setState("detecting")
    }*/
}