import { GameObjectType, zIndexes } from "common/scripts/others/constants.ts"
import { MovingBody, MovingBodyPhysicalData } from "./moving_body.ts";
import { CreatureDef } from "common/scripts/definitions/objects/creatures.ts";
import { Container2D } from "common/engine/client.ts";
import { Stream } from "common/engine/core.ts";
export class Creature extends MovingBody {
    string_type: string = "creature"
    number_type: number = GameObjectType.Creature

    def!: CreatureDef

    physical_data:MovingBodyPhysicalData={
        rotation:0
    }

    container: Container2D = new Container2D()
    dead: boolean = true

    constructor() {
        super()
        this.container.zIndex = zIndexes.Creatures
        this.allow_tick=true
    }
    override on_create(_args: any): void {
        this.game.cam2d.add_object(this.container)
    }
    override on_layer_set(): void {
        this.container.layer=this.layer
    }
    override on_destroy(): void {
        this.container.destroy()
    }

    override on_tick(dt: number): void {
        if(!this.def)return
        super.on_tick(dt)

        this.def.update?.(this, dt, true)

        this.container.position = this.position
        this.container.rotation = this.physical_data.rotation
    }

    kill(){
        if (this.dead) return
        this.dead = true

        this.def.on_die?.(true)

        this.container.zIndex = zIndexes.DeadCreatures
    }
    set_definition(def: CreatureDef) {
        if(this.def) return
        this.def = def
        this.def.on_start?.(this, {}, true)
    }
    override on_decode_net(stream: Stream, full: boolean): void {
        const [physical_dirty,dead]=stream.read_boolean_group()
        if(physical_dirty||full){
            this.decode_physical_data(stream,full)
        }

        if (full) {
            const id=stream.read_uint16()
            this.set_definition(this.game.definitions.creatures.getFromNumber(id))
        }

        if(!dead&&this.dead){
            this.dead=false
        }else if(dead){
            this.kill()
        }

        if(this.def)this.def.decode?.(this, stream, full)
    }
}