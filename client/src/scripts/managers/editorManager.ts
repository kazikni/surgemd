import { ColorM, HideElement, ShowElement, v2 } from "common/engine/client.ts";
import { type Game } from "../others/game.ts";
import { Layers } from "common/scripts/others/constants.ts";

export class EditorManager{
    game:Game
    constructor(game:Game){
        this.game=game
    }
    start(){
        HideElement(this.game.ui.content.game_gui)
        HideElement(this.game.ui.content.post_proccess.tiltshift)
        HideElement(this.game.ui.content.post_proccess.vignetting)

        this.game.cam2d.layer=Layers.Normal
        this.game.cam2d.position=v2(0,0)
        this.game.terrain.clear()
        this.game.terrain.draw(this.game.terrain_gfx,Layers.Normal)

        this.game.ui_gfx.ctx.fill_color=ColorM.hex("#fff8")
        this.game.ui_gfx.ctx.circle(v2.zero,0.25)
        this.game.ui_gfx.ctx.fill()
    }
    close(){
        ShowElement(this.game.ui.content.game_gui)
    }
}