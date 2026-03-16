import { UtilityAction, UtilityContext, UtilityStatedBotAi } from "./simple_bot_ai.ts";
import { ServerGameObject } from "../others/gameObject.ts";
import { GameItem } from "common/scripts/definitions/alldefs.ts";
import { InventoryItemType } from "common/scripts/definitions/utils.ts";
import { isBlockedForPath } from "./enemy_npc_ai.ts";
class LootAction implements UtilityAction<"loot"> {
    id = "loot" as const

    score(ctx: UtilityContext): number {
        const bot = ctx.player.ai as BattleRoyaleBot
        const loot = bot.pick_best_loot()
        return loot ? 0.6 : 0
    }

    enter(ctx: UtilityContext) {
        const bot = ctx.player.ai as BattleRoyaleBot
        bot.lootTarget = bot.pick_best_loot()
        if (bot.lootTarget) {
            bot.build_path_to(bot.lootTarget.position)
            bot.setState("loot")
        }
    }

    update(ctx: UtilityContext) {
        const bot = ctx.player.ai as BattleRoyaleBot
        if (!bot.lootTarget) return

        const done = bot.follow_path()
        if (done) {
            bot.lootTarget = undefined
            bot.setState("idle")
        }
    }

    exit(ctx: UtilityContext) {
        const bot = ctx.player.ai as BattleRoyaleBot
        bot.path.length = 0
    }
}

export class BattleRoyaleBot extends UtilityStatedBotAi<
    "idle" | "combat" | "loot" | "rotate",
    "shoot" | "push" | "retreat" | "loot"
> {
    camera_hitbox!:RectHitbox2D

    visibles: ServerGameObject[] = []

    protected path: Vec2[] = []
    protected pathIndex = 0
    protected pathCooldown = 0

    target?:ServerGameObject
    constructor(player: Player) {
        super(player)

        this.actions.set("loot", new LootAction())
        /*this.actions.set("shoot", new ShootAction())
        this.actions.set("push", new PushEnemyAction())
        this.actions.set("retreat", new RetreatAction())*/

        this.setState("idle")
        this.set_scope_zoom()

        this.pathfind(v2.random(50,250))
    }

    set_scope_zoom(view:number=0.78){
        const w=5*view
        this.camera_hitbox=new RectHitbox2D(v2.new(-w,-w),v2.new(w,w))
    }

    score_loot(loot:GameItem):number{
        switch(loot.item_type){
            case InventoryItemType.ammo:
                return 0.7
            default:
                return 0
        }
    }
    update_vision(){
        const cam=this.camera_hitbox.transform(this.player.position)
        this.visibles=this.player.manager.cells.get_objects(cam,this.player.layer)
    }
    follow_path(): boolean {
        const target = this.path[this.pathIndex]
        if (!target) return true

        const to = v2.sub(target, this.player.position)
        if (v2.length(to) < 0.4) {
            this.pathIndex++
            return this.pathIndex >= this.path.length
        }

        v2m.scale(this.player.input.movement, to, 1.0)
        this.rot_target = Math.atan2(to.y, to.x)
        this.rot_speed = 6

        return false
    }
    pathfind(to:Vec2){
        this.path = astar_path2d(
            this.player,
            this.player.base_hitbox,
            to,
            isBlockedForPath.bind(this)
        )
        this.pathIndex=0
    }

    override AI(dt: number): void {
        this.update_vision()

        const done = this.follow_path()
        if (done) {
            this.target = undefined
            this.setState("idle")
        }
        /*
        
        for(const o of this.visibles){
            switch(o.stringType){
                case "loot":
                    break
                case "obstacle":
                    break
            }
        }
        */
    }
}
