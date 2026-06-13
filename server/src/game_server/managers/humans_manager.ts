import { Layers } from "common/scripts/others/constants.ts";
import { Human } from "../objects/human.ts";
import { type Game } from "../others/game.ts";
import { type BotAi } from "../human/ai/simple_bot_ai.ts";
import { DamageParams } from "../others/utils.ts";
import { type EnemyDef } from "common/scripts/config/level_definition.ts";
import { ADVHumanAI } from "../human/ai/adv_human_ai.ts";
import { EnemyNPCAI } from "../human/ai/enemy_npc_ai.ts";
import { cloneDeep } from "common/engine/core.ts";
export class NPC extends Human{
    ai?:BotAi
    override is_npc: boolean=true
    override on_tick(dt: number): void {
        if(this.ai)this.ai.AI(dt)
        super.on_tick(dt)
    }
    override die(params: DamageParams): void {
        const idx=this.game.humans.living_npc.indexOf(this)
        if(idx!==-1){
            this.game.humans.living_npc.splice(idx,1)
        }
        super.die(params)
    }
}
export class HumansManager{
    game:Game
    humans:Human[]=[]

    living_npc:NPC[]=[]

    enemies:Record<string,EnemyDef>={}
    constructor(game:Game){
        this.game=game
    }
    add_human(human:Human,id?:number,layer?:number){
        human.humans_manager=this

        const h=this.game.scene_2d.objects.add_object(human,layer??Layers.Normal,id) as Human
        return this._add_human(h)
    }
    _add_human(human:Human){
        this.humans.push(human)
        this.game.modeManager.on_human_create(human)
        return human
    }
    add_npc(npc?:NPC,layer?:number):NPC{
        const ret=this.add_human(npc??new NPC(),undefined,layer) as NPC
        this.living_npc.push(ret)
        return ret
    }
    clear_npcs(){
        for(const n of this.living_npc){
            const idx=this.humans.indexOf(n)
            if(idx!==-1)this.humans.splice(idx,1)
            n.destroy()
        }
        this.living_npc.length=0
    }

    create_enemy(def: EnemyDef|string,npc?:NPC): NPC|undefined {
        if(typeof def === "string")def=this.enemies[def]
        if(!def)return undefined

        const bot = this.add_npc(npc)
        switch(def.ia?.kind){
            case "advanced":
                bot.ai = new ADVHumanAI(bot)
                break
            default:
                bot.ai = new EnemyNPCAI(bot)
        }

        if(def.ia?.params){
            bot.ai.params = cloneDeep(def.ia.params)
        }

        bot.set_preset(def)

        return bot
    }
}