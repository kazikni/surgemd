import { Layers } from "common/scripts/others/constants.ts";
import { Human } from "../objects/human.ts";
import { type Game } from "../others/game.ts";
import { type BotAi } from "../human/ai/simple_bot_ai.ts";
import { DamageParams } from "../others/utils.ts";
import { CheckpointContext, DefaultObjectEvents, Stream } from "common/engine/core.ts";
export class NPC extends Human{
    ai?:BotAi
    override is_npc: boolean=true
    override on_tick(dt: number): void {
        if(this.ai)this.ai.update(dt)
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

    encode_human(human:Human,stream:Stream,ctx:CheckpointContext){
        stream.write_uint8(human.layer)
        human.on_encode_checkpoint(stream,ctx)
        human.emit_event(DefaultObjectEvents.checkpoint_encode,stream,ctx)
    }
    decode_human(human:Human,stream:Stream,ctx:CheckpointContext){
        const layer=stream.read_uint8()
        human.manager.set_layer(human,layer)
        human.on_decode_checkpoint(stream,{coid:{},idco:{}})
        human.emit_event(DefaultObjectEvents.checkpoint_decode,stream,ctx)
    }
}