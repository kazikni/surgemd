import { ClientScene2D, ClientSceneObject2D } from "common/engine/web.ts";
import { BaseGELO, SceneGELO } from "common/engine/core.ts";
import { type Application } from "./app.ts";
import { GameMap } from "../gelo/map.ts";

export class GameObject extends ClientSceneObject2D{
    declare app:Application
    declare scene:GameScene
}
export class GameGELO extends BaseGELO implements SceneGELO{
    declare app: Application
    declare scene: GameScene
}
export class GameScene extends ClientScene2D<GameObject,GameGELO> {
    declare app:Application
    map!:GameMap
}