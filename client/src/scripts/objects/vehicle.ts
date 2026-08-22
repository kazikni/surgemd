import { VehicleDef, WheelDef } from "common/scripts/definitions/objects/vehicles.ts"
import { Container2D, Sprite2D } from "common/engine/web.ts"
import { GameObjectType, zIndexes } from "common/scripts/others/constants.ts"
import { MovingBody, MovingBodyPhysicalData } from "./moving_body.ts"
import { FloorKind, Floors, FloorType } from "common/scripts/others/terrain.ts";
import { ClientDecal } from "./client_decal.ts";
import { Numeric, RectHitbox2D, Stream, v2, v2m } from "common/engine/core.ts";
export class Vehicle extends MovingBody {
    string_type = "vehicle"
    number_type = GameObjectType.Vehicle

    def?: VehicleDef

    container = new Container2D()
    main_sprite = new Sprite2D()
    wheels: {def:WheelDef,sprite:Sprite2D}[] = []
    movable_wheels: Sprite2D[] = []

    distance_since_last_mark:number=0
    tire_stress:number=0

    physical_data:MovingBodyPhysicalData&{direction:number,speed:number} = {
        rotation: 0,
        direction: 0,
        speed: 0,
    }

    override on_create() {
        this.game.cam2d.add_object(this.container)
        this.container.add_child(this.main_sprite)
    }
    override on_layer_set(): void {
        this.main_sprite.layer=this.layer
    }

    set_def(def: VehicleDef) {
        if (this.def) return
        this.def = def

        this.base_hitbox = new RectHitbox2D(v2(-1,-1), v2(1,1))

        this.main_sprite.frame = this.game.resources.get_frame(def.frame.base??def.idString)
        this.main_sprite.zIndex = 2
        this.main_sprite.hotspot=v2.half_one
        this.main_sprite.transform_frame(def.frame.base_transform??{})

        for (let i = 0; i < def.wheels.defs.length; i++) {
            const w = def.wheels.defs[i]
            const spr = new Sprite2D()
            spr.frame = this.game.resources.get_frame("wheel")
            spr.position = v2.clone(w.position)
            spr.scale = v2(w.scale, w.scale)
            spr.zIndex = 1
            spr.hotspot = v2(0.5, 0.5)

            this.wheels.push({
                def:def.wheels.defs[i],
                sprite:spr
            })
            if (w.movable) this.movable_wheels.push(spr)

            this.container.add_child(spr)
        }

        this.container.zIndex = def.frame.zindex ?? zIndexes.Vehicles
        this.container.layer=this.layer
    }

    override on_tick(dt: number) {
        super.on_tick(dt)
        const moving = Math.abs(this.physical_data.speed) > 0.1

        const maxSteer = 35 * (Math.PI / 180)

        let steer = this.physical_data.direction
        if (steer > Math.PI) steer -= Math.PI * 2

        steer = Numeric.clamp(steer, -maxSteer, maxSteer)

        const targetRot = moving ? steer : 0

        for (const w of this.movable_wheels) {
            w.rotation = Numeric.lerp_rad(w.rotation,targetRot,1 / (1 + dt * 12))
        }
        
        this.distance_since_last_mark+=this.distance_walked
        if(this.distance_since_last_mark>=(this.def?.wheels.stress_distance??0.2)){
            this.distance_since_last_mark=0
            if(this.tire_stress > 0){
                for(let i = 0; i < this.wheels.length; i++){
                    const wheel = this.wheels[i]
                    if(!wheel.def.marks) continue
                    const stress_resistance=(wheel.def.marks.stress_resistance??1.5)
                    if(stress_resistance>=this.tire_stress)continue

                    const localPos = v2.clone(wheel.def.position)
                    v2m.rotate_RadAngle(localPos,this.container.rotation)

                    const worldPos = v2.add(this.position,localPos)

                    const floor = Floors[this.game.terrain.get_floor_type(worldPos,this.layer,FloorType.Void) as FloorType]
                    if(floor.floor_kind === FloorKind.Liquid)continue

                    const d = new ClientDecal()
                    d.lifetime = 14
                    d.sprite.set_frame({
                        image:wheel.def.marks.frame??"tire_mark",
                        position:worldPos,
                        rotation:this.container.rotation,
                        alpha:Numeric.clamp((this.tire_stress-stress_resistance)*0.2,30,255),
                        scale:wheel.def.scale,
                    },this.game.resources)
                    d.sprite.transform_frame(wheel.def.marks.frame_transform??{})
                    this.game.scene_2d.objects.add_object(d,this.layer)
                }
            }
        }

        this.container.position = this.position
        this.container.rotation = this.physical_data.rotation
    }
    override on_destroy() {
        this.container.destroy()
    }
    override on_decode_net(stream: Stream, full: boolean) {
        const [physical_data_dirty,dead]=stream.read_boolean_group()
        if(physical_data_dirty||full)this.decode_physical_data(stream, full)

        this.physical_data.speed=stream.read_float32()
        this.physical_data.direction=stream.read_rad()
        this.tire_stress=stream.read_float32()

        if (full) {
            const defId = stream.read_uint8()
            this.set_def(this.game.definitions.vehicles.getFromNumber(defId))
        }
    }
}