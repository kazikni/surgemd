export const hash=Object.freeze({
    hash_2d(x:number,y:number): number {
        return ((x|0) << 16)^(y|0)
    },
    hash_3d(x:number,y:number,z:number):number{
        return (((x|0) * 73856093) ^ ((y|0) * 19349663) ^ ((z|0) * 83492791)) | 0
    },
    hash_3d_big(x:number,y:number,z:number):bigint{
        let h =
            (BigInt(x|0) * 0x9E3779B185EBCA87n) ^
            (BigInt(y|0) * 0xC2B2AE3D27D4EB4Fn) ^
            (BigInt(z|0) * 0x165667B19E3779F9n)

        h ^= h >> 30n
        h *= 0xBF58476D1CE4E5B9n
        h ^= h >> 27n
        h *= 0x94D049BB133111EBn
        h ^= h >> 31n

        return h & 0xffffffffffffffffn
    }
})