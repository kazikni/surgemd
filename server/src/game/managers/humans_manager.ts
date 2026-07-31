import { Layers } from "common/scripts/others/constants.ts";
import { Human } from "../objects/human.ts";
import { type Game } from "../others/game.ts";
import { NPCScript, type BotAi } from "../human/ai/simple_bot_ai.ts";
import { DamageParams } from "../others/utils.ts";
import { HumanDefinition } from "common/scripts/definitions/utils.ts";
import { create_script } from "common/engine/core.ts";
export class NPC extends Human{
    ai?:BotAi
    script?:NPCScript
    override is_npc: boolean=true
    set_script(script:NPCScript){
        if(this.script)this.script.enabled=false
        script.human=this
        this.script=script
    }
    override on_tick(dt: number): void {
        if(this.script){
            if(!this.script._running){
                this.script._running=true
                this.script.run()
            }
            this.script.tick(dt)
        }
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
    override set_preset(preset:HumanDefinition|undefined):void{
        super.set_preset(preset)
        if(preset?.script){
            this.set_script(create_script(preset.script,this.game.globals)() as NPCScript)
        }
    }
}
export class HumansManager{
    game:Game
    humans:Human[]=[]

    living_npc:NPC[]=[]

    enemies:Record<string,HumanDefinition>={}
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

    create_enemy(def: HumanDefinition|string,npc?:NPC): NPC|undefined {
        if(typeof def === "string")def=this.enemies[def]
        if(!def)return undefined

        const bot = this.add_npc(npc)
        bot.set_preset(def)
        return bot
    }
}