import { Matrix, matrix2, matrix4 } from "../../core/math/matrix.ts";
import { Model3D } from "../../core/definition/models.ts";
import { Color } from "../../core/math/color.ts";
import { Vec3 } from "../../core/math/vec3.ts";
import { GLDynamicBuffer, GLMaterial, GLMaterialFactory, GLMaterialFactoryCall, type WebglRenderer } from "./renderer.ts";
export type GL2D_SimpleBatchArgs = {
}
export type GL2D_SimpleBatchAttr = {
    buffer:GLDynamicBuffer
    data:Uint8Array
    data_count:number
}
export const GLF_SimpleBatch: GLMaterialFactoryCall<GL2D_SimpleBatchArgs,GL2D_SimpleBatchAttr> = {
    vertex: `
attribute vec2 a_Position;
attribute vec4 a_Color;

uniform mat4 u_Matrix;

varying vec4 v_Color;

void main() {
    gl_Position=u_Matrix*vec4(a_Position,0.0,1.0);
    v_Color=a_Color;
}`,
    frag: `
precision mediump float;

varying vec4 v_Color;

void main() {
    gl_FragColor = v_Color;
}`,
create(gl: WebglRenderer, fac: GLMaterialFactory<GL2D_SimpleBatchArgs,GL2D_SimpleBatchAttr>) {
    const aPosition = gl.gl.getAttribLocation(fac.program, "a_Position")
    const aColor = gl.gl.getAttribLocation(fac.program, "a_Color")!
    const uMat = gl.gl.getUniformLocation(fac.program, "u_Matrix")!

    //const buffer=new GLDynamicBuffer(gl.gl)
    const draw = (mat: GLMaterial<GL2D_SimpleBatchArgs,GL2D_SimpleBatchAttr>,matrix: Matrix,attr:GL2D_SimpleBatchAttr) => {
        gl.set_program(fac.program)
        gl.gl.uniformMatrix4fv(uMat, false, matrix)

        attr.buffer.bind()

        gl.gl.enableVertexAttribArray(aPosition)
        gl.gl.enableVertexAttribArray(aColor)

        gl.gl.vertexAttribPointer(aPosition, 2, gl.gl.FLOAT, false, 12, 0) // F4, F4
        gl.gl.vertexAttribPointer(aColor, 4, gl.gl.UNSIGNED_BYTE, true, 12, 8) //U1,U1,U1,U1

        gl.gl.drawArrays(gl.gl.TRIANGLES, 0, attr.data_count)
    }

    return (arg: GL2D_SimpleBatchArgs) => ({
        ...arg,
        renderer:gl,
        factory: fac,
        group: "simple_batch",
        draw,
        free:()=>{
            //buffer.free()
        },
    })
}
}
export type GL3D_SimpleMatArgs={
    color:Color
}
export type GL3D_SimpleMatAttr={
    model:Model3D
    position:Vec3
    scale:Vec3
}
export const GLF_Simple3:GLMaterialFactoryCall<GL3D_SimpleMatArgs,GL3D_SimpleMatAttr>={
    vertex:`
attribute vec3 a_Position;
uniform mat4 u_ProjectionMatrix;
uniform vec3 u_Translation;
uniform vec3 u_Scale;
void main() {
    gl_Position = u_ProjectionMatrix * vec4((a_Position*u_Scale)+u_Translation, 1.0);
}`,
    frag:`
#ifdef GL_ES
precision mediump float;
#endif

uniform vec4 u_Color;

void main() {
    gl_FragColor = u_Color;
}`,
create(gl:WebglRenderer,fac:GLMaterialFactory<GL3D_SimpleMatArgs,GL3D_SimpleMatAttr>){
    const aPositionLoc=gl.gl.getAttribLocation(fac.program, "a_Position")
    const uColorLoc=gl.gl.getUniformLocation(fac.program, "u_Color")!
    const uTranslationLoc=gl.gl.getUniformLocation(fac.program, "u_Translation")!
    const uScaleLoc=gl.gl.getUniformLocation(fac.program, "u_Scale")!
    const uProjectionMatrixLoc=gl.gl.getUniformLocation(fac.program, "u_ProjectionMatrix")!

    const vertexBuffer = gl.gl.createBuffer();
    const indexBuffer = gl.gl.createBuffer();
    const draw=(mat:GLMaterial<GL3D_SimpleMatArgs,GL3D_SimpleMatAttr>,matrix:Matrix,attr:GL3D_SimpleMatAttr)=>{
        gl.set_program(fac.program)

        gl.gl.bindBuffer(gl.gl.ARRAY_BUFFER, vertexBuffer);
        gl.gl.bufferData(gl.gl.ARRAY_BUFFER, new Float32Array(attr.model._vertices), gl.gl.STATIC_DRAW)

        gl.gl.bindBuffer(gl.gl.ELEMENT_ARRAY_BUFFER, indexBuffer)
        gl.gl.bufferData(gl.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(attr.model._indices), gl.gl.STATIC_DRAW)

        gl.gl.enableVertexAttribArray(aPositionLoc)
        gl.gl.vertexAttribPointer(aPositionLoc, 3, gl.gl.FLOAT, false, 0, 0)

        gl.gl.uniform4f(uColorLoc, mat.color.r, mat.color.g, mat.color.b, mat.color.a)
        gl.gl.uniform3f(uTranslationLoc, attr.position.x, attr.position.y, attr.position.z)
        gl.gl.uniform3f(uScaleLoc, attr.scale.x, attr.scale.y, attr.scale.z)
        gl.gl.uniformMatrix4fv(uProjectionMatrixLoc, false, matrix)

        gl.gl.drawElements(gl.gl.TRIANGLES, attr.model._indices.length, gl.gl.UNSIGNED_SHORT, 0)
    }
    return (arg:GL3D_SimpleMatArgs)=>{
        return {
            ...arg,
            renderer:gl,
            factory:fac,
            group:"",
            draw:draw,
            free:()=>{
                gl.gl.deleteBuffer(indexBuffer)
                gl.gl.deleteBuffer(vertexBuffer)
            }
        }
    }
}
}
export type GL2D_TexBatchArgs = {
    texture: WebGLTexture
}
export type GL2D_TexBatchAttr = {
    buffer:GLDynamicBuffer
    data:Uint8Array
    data_count:number
}
export const GLF_TextureBatch: GLMaterialFactoryCall<
    GL2D_TexBatchArgs,
    GL2D_TexBatchAttr
