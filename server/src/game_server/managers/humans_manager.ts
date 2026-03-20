import { Layers } from "common/scripts/others/constants.ts";
import { Human } from "../objects/human.ts";
import { type Game } from "../others/game.ts";
import { type BotAi } from "../human/ai/simple_bot_ai.ts";
import { DamageParams } from "../others/utils.ts";
export class NPC extends Human{
    ai?:BotAi
    override update(dt: number): void {
        if(this.ai)this.ai.AI(dt)
        super.update(dt)
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
    constructor(game:Game){
        this.game=game
    }
    add_human(human:Human,id?:number,layer?:number){
        human.humans_manager=this

        const h=this.game.scene_2d.objects.add_object(human,layer??Layers.Normal,id) as Human

        this.humans.push(human)

        this.game.dirty.living_count=true
        this.game.modeManager.on_human_create(h)
        return h
    }
    add_npc(npc?:NPC,layer?:number):NPC{
        const ret=this.add_human(npc??new NPC(),undefined,layer) as NPC
        this.living_npc.push(ret)
        return ret
    }
    clear_npcs(){
        for(const n of this.living_npc){
            const idx=this.humans.indexOf(n)
            if(idx!==-1)this.humans.splice(idx)
            n.destroy()
        }
        this.living_npc.length=0
    }
}