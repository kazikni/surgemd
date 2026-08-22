import { type RadAngle } from "./geometry.ts";
import { type Vec2 } from "./vec2.ts";
import { type Vec3 } from "./vec3.ts";

export type Matrix=Float32Array
export const matrix4={
    default:{
        identity:new Float32Array([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0 , 0, 0, 1
        ])
    },
    m:{
        mul(dst:Matrix,a:Matrix, b:Matrix){
            const a00 = a[0 * 4 + 0]
            const a01 = a[0 * 4 + 1]
            const a02 = a[0 * 4 + 2]
            const a03 = a[0 * 4 + 3]
            const a10 = a[1 * 4 + 0]
            const a11 = a[1 * 4 + 1]
            const a12 = a[1 * 4 + 2]
            const a13 = a[1 * 4 + 3]
            const a20 = a[2 * 4 + 0]
            const a21 = a[2 * 4 + 1]
            const a22 = a[2 * 4 + 2]
            const a23 = a[2 * 4 + 3]
            const a30 = a[3 * 4 + 0]
            const a31 = a[3 * 4 + 1]
            const a32 = a[3 * 4 + 2]
            const a33 = a[3 * 4 + 3]
            const b00 = b[0 * 4 + 0]
            const b01 = b[0 * 4 + 1]
            const b02 = b[0 * 4 + 2]
            const b03 = b[0 * 4 + 3]
            const b10 = b[1 * 4 + 0]
            const b11 = b[1 * 4 + 1]
            const b12 = b[1 * 4 + 2]
            const b13 = b[1 * 4 + 3]
            const b20 = b[2 * 4 + 0]
            const b21 = b[2 * 4 + 1]
            const b22 = b[2 * 4 + 2]
            const b23 = b[2 * 4 + 3]
            const b30 = b[3 * 4 + 0]
            const b31 = b[3 * 4 + 1]
            const b32 = b[3 * 4 + 2]
            const b33 = b[3 * 4 + 3]

            dst[0]=b00 * a00 + b01 * a10 + b02 * a20 + b03 * a30
            dst[1]=b00 * a01 + b01 * a11 + b02 * a21 + b03 * a31
            dst[2]=b00 * a02 + b01 * a12 + b02 * a22 + b03 * a32
            dst[3]=b00 * a03 + b01 * a13 + b02 * a23 + b03 * a33
            dst[4]=b10 * a00 + b11 * a10 + b12 * a20 + b13 * a30
            dst[5]=b10 * a01 + b11 * a11 + b12 * a21 + b13 * a31
            dst[6]=b10 * a02 + b11 * a12 + b12 * a22 + b13 * a32
            dst[7]=b10 * a03 + b11 * a13 + b12 * a23 + b13 * a33
            dst[8]=b20 * a00 + b21 * a10 + b22 * a20 + b23 * a30
            dst[9]=b20 * a01 + b21 * a11 + b22 * a21 + b23 * a31
            dst[10]=b20 * a02 + b21 * a12 + b22 * a22 + b23 * a32
            dst[11]=b20 * a03 + b21 * a13 + b22 * a23 + b23 * a33
            dst[12]=b30 * a00 + b31 * a10 + b32 * a20 + b33 * a30
            dst[13]=b30 * a01 + b31 * a11 + b32 * a21 + b33 * a31
            dst[14]=b30 * a02 + b31 * a12 + b32 * a22 + b33 * a32
            dst[15]=b30 * a03 + b31 * a13 + b32 * a23 + b33 * a33
        },
        scale_2d(dst:Matrix,m:Matrix,v:Vec2){
            const x=v.x
            const y=v.y

            dst[0]=m[0]*x
            dst[1]=m[1]*x
            dst[2]=m[2]*x
            dst[3]=m[3]*x

            dst[4]=m[4]*y
            dst[5]=m[5]*y
            dst[6]=m[6]*y
            dst[7]=m[7]*y

            dst[8]=m[8]
            dst[9]=m[9]
            dst[10]=m[10]
            dst[11]=m[11]

            dst[12]=m[12]
            dst[13]=m[13]
            dst[14]=m[14]
            dst[15]=m[15]
        },
        translate_2d(dst:Matrix,m:Matrix,v:Vec2){
            const x=v.x
            const y=v.y

            dst[0]=m[0]
            dst[1]=m[1]
            dst[2]=m[2]
            dst[3]=m[3]

            dst[4]=m[4]
            dst[5]=m[5]
            dst[6]=m[6]
            dst[7]=m[7]

            dst[8]=m[8]
            dst[9]=m[9]
            dst[10]=m[10]
            dst[11]=m[11]

            dst[12]=m[0]*x+m[4]*y+m[12]
            dst[13]=m[1]*x+m[5]*y+m[13]
            dst[14]=m[2]*x+m[6]*y+m[14]
            dst[15]=m[3]*x+m[7]*y+m[15]
        },
        rotate_2d(dst:Matrix,m:Matrix,angle:RadAngle){
            const c=Math.cos(angle)
            const s=Math.sin(angle)

            const m0=m[0]
            const m1=m[1]
            const m2=m[2]
            const m3=m[3]

            const m4=m[4]
            const m5=m[5]
            const m6=m[6]
            const m7=m[7]

            dst[0]=m0*c+m4*s
            dst[1]=m1*c+m5*s
            dst[2]=m2*c+m6*s
            dst[3]=m3*c+m7*s

            dst[4]=m4*c-m0*s
            dst[5]=m5*c-m1*s
            dst[6]=m6*c-m2*s
            dst[7]=m7*c-m3*s

            dst[8]=m[8]
            dst[9]=m[9]
            dst[10]=m[10]
            dst[11]=m[11]

            dst[12]=m[12]
            dst[13]=m[13]
            dst[14]=m[14]
            dst[15]=m[15]
        },
        transform_2d( dst: Matrix,position: Vec2,scale: Vec2,rotation: number){
            const c = Math.cos(rotation)
            const s = Math.sin(rotation)

            const sx = scale.x
            const sy = scale.y

            dst[0] = c * sx
            dst[1] = s * sx
            dst[2] = 0
            dst[3] = 0

            dst[4] = -s * sy
            dst[5] = c * sy
            dst[6] = 0
            dst[7] = 0

            dst[8] = 0
            dst[9] = 0
            dst[10] = 1
            dst[11] = 0

            dst[12] = position.x
            dst[13] = position.y
            dst[14] = 0
            dst[15] = 1
        },
        parallax_2d(dst: Matrix, center: Vec2, value: number) {
            const inv = 1 - value

            dst[0] = value
            dst[1] = 0
            dst[2] = 0
            dst[3] = 0

            dst[4] = 0
            dst[5] = value
            dst[6] = 0
            dst[7] = 0

            dst[8] = 0
            dst[9] = 0
            dst[10] = 1
            dst[11] = 0

            dst[12] = center.x * inv
            dst[13] = center.y * inv
            dst[14] = 0
            dst[15] = 1
        },
        topdown_perspective_2d(dst: Matrix,center: Vec2,parallax: number,z_distance: number){
            const inv = 1 - parallax

            dst[0] = parallax
            dst[1] = 0
            dst[2] = 0
            dst[3] = 0

            dst[4] = 0
            dst[5] = parallax
            dst[6] = 0
            dst[7] = 0

            dst[8] = 0
            dst[9] = 0
            dst[10] = 1
            dst[11] = 0

            dst[12] = center.x * inv
            dst[13] = center.y * inv - z_distance
            dst[14] = 0
            dst[15] = 1
        }
    },
    is_equal(m1?:Matrix,m2?:Matrix){
        return m1===m2||(m1!==undefined&&m2!==undefined&&(
            m1[0]===m2[0]&&m1[1]===m2[1]&&m1[2]===m2[2]&&m1[3]===m2[3]&&
            m1[4]===m2[4]&&m1[5]===m2[5]&&m1[6]===m2[6]&&m1[7]===m2[7]&&
            m1[8]===m2[8]&&m1[9]===m2[9]&&m1[10]===m2[10]&&m1[11]===m2[11]&&
            m1[12]===m2[12]&&m1[13]===m2[13]&&m1[14]===m2[14]&&m1[15]===m2[15]
        ))
    },

    identity(): Matrix {
        return new Float32Array([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ]);
    },
    projection(size:Vec2,depth:number):Matrix{
        return new Float32Array([
           2 / size.x, 0, 0, 0,
           0, -2 / size.y, 0, 0,
           0, 0, 2 / depth, 0,
          -1, 1, 0, 1,
        ]);
    },
    translation_2d(v:Vec2):Matrix{
        return new Float32Array([
            1,  0,  0,  0,
            0,  1,  0,  0,
            0,  0,  1,  0,
            v.x, v.y, 0, 1,
        ])
    },
    translation_3d(v:Vec3) {
        return new Float32Array([
            1,  0,  0,  0,
            0,  1,  0,  0,
            0,  0,  1,  0,
            v.x, v.y, v.z, 1,
        ])
    },
    scale_2d(v: Vec2): Matrix {
        return new Float32Array([
            v.x, 0,   0, 0,
            0,   v.y, 0, 0,
            0,   0,   1, 0,
            0,   0,   0, 1,
        ])
    },
    scale_3d(v:Vec3) {
        return new Float32Array([
            v.x, 0,  0,  0,
            0, v.y,  0,  0,
            0,  0, v.z,  0,
            0,  0,  0,  1,
        ])
    },
    transform_2d(position: Vec2,scale: Vec2,rotation: number): Matrix {
        const c = Math.cos(rotation)
        const s = Math.sin(rotation)
        const sx = scale.x
        const sy = scale.y
        return new Float32Array([
            c * sx,  s * sx, 0, 0,
            -s * sy,  c * sy, 0, 0,
            0,       0,      1, 0,
            position.x, position.y, 0, 1
        ])
    },
    perspective(fov:number, aspect:number, near:number, far:number) {
        const f = Math.tan(Math.PI * 0.5 - 0.5 * fov)
        const rangeInv = 1.0 / (near - far)
    
        return new Float32Array([
            f / aspect, 0, 0, 0,
            0, f, 0, 0,
            0, 0, (near + far) * rangeInv, -1,
            0, 0, near * far * rangeInv * 2, 0
        ])
    },
    mul(a:Matrix, b:Matrix):Matrix{
        const a00 = a[0 * 4 + 0]
        const a01 = a[0 * 4 + 1]
        const a02 = a[0 * 4 + 2]
        const a03 = a[0 * 4 + 3]
        const a10 = a[1 * 4 + 0]
        const a11 = a[1 * 4 + 1]
        const a12 = a[1 * 4 + 2]
        const a13 = a[1 * 4 + 3]
        const a20 = a[2 * 4 + 0]
        const a21 = a[2 * 4 + 1]
        const a22 = a[2 * 4 + 2]
        const a23 = a[2 * 4 + 3]
        const a30 = a[3 * 4 + 0]
        const a31 = a[3 * 4 + 1]
        const a32 = a[3 * 4 + 2]
        const a33 = a[3 * 4 + 3]
        const b00 = b[0 * 4 + 0]
        const b01 = b[0 * 4 + 1]
        const b02 = b[0 * 4 + 2]
        const b03 = b[0 * 4 + 3]
        const b10 = b[1 * 4 + 0]
        const b11 = b[1 * 4 + 1]
        const b12 = b[1 * 4 + 2]
        const b13 = b[1 * 4 + 3]
        const b20 = b[2 * 4 + 0]
        const b21 = b[2 * 4 + 1]
        const b22 = b[2 * 4 + 2]
        const b23 = b[2 * 4 + 3]
        const b30 = b[3 * 4 + 0]
        const b31 = b[3 * 4 + 1]
        const b32 = b[3 * 4 + 2]
        const b33 = b[3 * 4 + 3]
        return new Float32Array([
          b00 * a00 + b01 * a10 + b02 * a20 + b03 * a30,
          b00 * a01 + b01 * a11 + b02 * a21 + b03 * a31,
          b00 * a02 + b01 * a12 + b02 * a22 + b03 * a32,
          b00 * a03 + b01 * a13 + b02 * a23 + b03 * a33,
          b10 * a00 + b11 * a10 + b12 * a20 + b13 * a30,
          b10 * a01 + b11 * a11 + b12 * a21 + b13 * a31,
          b10 * a02 + b11 * a12 + b12 * a22 + b13 * a32,
          b10 * a03 + b11 * a13 + b12 * a23 + b13 * a33,
          b20 * a00 + b21 * a10 + b22 * a20 + b23 * a30,
          b20 * a01 + b21 * a11 + b22 * a21 + b23 * a31,
          b20 * a02 + b21 * a12 + b22 * a22 + b23 * a32,
          b20 * a03 + b21 * a13 + b22 * a23 + b23 * a33,
          b30 * a00 + b31 * a10 + b32 * a20 + b33 * a30,
          b30 * a01 + b31 * a11 + b32 * a21 + b33 * a31,
          b30 * a02 + b31 * a12 + b32 * a22 + b33 * a32,
          b30 * a03 + b31 * a13 + b32 * a23 + b33 * a33,
        ])
    },
    xRotation(angle:RadAngle):Matrix{
        const c = Math.cos(angle)
        const s = Math.sin(angle)
    
        return new Float32Array([
            1, 0, 0, 0,
            0, c, s, 0,
            0, -s, c, 0,
            0, 0, 0, 1,
        ])
    },
    
    yRotation(angle:RadAngle):Matrix{
        const c = Math.cos(angle)
        const s = Math.sin(angle)

        return new Float32Array([
            c, 0, -s, 0,
            0, 1, 0, 0,
            s, 0, c, 0,
            0, 0, 0, 1,
        ])
    },

    zRotation(angle:RadAngle):Matrix{
        const c = Math.cos(angle)
        const s = Math.sin(angle)

        return new Float32Array([
            c, s, 0, 0,
            -s, c, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1,
        ])
    },
    parallax_2d(center: Vec2, value: number) {
        const inv = 1 - value

        return new Float32Array([
            value,0,0,0,
            0,value,0,0,
            0,0,1,0,
            center.x*inv,center.y*inv,0,1
        ])
    },
    clone(matrix:Matrix){
        return new Float32Array(matrix)
    }
}