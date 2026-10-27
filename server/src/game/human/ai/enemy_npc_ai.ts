import { GameItemType } from "common/scripts/definitions/utils.ts"
import { GunItem } from "../inventory.ts"
import { StatedBotAi } from "./simple_bot_ai.ts";
import { Angle, astar_path2d, random, v2, Vec2 } from "common/engine/core.ts";
import { type Human } from "../../objects/human.ts";
import { type Obstacle } from "../../objects/obstacle.ts";
import { Stream } from "common/engine/core/net/stream.ts";
import { ServerGameObject } from "../../others/gameObject.ts";
import { GameObjectType } from "common/scripts/others/constants.ts";
import { type StaticBody } from "../../objects/static_body.ts";
type EnemyState =
    | "idle"
    | "random_walking"
    | "engaged"
    | "go_last_seen"
    | "go_revive"
    | "knocked"

export class EnemyNPCAI extends StatedBotAi<EnemyState> {
    override net_update(general_update: Stream): void {

    }
    /* =======================
       INTERNAL STATE
    ======================= */
    state_duration=10
    detection_timer=0

    protected path: Vec2[] = []
    protected pathIndex = 0
    protected path_urgency:number=0

    protected seenHuman?: Human
    protected seenDownedAlly?:Human
    protected lastSeenPos?: Vec2

    protected allyPathTimer:number=0
    protected allyTarget?:Human

    protected playerCheckTimer = 0

