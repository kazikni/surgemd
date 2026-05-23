/*import { CamA, Container2DObject } from "./base.ts";
import { WebglRenderer } from "../rendering/renderer.ts";
import { v2, Vec2 } from "../../core/math/vec2.ts";
import { ImageModel2D, model2d, Model2D } from "../../core/definition/models.ts";
import { Camera2D } from "./camera.ts"
import { ResourcesManager } from "../resources/resources.ts";
import { Matrix, matrix4 } from "../../core/math/matrix.ts";
import { Container2D } from "./container.ts";
export class SubCanvas2D extends Container2DObject {
    override object_type = "sub_canvas";

    private renderer!: WebglRenderer;
    private FBO!: WebGLFramebuffer;
    private Texture!: WebGLTexture;

    container:Container2D=new Container2D()

    downscale = 1.0
    width:number
    height:number
    add_child(c:Container2DObject){
        this.container.add_child(c)
    }

    size?:Vec2

    _zoom:number=1
    constructor(width:number,height:number){
        super()
        this.width=width
        this.height=height
    }
    size_matrix:Matrix=matrix4.identity()
    resize(){
        const scale=this.camera.meter_size*this._zoom

        const scaleX = this.width / (this.camera.meter_size*this._zoom)
        const scaleY = this.height / (this.camera.meter_size*this._zoom)

        this.size_matrix = matrix4.projection(v2(scaleX,scaleY),500)

        this.camera.size=v2(this.width/scale,this.height/scale)  
    }

    private initFramebuffer(w: number, h: number) {
        const gl = this.renderer.gl;
        this.resize()
        if (this.Texture) gl.deleteTexture(this.Texture);
        if (this.FBO) gl.deleteFramebuffer(this.FBO);

        this.Texture = gl.createTexture()!;
        gl.bindTexture(gl.TEXTURE_2D, this.Texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, Math.floor(w), Math.floor(h), 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        this.FBO = gl.createFramebuffer()!;
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.FBO);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.Texture, 0);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    private _lastW:number=0
    private _lastH:number=0

    camera:CamA={
        matrix:matrix4.identity(),
        meter_size:5,
        position:this.position,
        size:v2(5,5),
        center_pos:false,
        batcher:undefined
    }
    render(renderer: WebglRenderer, camera: Camera2D,objects?:Container2DObject[]) {
        this.renderer = renderer;
        const gl = renderer.gl;

        const w = Math.max(1, this.width*this.downscale);
        const h = Math.max(1, this.height*this.downscale);

        if (!this.FBO || !this.Texture || this._lastW !== w || this._lastH !== h) {
            this.initFramebuffer(w, h);
            this._lastW = w;
            this._lastH = h;
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.FBO);

        gl.viewport(0, 0, w, h);
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT)

        if(this.camera.center_pos){
            const halfViewSize = v2(this.camera.size.x / 2, this.camera.size.y / 2)
            const cameraPos = v2.sub(this.camera.position, halfViewSize)
            this.camera.matrix=matrix4.mult(this.size_matrix,matrix4.translation_2d(v2.neg(cameraPos)))
        }else{
            this.camera.matrix=matrix4.mult(this.size_matrix,matrix4.translation_2d(v2.neg(this.camera.position)))
        }
        this.container.draw(this.camera,renderer,objects)

        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
        this.updateScreenModel(v2(w,h), camera.meter_size)
        gl.viewport(0, 0, renderer.canvas.width, renderer.canvas.height)
    }

    screenModel:Model2D=model2d.rect()
    hotspot:Vec2=v2(0.5,0.5)
    override update(dt: number, resources: ResourcesManager): void {
        super.update(dt,resources)
        this.container.update(dt,resources)
    }
    private updateScreenModel(pixelSize: Vec2, meterSize: number) {
        this.screenModel={
            tex_coords:new Float32Array(DefaultTexCoords),
            vertices:ImageModel2D(this._real_scale,this._real_rotation,this.hotspot,this.size??pixelSize,meterSize)
        }
    }
    toBase64(resources:ResourcesManager):string{
        if (!this.Texture || !this.FBO) return "";
        const gl = this.renderer.gl;

        const w = Math.floor(this.width*this.downscale)
        const h = Math.floor(this.height*this.downscale)

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.FBO)

        const pixels = new Uint8Array(w * h * 4)
        gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels)

        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
        const canvas=resources.canvas
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d")!
        const imgData = ctx.createImageData(w, h)
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const srcIndex = ((h - y - 1) * w + x) * 4
                const dstIndex = (y * w + x) * 4
                imgData.data[dstIndex + 0] = pixels[srcIndex + 0]
                imgData.data[dstIndex + 1] = pixels[srcIndex + 1]
                imgData.data[dstIndex + 2] = pixels[srcIndex + 2]
                imgData.data[dstIndex + 3] = pixels[srcIndex + 3]
            }
        }

        ctx.putImageData(imgData, 0, 0);

        const dataURL = canvas.toDataURL("image/png")
        return dataURL
    }

    override draw(cam:CamA,renderer: WebglRenderer) {
        return new Promise<void>((resolve) => {
            this.draw_super()
            if (!this.Texture) {resolve();return;}
            const mat = renderer.factorys2D.texture.create({
                texture: this.Texture,
                tint: { r: 1, g: 1, b: 1, a: 1 }
            });
            
            renderer.draw(mat,cam.matrix,{
                model:this.screenModel,
                position:this._real_position,
                scale:v2(1,-1)
            })
            resolve()
        })
    }
}*/