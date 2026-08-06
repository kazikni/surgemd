import { model2d } from "../../core/definition/models.ts";
import { v2 } from "../../core/math/vec2.ts";
import { type WebglRenderer } from "../rendering/renderer.ts";
import { CamA, Container2D} from "./base.ts";

export class BloomContainer2D extends Container2D {
    override object_type = "bloom_container"

    intensity: number = 1.0
    threshold: number = 0.7
    blurPasses: number = 2
    downscale: number = 0.5

    private fbo!: WebGLFramebuffer
    private texture!: WebGLTexture
    private blurFBO!: WebGLFramebuffer
    private blurTexture!: WebGLTexture

    private initialized = false

    private initFBO(renderer: WebglRenderer) {
        const gl = renderer.gl

        const w = renderer.canvas.width * this.downscale
        const h = renderer.canvas.height * this.downscale

        this.texture = gl.createTexture()!
        gl.bindTexture(gl.TEXTURE_2D, this.texture)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)

        this.fbo = gl.createFramebuffer()!
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo)
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture, 0)

        gl.bindFramebuffer(gl.FRAMEBUFFER, null)

        this.initialized = true
    }

    override async draw(cam: CamA): Promise<void> {
        this.draw_super()

        const renderer = cam.renderer as WebglRenderer
        const gl = renderer.gl

        if (!this.initialized) {
            this.initFBO(renderer)
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo)
        gl.viewport(0, 0,
            renderer.canvas.width * this.downscale,
            renderer.canvas.height * this.downscale
        )
        gl.clearColor(0,0,0,0)
        gl.clear(gl.COLOR_BUFFER_BIT)

        for (const c of this.visible_children) {
            await c.draw(cam)
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, null)

        this.applyBlur(renderer)

        this.renderFinal(renderer, cam)
    }
    private renderFinal(renderer: WebglRenderer, cam: CamA) {
        const gl = renderer.gl

        gl.enable(gl.BLEND)
        gl.blendFunc(gl.ONE, gl.ONE)

        const mat = renderer.factorys2D.texture.create({
            texture: this.texture
        })

        const screenModel = model2d.rect(
            v2(0,0),
            v2(renderer.canvas.width, renderer.canvas.height)
        )

        renderer.draw(mat, cam.matrix, {
            model: screenModel
        })

        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    }   
}