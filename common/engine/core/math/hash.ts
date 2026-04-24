export const hash=Object.freeze({
    hash_2d(x:number,y:number): number {
        return ((x|0) << 16)^(y|0)
    },
    hash_3d(x:number,y:number,z:number):number{
        return (((x|0) * 73856093) ^ ((y|0) * 19349663) ^ ((z|0) * 83492791)) | 0
    },
    hash_3d_big(x:number,y:number,z:number):bigint{
        const vx = BigInt(x | 0) & 0xffffffffn
        const vy = BigInt(y | 0) & 0xffffffffn
        const vz = BigInt(z | 0) & 0xffffffffn

        let hash = vx
        hash = (hash << 21n) ^ vy
        hash = (hash << 21n) ^ vz

        return hash & 0xffffffffffffffffn
    }
})