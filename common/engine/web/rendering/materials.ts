import { Matrix } from "../../core/math/matrix.ts";
import { Model2D, Model3D } from "../../core/definition/models.ts";
import { Color } from "../../core/math/color.ts";
import { Vec2 } from "../../core/math/vec2.ts";
import { Vec3 } from "../../core/math/vec3.ts";
import { GLDynamicBuffer, GLMaterial, GLMaterialFactory, GLMaterialFactoryCall, type WebglRenderer } from "./renderer.ts";
export type GL2D_SimpleBatchArgs = {
}
export type GL2D_SimpleBatchAttr = {
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
    gl_Position = u_Matrix * vec4(a_Position,0.0,1.0);
    v_Color = a_Color;
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
    
    const vBuffer  = new GLDynamicBuffer(gl.gl)

    const draw = (mat: GLMaterial<GL2D_SimpleBatchArgs,GL2D_SimpleBatchAttr>,matrix: Matrix,attr:GL2D_SimpleBatchAttr) => {
        gl.set_program(fac.program)
        gl.gl.uniformMatrix4fv(uMat, false, matrix)

        vBuffer.upload_u8(gl.gl.ARRAY_BUFFER, attr.data)

        gl.gl.enableVertexAttribArray(aPosition)
        gl.gl.enableVertexAttribArray(aColor)

        gl.gl.vertexAttribPointer(aPosition, 2, gl.gl.FLOAT, false, 12, 0) // F4, F4
        gl.gl.vertexAttribPointer(aColor, 4, gl.gl.UNSIGNED_BYTE, true, 12, 8) //U1,U1,U1,U1

        gl.gl.drawArrays(gl.gl.TRIANGLES, 0, attr.data_count)
    }

    return (arg: GL2D_SimpleBatchArgs) => ({
        ...arg,
        factory: fac,
        group: "simple_batch",
        draw,
        free:()=>{
            vBuffer.free
        }
    })
}
}
export type GL2D_SimpleMatArgs={
    color:Color
}
export type GL2D_SimpleMatAttr={
    model:Model2D
    position:Vec2
    scale:Vec2
}
export const GLF_Simple:GLMaterialFactoryCall<GL2D_SimpleMatArgs,GL2D_SimpleMatAttr>={
    vertex:`
attribute vec2 a_Position;
uniform mat4 u_ProjectionMatrix;
uniform vec2 u_Translation;
uniform vec2 u_Scale;
void main() {
    gl_Position = u_ProjectionMatrix * vec4((a_Position*u_Scale)+u_Translation, 0.0, 1.0);
}`,
    frag:`
#ifdef GL_ES
precision mediump float;
#endif

uniform vec4 u_Color;

void main() {
    gl_FragColor = u_Color;
}`,
create(gl:WebglRenderer,fac:GLMaterialFactory<GL2D_SimpleMatArgs,GL2D_SimpleMatAttr>){
    const aPositionLoc=gl.gl.getAttribLocation(fac.program, "a_Position")
    const uColorLoc=gl.gl.getUniformLocation(fac.program, "u_Color")!
    const uTranslationLoc=gl.gl.getUniformLocation(fac.program, "u_Translation")!
    const uScaleLoc=gl.gl.getUniformLocation(fac.program, "u_Scale")!
    const uProjectionMatrixLoc=gl.gl.getUniformLocation(fac.program, "u_ProjectionMatrix")!

    const vertexBuffer = gl.gl.createBuffer();
    const draw=(mat:GLMaterial<GL2D_SimpleMatArgs,GL2D_SimpleMatAttr>,matrix:Matrix,attr:GL2D_SimpleMatAttr)=>{
        gl.set_program(fac.program)

        gl.gl.bindBuffer(gl.gl.ARRAY_BUFFER, vertexBuffer)
        gl.gl.bufferData(gl.gl.ARRAY_BUFFER, attr.model.vertices, gl.gl.STATIC_DRAW)

        gl.gl.enableVertexAttribArray(aPositionLoc)
        gl.gl.vertexAttribPointer(aPositionLoc, 2, gl.gl.FLOAT, false, 0, 0)

        gl.gl.uniform4f(uColorLoc, mat.color.r, mat.color.g, mat.color.b, mat.color.a)
        gl.gl.uniform2f(uTranslationLoc, attr.position.x, attr.position.y)
        gl.gl.uniform2f(uScaleLoc, attr.scale.x, attr.scale.y)
        gl.gl.uniformMatrix4fv(uProjectionMatrixLoc, false, matrix)
        gl.gl.drawArrays(gl.gl.TRIANGLES, 0, attr.model.vertices.length / 2)
    }
    return (arg:GL2D_SimpleMatArgs)=>{
        return {
            ...arg,
            group:"",
            factory:fac,
            draw:draw,
            free:()=>{
                gl.gl.deleteBuffer(vertexBuffer)
            }
        }
    }
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
export type GL2D_TexMatArgs={
    texture:WebGLTexture
    tint:Color
}
export type GL2D_TexMatAttr={
    model:Model2D
    position:Vec2
    scale:Vec2
}
export const GLF_Texture:GLMaterialFactoryCall<GL2D_TexMatArgs,GL2D_TexMatAttr>={
    vertex:`
attribute vec2 a_Position;
attribute vec2 a_TexCoord;
    
uniform mat4 u_ProjectionMatrix;
uniform vec2 u_Translation;
uniform vec2 u_Scale;

varying highp vec2 vTextureCoord;

void main(void) {
    gl_Position = u_ProjectionMatrix*vec4((a_Position*u_Scale)+u_Translation,0.0,1.0);
    vTextureCoord = a_TexCoord;
}`,
    frag:`
precision mediump float;

varying highp vec2 vTextureCoord;
uniform sampler2D u_Texture;
uniform vec4 u_Tint;

void main(void) {
    vec2 flippedCoord = vec2(vTextureCoord.x, 1.0 - vTextureCoord.y);
    gl_FragColor = texture2D(u_Texture, flippedCoord)*u_Tint;
}`,
create(glr: WebglRenderer, fac: GLMaterialFactory<GL2D_TexMatArgs,GL2D_TexMatAttr>) {
    const gl = glr.gl
    const aPositionLoc = gl.getAttribLocation(fac.program, "a_Position")
    const aTexCoordLoc = gl.getAttribLocation(fac.program, "a_TexCoord")
    const uTintLoc = gl.getUniformLocation(fac.program, "u_Tint")!
    const uTranslationLoc = gl.getUniformLocation(fac.program, "u_Translation")!
    const uScaleLoc = gl.getUniformLocation(fac.program, "u_Scale")!
    const uProjectionMatrixLoc = gl.getUniformLocation(fac.program, "u_ProjectionMatrix")!
    const uTextureLoc = gl.getUniformLocation(fac.program, "u_Texture")!

    const vertexBuffer = gl.createBuffer()!
    const textureCoordBuffer = gl.createBuffer()!

    const draw = (mat: GLMaterial<GL2D_TexMatArgs,GL2D_TexMatAttr>, matrix: Matrix, attr:GL2D_TexMatAttr) => {
        glr.set_program(fac.program)

        // Vertex buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
        gl.bufferData(gl.ARRAY_BUFFER, attr.model.vertices, gl.STATIC_DRAW)
        gl.enableVertexAttribArray(aPositionLoc)
        gl.vertexAttribPointer(aPositionLoc, 2, gl.FLOAT, false, 0, 0)

        // TexCoord buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer)
        gl.bufferData(gl.ARRAY_BUFFER, attr.model.tex_coords, gl.STATIC_DRAW)
        gl.enableVertexAttribArray(aTexCoordLoc)
        gl.vertexAttribPointer(aTexCoordLoc, 2, gl.FLOAT, false, 0, 0)

        // Texture
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, mat.texture)
        gl.uniform1i(uTextureLoc, 0)

        // Uniforms
        gl.uniform4f(uTintLoc, mat.tint.r, mat.tint.g, mat.tint.b, mat.tint.a)
        gl.uniform2f(uTranslationLoc, attr.position.x, attr.position.y)
        gl.uniform2f(uScaleLoc, attr.scale.x, attr.scale.y)
        gl.uniformMatrix4fv(uProjectionMatrixLoc, false, matrix)

        // Draw
        gl.drawArrays(gl.TRIANGLES, 0, attr.model.vertices.length / 2)
    }

    return (arg: GL2D_TexMatArgs) => ({
        ...arg,
        factory: fac,
        group:"",
        draw,
        free:()=>{
            gl.deleteBuffer(vertexBuffer)
            gl.deleteBuffer(textureCoordBuffer)
        }
    })
}
}
export type GL2D_TexBatchArgs = {
    texture: WebGLTexture
}
export type GL2D_TexBatchAttr = {
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
    gl_Position = u_Matrix * vec4(a_Position, 0.0, 1.0);
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

        const vBuffer  = new GLDynamicBuffer(gl)

        const draw = (
            mat: GLMaterial<GL2D_TexBatchArgs, GL2D_TexBatchAttr>,
            matrix: Matrix,
            attr: GL2D_TexBatchAttr
        ) => {
            const count = attr.data_count
            if (count === 0) return

            glr.set_program(fac.program)
            gl.uniformMatrix4fv(uMat, false, matrix)

            vBuffer.upload_u8(gl.ARRAY_BUFFER, attr.data)
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
            factory: fac,
            group: "texture_batch",
            draw,
            free() {
                vBuffer.free()
            }
        })
    }
}