> = {
    vertex: `
attribute vec2 a_Position;
attribute vec2 a_TexCoord;
attribute vec4 a_Tint;

uniform mat4 u_Matrix;

varying highp vec2 v_TexCoord;
varying lowp vec4 v_Tint;

void main() {
    gl_Position = u_Matrix*vec4(a_Position, 0.0, 1.0);
    v_TexCoord = a_TexCoord;
    v_Tint = a_Tint;
}`,

    frag: `
precision mediump float;

varying highp vec2 v_TexCoord;
varying lowp vec4 v_Tint;

uniform sampler2D u_Texture;

void main() {
    vec2 uv = vec2(v_TexCoord.x, 1.0 - v_TexCoord.y);
    gl_FragColor = texture2D(u_Texture, uv) * v_Tint;
}`,

    create(glr: WebglRenderer, fac) {
        const gl = glr.gl

        const aPos  = gl.getAttribLocation(fac.program, "a_Position")
        const aUV   = gl.getAttribLocation(fac.program, "a_TexCoord")
        const aTint = gl.getAttribLocation(fac.program, "a_Tint")

        const uMat = gl.getUniformLocation(fac.program, "u_Matrix")!
        const uTex  = gl.getUniformLocation(fac.program, "u_Texture")!

        const draw = (
            mat: GLMaterial<GL2D_TexBatchArgs, GL2D_TexBatchAttr>,
            matrix: Matrix,
            attr: GL2D_TexBatchAttr
        ) => {
            const count = attr.data_count
            if (count === 0) return

            glr.set_program(fac.program)
            gl.uniformMatrix4fv(uMat, false, matrix)

            attr.buffer.bind()
            gl.enableVertexAttribArray(aPos)
            gl.enableVertexAttribArray(aUV)
            gl.enableVertexAttribArray(aTint)
            gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 16, 0)
            gl.vertexAttribPointer(aUV, 2, gl.UNSIGNED_SHORT, true, 16, 8)
            gl.vertexAttribPointer(aTint, 4, gl.UNSIGNED_BYTE, true, 16, 12)

            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, mat.texture)
            gl.uniform1i(uTex, 0)

            gl.drawArrays(gl.TRIANGLES, 0, count)
        }

        return (arg: GL2D_TexBatchArgs) => ({
            ...arg,
            renderer:glr,
            factory: fac,
            group: "texture_batch",
            draw,
            free() {
            }
        })
    }
}
export type GL2D_CosmicStar={
    quantity?:number
    scale?:number
    size?:number
    brightness?:number
    color?:Color
    move_scale?:number
}