    override params = {
        random_speed: 0.5,
        path_speed: 1,
        urgent_path_speed: 1,
        engaged_speed:1,

        shoot_angle_epsilon: 0.4,

        accuracy: random.float(0.8, 1.2),
        greed: random.float(0, 1),

        vision_distance:13,
        allow_distance:0.15,
        melee_distance:0.5,
        melee_attack_distance:0.85,
        shoot_distance:3,
        shoot_sound_distance:25,
        explosion_sound_distance:25, 

        advanced_movement:false,

        detection_time: 0.9,
        shoot_time: 0.2,

        revive_view_distance:6,
        pathfinding_quality:0.25,
        
        guard:0
    }
    constructor(human:Human) {
        super(human)
        /*
        =======================
           STATE REGISTRATION
        =======================
        */
        this.stateHandlers = {
            idle: this.state_idle.bind(this),
            random_walking: this.state_random_walking.bind(this),
            engaged: this.state_engaged.bind(this),
            go_last_seen: this.state_go_last_seen.bind(this),
            go_revive:this.state_go_revive.bind(this),
            knocked:this.state_knocked.bind(this),
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
                case GameObjectType.StaticBody:
                case GameObjectType.Walls:
                    if((o as StaticBody).physical_data.no_collision)break
                    return false
            }
        }
        return true
    }
    valid_knocked(self:Human,other:Human){
        return other.knocked&&!other.dead&&!other.being_helpup_by&&v2.distance(self.position,other.position)<=this.params.revive_view_distance
    }
    protected findRevivePartner(self:Human){
        let target:Human|undefined
        let distance=Infinity
        for(const p of self.game.humans.humans){
            if(p===self||p.dead||p.downed)continue
            if(!self.game.modeManager.is_ally(self,p))continue
            const d=v2.distance(self.position,p.position)
            if(d<distance){
                distance=d
                target=p
            }
        }
        return target
    }
    protected updateDetection(self: Human, dt: number):void{
        this.playerCheckTimer-=dt
        if(this.playerCheckTimer<=0){
            if(this.seenHuman){
                if (this.isPlayerVisible(self, this.seenHuman)) {
                    this.lastSeenPos=v2.clone(this.seenHuman.position)
                } else {
                    this.seenHuman=undefined
                }
            }else{
                for(const p of self.game.players.living_players){
                    if(!p.game.modeManager.is_ally(p,this.human)&&this.isPlayerVisible(self, p)) {
                        this.seenHuman=p
                        this.lastSeenPos=v2.clone(p.position)
                        this.detection_timer=0
                        break
                    }
                }
            }
            if(this.seenDownedAlly){
                if(this.valid_knocked(self,this.seenDownedAlly)){
                    this.seenDownedAlly=undefined
                }
            }else{
                for(const p of self.game.humans.humans){
                    if(p.game.modeManager.is_ally(self,p)&&this.valid_knocked(self,p)){
                        this.seenDownedAlly=p
                        break
                    }
                }
            }
            this.playerCheckTimer=0.5
        }
        if(this.seenHuman){
            this.detection_timer+=dt
        }
    }

    /*=======================
       STATES
    =======================*/
    protected state_idle(self: Human,begin:boolean, dt: number) {
        this.updateDetection(self, dt)
        if(this.seenHuman!==undefined){
            if(this.detection_timer>this.params.detection_time){
                this.setState("engaged")
                return
            }
        }else if(this.seenDownedAlly){
            this.setState("go_revive")
            return
        }

        this.movement.dir = 0
        this.movement.scale = 0

        this.move_speed=this.params.random_speed
        if(begin) {
            this.state_duration=random.float(2,3)
            this.path_urgency=0
        }else if(this.stateTime>this.state_duration){
            this.setState("random_walking")
        }
    }
    protected state_random_walking(self: Human,begin:boolean, dt: number) {
        this.updateDetection(self, dt)
        if(this.seenHuman!==undefined){
            if(this.detection_timer>this.params.detection_time){
                this.setState("engaged")
                return
            }
        }else if(this.seenDownedAlly){
            this.setState("go_revive")
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

    protected state_engaged(self: Human,begin:boolean, dt: number) {
        this.updateDetection(self, dt)
        if(!this.seenHuman){
            this.setState("go_last_seen")
            return
        }

        const dist = v2.distance(self.position, this.seenHuman.position);
        this.rot_target = v2.lookTo(self.position, this.seenHuman.position);

        const hand=self.inventory.hand_item

        const idealDist=hand?.item_type===GameItemType.melee?this.params.melee_distance:this.params.shoot_distance;

        this.move_speed=this.params.engaged_speed
        if(this.params.advanced_movement){
            if(dist>idealDist+this.params.allow_distance){
                this.movement={dir:this.rot_target,scale:1}
            }else if(dist<idealDist-this.params.allow_distance) {
                this.movement={dir:this.rot_target,scale:-1}
            }else{
                this.movement={dir:this.rot_target + Math.PI / 2,scale:1}
            }
        }else{
            if(dist>idealDist){
                this.movement={dir:this.rot_target,scale:1}
            }else{
                this.movement={dir:0,scale:0}
            }
        }

        if(hand?.item_type===GameItemType.melee){
            if(dist<=this.params.melee_attack_distance){
                self.input.using_item = true
                self.input.using_item_down = true
            }
        }else if(hand?.item_type===GameItemType.gun) {
            self.input.reload=((hand as GunItem).reloading ||!(hand as GunItem).has_ammo(self))
            if(!self.input.reload&&this.state_duration>=this.params.shoot_time&&this.stateTime>=this.params.shoot_time&&this.isAimAligned(self, this.seenHuman.position)){
                self.input.using_item = true
                self.input.using_item_down = true
            }
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
                    cellSize:this.params.pathfinding_quality,
                    dirs:[[1,0],[0,1],[-1,0],[0,-1],[1,1],[1,-1],[-1,-1],[-1,1]]
                }
            )
            this.pathIndex=0
            this.rot_speed=7
        }
        const target=this.path[this.pathIndex]
        if(target){
            const to=v2.sub(target, self.position)
            if (v2.len(to)<0.2){
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

    protected state_go_revive(self: Human,begin:boolean, dt: number) {
        this.updateDetection(self, dt)
        if(this.seenHuman!==undefined){
            if(this.detection_timer>this.params.detection_time){
                this.setState("engaged")
                return
            }
        }else if(!this.seenDownedAlly){
            this.setState("idle")
        }
        if(!this.seenDownedAlly)return

        const dist=v2.distance(this.seenDownedAlly.position,self.position)
        if(dist<=self.game.modeManager.rules.humans.help_up.distance){
            self.input.interaction=!self.actions.current_action
        }

        if(dist<=0.1){
            this.path.length=0
        }else{
            this.allyPathTimer-=dt
            if(begin||this.allyPathTimer<=0){
                this.path = astar_path2d(
                    self,
                    self.base_hitbox,
                    this.seenDownedAlly.position,
                    this.human.isBlockedForPath.bind(this),
                    {
                        cellSize:this.params.pathfinding_quality,
                        dirs:[[1,0],[0,1],[-1,0],[0,-1],[1,1],[1,-1],[-1,-1],[-1,1]]
                    }
                )
                this.pathIndex=0
                this.rot_speed=7
                this.allyPathTimer=2
            }
        }
        const target=this.path[this.pathIndex]
        if(target){
            const to=v2.sub(target, self.position)
            if (v2.len(to)<0.2){
                this.pathIndex++
                if(this.pathIndex>=this.path.length){
                    return
                }
            }
            this.movement={dir:Math.atan2(to.y,to.x),scale:1}
            this.move_speed=this.params.path_speed
            this.rot_target=Math.atan2(to.y,to.x)
        }else{
            this.movement={dir:0,scale:0}
        }
    }
    protected state_knocked(self:Human,begin:boolean,dt:number){
        if(!self.knocked){
            this.allyTarget=undefined
            this.path=[]
            this.setState("idle")
            return
        }
        this.lastSeenPos=undefined
        this.seenHuman=undefined

        let target=this.allyTarget
        this.allyPathTimer-=dt
        if(begin||!target||this.allyPathTimer<=0||target.dead||target.downed||target.knocked){
            this.allyPathTimer=4
            this.allyTarget=this.findRevivePartner(self)
            if(!this.allyTarget){
                this.movement={dir:0,scale:0}
                return
            }
            this.path=astar_path2d(
                self,
                self.base_hitbox,
                this.allyTarget.position,
                this.human.isBlockedForPath.bind(this.human),
                {cellSize:this.params.pathfinding_quality,dirs:[[1,0],[0,1],[-1,0],[0,-1],[1,1],[1,-1],[-1,-1],[-1,1]]}
            )
            this.pathIndex=0
            this.rot_speed=7
            target=this.allyTarget
        }

        const dist=v2.distance(self.position,target.position)
        if(dist<=2){
            this.movement={dir:0,scale:0}
            this.rot_target=v2.lookTo(self.position,target.position)
            return
        }

        const point=this.path[this.pathIndex]
        if(!point){
            return
        }

        const to=v2.sub(point,self.position)
        if(v2.len(to)<1.5){
            this.pathIndex++
            return
        }

        this.movement={dir:Math.atan2(to.y,to.x),scale:1}
        this.move_speed=this.params.urgent_path_speed
        this.rot_target=Math.atan2(to.y,to.x)
    }
    enemy_not_founded(){
        this.setState("idle")
    }
    override AI(dt: number): void {
        super.AI(dt)
        if(this.human.knocked){
            this.setState("knocked")
        }
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