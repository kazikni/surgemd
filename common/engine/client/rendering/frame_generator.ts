import { Vec2, v2 } from "../../core/math/vec2.ts"
import { Camera2D } from "../2d/camera.ts"
import { Container2D } from "../2d/container.ts"
import { Frame, ResourcesManager } from "../resources/resources.ts"
import { RenderTexture } from "./renderer.ts";

export class FrameGenerator {
    camera: Camera2D
    container: Container2D
    generated = new Set<RenderTexture>()
    constructor(public resources: ResourcesManager){
        this.camera = new Camera2D(resources.renderer)
        this.container = this.camera.container
    }
    clear_scene(){
        this.container.children.length = 0
    }
    free_all(){
        for(const rt of this.generated){
            rt.free(this.resources.gl)
        }

        this.generated.clear()
    }
    generate(size: Vec2 = v2(128,128)): Frame {
        const renderer = this.resources.renderer
        const rt = renderer.create_render_texture(size.x,size.y)
        this.generated.add(rt)
        renderer.begin_render_texture(rt)
        renderer.clear()
        this.camera.draw(0,this.resources)
        renderer.end_render_texture()
        const frame = this.resources.create_frame_from_texture(rt.texture,size)
        frame.render_texture = rt
        frame.own_texture = false
        return frame
    }
}