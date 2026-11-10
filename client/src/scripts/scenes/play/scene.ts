import { HideElement, ShowElement } from "common/engine/web.ts";
import { gelo_instance_type, object_instance_type } from "common/scripts/others/constants.ts";
import { NormalMap } from "common/scripts/definitions/maps/normal.ts"
import { local_scene_defs } from "./localdefs.ts";
import { GameGELO, GameObject, GameScene } from "../../main/gel.ts";
import { c_mode, C_Mode } from "common/scripts/game/gelo/mode.ts";
import { SI_GameMap } from "common/scripts/game/gelo/map.ts";
import { CC_GameMap } from "../../gelo/map.ts";
import { cc_freecam } from "../../gelo/free_cam.ts";
import { CC_Human } from "../../objects/moving_body/human.ts";
import { SI_Human } from "common/scripts/game/objects/moving_body/human.ts";
import { LoadoutBodyDef, LoadoutEyesDef, LoadoutFootDef, LoadoutHairDef, LoadoutLegDef, LoadoutShirtDef } from "common/scripts/definitions/loadout/skins.ts";
import { DefaultFistRig } from "common/scripts/others/item.ts";

export interface PlaySceneDefs{
    objects:Record<number|string,(...args: any)=>GameObject>
    gelo:Record<number|string,(...args: any)=>GameGELO>
}

export class PlayScene extends GameScene {
    game_div:HTMLDivElement=document.querySelector("#game") as HTMLDivElement

    declare map:CC_GameMap

    defs:{
        objects:Record<number|string,(...args: any)=>GameObject>
        gelo:Record<number|string,(...args: any)=>GameGELO>
    }={
        objects:{},
        gelo:{}
    }

    override on_init(){
        super.on_init()

        this.map=this.make_gelo(gelo_instance_type.map) as CC_GameMap
        this.gelo.registry(this.map,"map")

        this.camera.aspect_lock=true
    }

    override make_object(type: number | string, ...args:any[]): GameObject | undefined {
        return this.defs.objects[type]?.(...args)
    }
    override make_gelo(type: number | string, ...args:any[]): GameGELO | undefined {
        return this.defs.gelo[type]?.(...args)
    }

    override on_set(): void {
        ShowElement(this.game_div)
    }
    override on_unset(): void {
        HideElement(this.game_div)
    }
}
export class LocalGameScene extends PlayScene{
    declare map:CC_GameMap&SI_GameMap
    declare mode:C_Mode&GameGELO
    constructor(){
        super()
        this.defs=local_scene_defs
    }

    override on_init(): void {
        super.on_init()

        this.mode=(new GameGELO()) as C_Mode&GameGELO
        this.mode.add_component(c_mode)
        this.gelo.registry(this.mode,"mode")

        this.map.generate(NormalMap)

        this.gelo.registry(this.make_gelo(gelo_instance_type.deadzone)!,"deadzone")

        const c=new GameGELO()
        c.add_component(cc_freecam)
        this.gelo.registry(c)

        /*const o=new () as CC_Humanoid_Visual
        o.add_component(c_humanoid_visual)
        o.add_component(cc_humanoid_visual)
        this.add_object(o,0)
        o.add_component(new ActiveObject())
        o.visual={
            body:{
                def:this.app.definitions.loadout.getFromStringSafe("body_1") as LoadoutBodyDef,
                tint:0xf0a93f
            },
            hair:{
                def:this.app.definitions.loadout.getFromString("hair_1") as LoadoutHairDef,
                tint:0x222222
            },
            eyes:this.app.definitions.loadout.getFromString("eyes_1") as LoadoutEyesDef,
            legs:this.app.definitions.loadout.getFromString("blue_jeans_pants") as LoadoutLegDef,
            shirt:this.app.definitions.loadout.getFromString("black_shirt") as LoadoutShirtDef,
            foot:this.app.definitions.loadout.getFromString("black_shoes") as LoadoutFootDef,
            accessorys:[]
        }
        o.update_visual()
        o.set_arms_rig(DefaultFistRig)*/

        this.join()
    }

    join(){
        const h=this.add_object(this.make_object(object_instance_type.human)!,0) as CC_Human&SI_Human
        h.visual={
            body:{
                def:this.app.definitions.loadout.getFromStringSafe("body_1") as LoadoutBodyDef,
                tint:0xf0a93f
            },
            hair:{
                def:this.app.definitions.loadout.getFromString("hair_1") as LoadoutHairDef,
                tint:0x222222
            },
            eyes:this.app.definitions.loadout.getFromString("eyes_1") as LoadoutEyesDef,
            legs:this.app.definitions.loadout.getFromString("blue_jeans_pants") as LoadoutLegDef,
            shirt:this.app.definitions.loadout.getFromString("black_shirt") as LoadoutShirtDef,
            foot:this.app.definitions.loadout.getFromString("black_shoes") as LoadoutFootDef,
            accessorys:[]
        }
        h.update_visual()
        h.set_arms_rig(DefaultFistRig)
    }

    override update(dt: number): void {
        super.update(dt,true,true)
    }
}