export type GL2D_CosmicBatchArgs={
    time?:number
    speed?:number
    seed?:number
    scale?:number
    drift_x?:number
    drift_y?:number

    nebula_scale?:number
    nebula_strength?:number
    nebula_detail?:number
    nebula_warp?:number
    nebula_warp_strength?:number

    stars?:GL2D_CosmicStar[]

    color1?:Color
    color2?:Color
    color3?:Color
    color4?:Color
}
export type GL2D_CosmicBatchAttr={
    buffer:GLDynamicBuffer
    data:Uint8Array
    data_count:number
}

export const GLF_CosmicBatch:GLMaterialFactoryCall<GL2D_CosmicBatchArgs,GL2D_CosmicBatchAttr>={
vertex:`
attribute vec2 a_Position;
attribute vec4 a_Color;

uniform mat4 u_Matrix;

varying vec4 v_Color;

void main(){
    gl_Position=u_Matrix*vec4(a_Position,0.0,1.0);
    v_Color=a_Color;
}
`,
frag:`
precision mediump float;

varying vec4 v_Color;

uniform vec2 u_Resolution;
uniform float u_Time;
uniform float u_Scale;
uniform float u_Speed;
uniform float u_Seed;
uniform vec2 u_Drift;

uniform float u_NebulaScale;
uniform float u_NebulaStrength;
uniform float u_NebulaDetail;
uniform float u_NebulaWarp;
uniform float u_NebulaWarpStrength;

uniform float u_StarQuantity[8];
uniform float u_StarScale[8];
uniform float u_StarSize[8];
uniform float u_StarBrightness[8];
uniform float u_StarMove[8];
uniform vec3 u_StarColor[8];

uniform vec3 u_Color1;
uniform vec3 u_Color2;
uniform vec3 u_Color3;
uniform vec3 u_Color4;

float hash(vec2 p){
    return fract(sin(dot(p,vec2(127.1,311.7))+u_Seed)*43758.5453123);
}

float noise(vec2 p){
    vec2 i=floor(p);
    vec2 f=fract(p);

    f=f*f*(3.0-2.0*f);

    float a=hash(i);
    float b=hash(i+vec2(1.0,0.0));
    float c=hash(i+vec2(0.0,1.0));
    float d=hash(i+vec2(1.0,1.0));

    return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);
}

float fbm(vec2 p){
    float value=0.0;
    float amplitude=0.5;

    for(int i=0;i<8;i++){
        if(float(i)>=u_NebulaDetail)break;

        value+=noise(p)*amplitude;
        p*=2.0;
        amplitude*=0.5;
    }

    return value;
}

vec3 stars_layer(
    vec2 uv,
    float quantity,
    float scale,
    float size,
    float brightness,
    float move_scale,
    vec3 color
){
    if(quantity<=0.0)return vec3(0.0);

    vec2 p=uv*scale;
    p+=-u_Drift*(u_Time*u_Speed*move_scale);

    vec2 cell=floor(p);
    vec2 local=fract(p);

    vec3 result=vec3(0.0);

    for(int x=-1;x<=1;x++){
        for(int y=-1;y<=1;y++){
            vec2 offset=vec2(float(x),float(y));
            vec2 c=cell+offset;

            float h=hash(c);

            if(h>quantity)continue;

            vec2 star=vec2(
                hash(c+vec2(17.1,31.7)),
                hash(c+vec2(71.3,11.9))
            );

            vec2 d=local-(offset+star);
            float dist=length(d);

            float core=1.0-smoothstep(0.0,size,dist);
            float glow=exp(-dist*dist/(size*size*8.0));

            result+=color*(core+glow*0.35)*brightness;
        }
    }

    return result;
}

void main(){
    vec2 uv=gl_FragCoord.xy/u_Resolution;

    uv-=0.5;
    uv.x*=u_Resolution.x/u_Resolution.y;
    uv*=u_Scale;

    float t=u_Time*u_Speed;
    vec2 drift=u_Drift*t;
    vec2 p=uv+drift;

    vec2 warp=vec2(
        fbm(p*u_NebulaWarp+vec2(t*0.08,-t*0.05)),
        fbm(p*u_NebulaWarp+vec2(-t*0.06,t*0.09))
    );

    p+=(warp-0.5)*u_NebulaWarpStrength;

    float nebula1=fbm(p*u_NebulaScale);

    float nebula2=fbm(
        p*u_NebulaScale*2.3+vec2(8.2,3.7)
    );

    float nebula3=fbm(
        p*u_NebulaScale*0.45-vec2(4.0,7.0)
    );

    vec3 color=v_Color.rgb;

    color+=u_Color2*nebula1*u_NebulaStrength;
    color+=u_Color3*nebula2*u_NebulaStrength*0.65;
    color+=u_Color4*nebula3*u_NebulaStrength*0.35;

    for(int i=0;i<8;i++){
        color+=stars_layer(
            uv,
            u_StarQuantity[i],
            u_StarScale[i],
            u_StarSize[i],
            u_StarBrightness[i],
            u_StarMove[i],
            u_StarColor[i]
        );
    }

    color+=u_Color1*0.05;

    gl_FragColor=vec4(color,v_Color.a);
}
`,
    create(glr:WebglRenderer,fac:GLMaterialFactory<GL2D_CosmicBatchArgs,GL2D_CosmicBatchAttr>){
        const gl=glr.gl

        const aPosition=gl.getAttribLocation(fac.program,"a_Position")
        const aColor=gl.getAttribLocation(fac.program,"a_Color")

        const uMat=gl.getUniformLocation(fac.program,"u_Matrix")!
        const uResolution=gl.getUniformLocation(fac.program,"u_Resolution")!
        const uTime=gl.getUniformLocation(fac.program,"u_Time")!
        const uScale=gl.getUniformLocation(fac.program,"u_Scale")!
        const uSpeed=gl.getUniformLocation(fac.program,"u_Speed")!
        const uSeed=gl.getUniformLocation(fac.program,"u_Seed")!
        const uDrift=gl.getUniformLocation(fac.program,"u_Drift")!

        const uNebulaScale=gl.getUniformLocation(fac.program,"u_NebulaScale")!
        const uNebulaStrength=gl.getUniformLocation(fac.program,"u_NebulaStrength")!
        const uNebulaDetail=gl.getUniformLocation(fac.program,"u_NebulaDetail")!
        const uNebulaWarp=gl.getUniformLocation(fac.program,"u_NebulaWarp")!
        const uNebulaWarpStrength=gl.getUniformLocation(fac.program,"u_NebulaWarpStrength")!

        const uStarQuantity=gl.getUniformLocation(fac.program,"u_StarQuantity[0]")!
        const uStarScale=gl.getUniformLocation(fac.program,"u_StarScale[0]")!
        const uStarSize=gl.getUniformLocation(fac.program,"u_StarSize[0]")!
        const uStarBrightness=gl.getUniformLocation(fac.program,"u_StarBrightness[0]")!
        const uStarMove=gl.getUniformLocation(fac.program,"u_StarMove[0]")!
        const uStarColor=gl.getUniformLocation(fac.program,"u_StarColor[0]")!

        const uColor1=gl.getUniformLocation(fac.program,"u_Color1")!
        const uColor2=gl.getUniformLocation(fac.program,"u_Color2")!
        const uColor3=gl.getUniformLocation(fac.program,"u_Color3")!
        const uColor4=gl.getUniformLocation(fac.program,"u_Color4")!

        const draw=(mat:GLMaterial<GL2D_CosmicBatchArgs,GL2D_CosmicBatchAttr>,matrix:Matrix,attr:GL2D_CosmicBatchAttr)=>{
            if(attr.data_count===0)return

            glr.set_program(fac.program)

            gl.uniformMatrix4fv(uMat,false,matrix)
            gl.uniform2f(uResolution,glr.canvas.width,glr.canvas.height)
            gl.uniform1f(uTime,mat.time??performance.now()/1000)

            attr.buffer.bind()

            gl.enableVertexAttribArray(aPosition)
            gl.enableVertexAttribArray(aColor)

            gl.vertexAttribPointer(aPosition,2,gl.FLOAT,false,12,0)
            gl.vertexAttribPointer(aColor,4,gl.UNSIGNED_BYTE,true,12,8)

            gl.drawArrays(gl.TRIANGLES,0,attr.data_count)
        }

        return(arg:GL2D_CosmicBatchArgs)=>({
            ...arg,
            renderer:glr,
            factory:fac,
            group:"cosmic",
            draw,
            initialize: (mat:GLMaterial<GL2D_CosmicBatchArgs,GL2D_CosmicBatchAttr>)=>{
                glr.set_program(fac.program)

                gl.uniform1f(uScale,mat.scale??1)
                gl.uniform1f(uSpeed,mat.speed??0.15)
                gl.uniform1f(uSeed,mat.seed??0)

                gl.uniform2f(
                    uDrift,
                    mat.drift_x??0,
                    mat.drift_y??0
                )

                gl.uniform1f(uNebulaScale,mat.nebula_scale??3)
                gl.uniform1f(uNebulaStrength,mat.nebula_strength??0.5)
                gl.uniform1f(uNebulaDetail,mat.nebula_detail??5)
                gl.uniform1f(uNebulaWarp,mat.nebula_warp??2)
                gl.uniform1f(uNebulaWarpStrength,mat.nebula_warp_strength??0.5)

                const quantity=new Float32Array(8)
                const scale=new Float32Array(8)
                const size=new Float32Array(8)
                const brightness=new Float32Array(8)
                const move=new Float32Array(8)
                const colors=new Float32Array(24)

                const stars=mat.stars??[]

                for(let i=0;i<8;i++){
                    const star=stars[i]

                    quantity[i]=star?.quantity??0
                    scale[i]=star?.scale??1
                    size[i]=star?.size??0.01
                    brightness[i]=star?.brightness??1
                    move[i]=star?.move_scale??1

                    const color=star?.color??{r:255,g:255,b:255,a:255}

                    colors[i*3]=color.r/255
                    colors[i*3+1]=color.g/255
                    colors[i*3+2]=color.b/255
                }

                gl.uniform1fv(uStarQuantity,quantity)
                gl.uniform1fv(uStarScale,scale)
                gl.uniform1fv(uStarSize,size)
                gl.uniform1fv(uStarBrightness,brightness)
                gl.uniform1fv(uStarMove,move)
                gl.uniform3fv(uStarColor,colors)

                const c1=mat.color1??{r:0,g:0,b:10,a:255}
                const c2=mat.color2??{r:30,g:0,b:80,a:255}
                const c3=mat.color3??{r:0,g:60,b:100,a:255}
                const c4=mat.color4??{r:100,g:10,b:150,a:255}

                gl.uniform3f(uColor1,c1.r/255,c1.g/255,c1.b/255)
                gl.uniform3f(uColor2,c2.r/255,c2.g/255,c2.b/255)
                gl.uniform3f(uColor3,c3.r/255,c3.g/255,c3.b/255)
                gl.uniform3f(uColor4,c4.r/255,c4.g/255,c4.b/255)
            },
            free(){}
        })
    }
}