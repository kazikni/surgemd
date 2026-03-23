import { VehicleDef } from "common/scripts/definitions/objects/vehicles.ts"
import { Container2D, NetStream, Numeric, RectHitbox2D, Sprite2D, v2 } from "common/engine/client.ts"
import { GameObjectType, zIndexes } from "common/scripts/others/constants.ts"
import { MovingBody, MovingBodyPhysicalData } from "./moving_body.ts"
export class Vehicle extends MovingBody {
    string_type = "vehicle"
    number_type = GameObjectType.Vehicle

    def?: VehicleDef

    container = new Container2D()
    main_sprite = new Sprite2D()
    wheels: Sprite2D[] = []
    movable_wheels: Sprite2D[] = []

    physical_data:MovingBodyPhysicalData&{direction:number,speed:number} = {
        rotation: 0,
        direction: 0,
        speed: 0,
    }

    override on_layer_set(layer:number){
        this.container.layer=layer
    }

    create() {
        this.game.cam2d.addObject(this.container)
        this.container.add_child(this.main_sprite)
    }

    set_def(def: VehicleDef) {
        if (this.def) return
        this.def = def

        this.base_hitbox = new RectHitbox2D(v2.new(-1,-1), v2.new(1,1))

        this.main_sprite.zIndex = 2
        this.main_sprite.frame = this.game.resources.get_sprite(
            def.frame.base ?? def.idString
        )

        if (def.frame.base_scale) {
            this.main_sprite.hotspot=v2.new(0.5,0.5)
            this.main_sprite.scale = v2.new(def.frame.base_scale, def.frame.base_scale)
        }

        for (let i = 0; i < def.wheels.defs.length; i++) {
            const w = def.wheels.defs[i]
            const spr = new Sprite2D()
            spr.frame = this.game.resources.get_sprite("wheel")
            spr.position = v2.clone(w.position)
            spr.scale = v2.new(w.scale, w.scale)
            spr.zIndex = 1
            spr.hotspot = v2.new(0.5, 0.5)

            this.wheels.push(spr)
            if (w.movable) this.movable_wheels.push(spr)

            this.container.add_child(spr)
        }

        this.container.zIndex = def.frame.zindex ?? zIndexes.Vehicles
        this.container.layer=this.layer
        this.container.update_zindex()
    }

    override update(dt: number) {
        super.update(dt)
        const moving = Math.abs(this.physical_data.speed) > 0.1

        const maxSteer = 35 * (Math.PI / 180)

        let steer = this.physical_data.direction
        if (steer > Math.PI) steer -= Math.PI * 2

        steer = Numeric.clamp(steer, -maxSteer, maxSteer)

        const targetRot = moving ? steer : 0

        for (const w of this.movable_wheels) {
            w.rotation = Numeric.lerp_rad(
                w.rotation,
                targetRot,
                1 / (1 + dt * 12)
            )
        }

        this.container.position = this.position
        this.container.rotation = this.physical_data.rotation
    }

    override on_destroy() {
        this.container.destroy()
    }

    override decode(stream: NetStream, full: boolean) {
        const [physical_data_dirty,dead]=stream.readBooleanGroup()
        if(physical_data_dirty||full)this.decode_physical_data(stream, full)

        this.physical_data.speed=stream.readFloat32()
        this.physical_data.direction=stream.readRad()

        if (full) {
            const defId = stream.readUint8()
            this.set_def(this.game.definitions.vehicles.getFromNumber(defId))
        }
    }
}