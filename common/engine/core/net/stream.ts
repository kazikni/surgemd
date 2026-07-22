import { KDate } from "../definition/definitions.ts"
import { TDType, type TD } from "../lang/td.ts";
import { PolarMovement } from "../math/geometry.ts"
import { BaseHitbox2D, CircleHitbox2D, Hitbox2D, HitboxGroup2D, HitboxType2D, NullHitbox2D, PolygonHitbox2D, RectHitbox2D } from "../math/hitbox.ts"
import { ID } from "../math/utils.ts"
import { Vec2} from "../math/vec2.ts"
export abstract class Stream{
    static readonly decoder = new TextDecoder();
    static readonly encoder = new TextEncoder();
    protected static _tmpU8 = new Uint8Array(4096)

    abstract get length():number
    abstract get index():number
    abstract set index(val:number)
    abstract get data():Uint8Array
    abstract get buffer():ArrayBufferLike

    abstract clear():void

    abstract write_uint8(val:number):this
    abstract read_uint8():number
    abstract write_uint16(val:number):this
    abstract read_uint16():number
    abstract write_uint24(val:number):this
    abstract read_uint24():number
    abstract write_uint32(val:number):this
    abstract read_uint32():number
    abstract write_uint64(value: bigint): this
    abstract read_uint64(): bigint

    abstract write_int8(val:number):this
    abstract read_int8():number
    abstract write_int16(val:number):this
    abstract read_int16():number
    abstract write_int24(val:number):this
    abstract read_int24():number
    abstract write_int32(val:number):this
    abstract read_int32():number
    abstract write_int64(value: bigint): this
    abstract read_int64(): bigint

    abstract write_float32(value: number): this
    abstract read_float32(): number

    abstract write_float64(value: number): this
    abstract read_float64(): number
    
    abstract write_id(val:number):this
    abstract read_id():number

    abstract write_string_sized(value:string,bytes: number): this
    abstract read_string_sized(bytes: number): string

    abstract write_stream(src: Stream, offset?:number, length?:number):this

    abstract write_stream_dynamic(src: Stream): this
    abstract read_stream_dynamic(): Stream

    write_int(value:number,bytes:1|2|3|4):this{
        switch (bytes) {
            case 1: this.write_int8(value); break
            case 2: this.write_int16(value); break
            case 3: this.write_int24(value); break
            case 4: this.write_int32(value); break
        }
        return this
    }
    read_int(bytes:1|2|3|4):number{
        switch (bytes) {
            case 1: return this.read_int8()
            case 2: return this.read_int16()
            case 3: return this.read_int24()
            case 4: return this.read_int32()
        }
    }
    write_uint(value:number,bytes:1|2|3|4):this{
        switch (bytes) {
            case 1: this.write_uint8(value); break
            case 2: this.write_uint16(value); break
            case 3: this.write_uint24(value); break
            case 4: this.write_uint32(value); break
        }
        return this
    }
    read_uint(bytes:1|2|3|4):number{
        switch (bytes) {
            case 1: return this.read_uint8()
            case 2: return this.read_uint16()
            case 3: return this.read_uint24()
            case 4: return this.read_uint32()
        }
    }
    write_float(value: number, min: number, max: number, bytes: 1 | 2 | 3 | 4): this {
        const range = (2 ** (8 * bytes)) - 1;
        const val = ((value - min) / (max - min)) * range + 0.5;
        switch (bytes) {
            case 1: {
                this.write_uint8(val);
                return this;
            }
            case 2: {
                this.write_uint16(val);
                return this;
            }
            case 3: {
                this.write_uint24(val);
                return this;
            }
            case 4: {
                this.write_uint32(val);
                return this;
            }
        }
    }
    read_float(min: number, max: number, bytes: 1 | 2 | 3 | 4): number {
        const range = (2 ** (8 * bytes)) - 1;

        let val: number;
        switch (bytes) {
            case 1: {
                val = this.read_uint8();
                break;
            }
            case 2: {
                val = this.read_uint16();
                break;
            }
            case 3: {
                val = this.read_uint24();
                break;
            }
            case 4: {
                val = this.read_uint32();
                break;
            }
        }

        return min + (max - min) * val / range;
    }

    write_boolean_group(b0 : boolean, b1?: boolean, b2?: boolean, b3?: boolean,b4?: boolean, b5?: boolean, b6?: boolean, b7?: boolean): this {
        return this.write_uint8(
            (b0 ? 1 : 0)
            + (b1 ? 2 : 0)
            + (b2 ? 4 : 0)
            + (b3 ? 8 : 0)
            + (b4 ? 16 : 0)
            + (b5 ? 32 : 0)
            + (b6 ? 64 : 0)
            + (b7 ? 128 : 0)
        )
    }
    read_boolean_group(): boolean[] & { length: 8 } {
        const packedGroup = this.read_uint8()
        return [
            (packedGroup & 1) !== 0,
            (packedGroup & 2) !== 0,
            (packedGroup & 4) !== 0,
            (packedGroup & 8) !== 0,
            (packedGroup & 16) !== 0,
            (packedGroup & 32) !== 0,
            (packedGroup & 64) !== 0,
            (packedGroup & 128) !== 0
        ]
    }

    write_boolean_group2(b0 : boolean, b1?: boolean, b2?: boolean, b3?: boolean,b4?: boolean, b5?: boolean, b6?: boolean, b7?: boolean,b8?: boolean, b9?: boolean, bA?: boolean, bB?: boolean,bC?: boolean, bD?: boolean, bE?: boolean, bF?: boolean): this {
        return this.write_uint16(
            (b0 ? 1 : 0)
            + (b1 ? 2 : 0)
            + (b2 ? 4 : 0)
            + (b3 ? 8 : 0)
            + (b4 ? 16 : 0)
            + (b5 ? 32 : 0)
            + (b6 ? 64 : 0)
            + (b7 ? 128 : 0)
            + (b8 ? 256 : 0)
            + (b9 ? 512 : 0)
            + (bA ? 1024 : 0)
            + (bB ? 2048 : 0)
            + (bC ? 4096 : 0)
            + (bD ? 8192 : 0)
            + (bE ? 16384 : 0)
            + (bF ? 32768 : 0)
        )
    }
    read_boolean_group2(): boolean[] & { length: 16 } {
        const packedGroup = this.read_uint16();
        return [
            (packedGroup & 1) !== 0,
            (packedGroup & 2) !== 0,
            (packedGroup & 4) !== 0,
            (packedGroup & 8) !== 0,
            (packedGroup & 16) !== 0,
            (packedGroup & 32) !== 0,
            (packedGroup & 64) !== 0,
            (packedGroup & 128) !== 0,
            (packedGroup & 256) !== 0,
            (packedGroup & 512) !== 0,
            (packedGroup & 1024) !== 0,
            (packedGroup & 2048) !== 0,
            (packedGroup & 4096) !== 0,
            (packedGroup & 8192) !== 0,
            (packedGroup & 16384) !== 0,
            (packedGroup & 32768) !== 0
        ]
    }
    write_boolean_group3(
        b0 : boolean, b1?: boolean, b2?: boolean, b3?: boolean,
        b4?: boolean, b5?: boolean, b6?: boolean, b7?: boolean,
        b8?: boolean, b9?: boolean, bA?: boolean, bB?: boolean,
        bC?: boolean, bD?: boolean, bE?: boolean, bF?: boolean,
        bG?: boolean, bH?: boolean, bI?: boolean, bJ?: boolean,
        bK?: boolean, bL?: boolean, bM?: boolean, bN?: boolean
    ): this {
        return this.write_uint24(
            (b0 ? 1 : 0)
            + (b1 ? 2 : 0)
            + (b2 ? 4 : 0)
            + (b3 ? 8 : 0)
            + (b4 ? 16 : 0)
            + (b5 ? 32 : 0)
            + (b6 ? 64 : 0)
            + (b7 ? 128 : 0)
            + (b8 ? 256 : 0)
            + (b9 ? 512 : 0)
            + (bA ? 1024 : 0)
            + (bB ? 2048 : 0)
            + (bC ? 4096 : 0)
            + (bD ? 8192 : 0)
            + (bE ? 16384 : 0)
            + (bF ? 32768 : 0)
            + (bG ? 65536 : 0)
            + (bH ? 131072 : 0)
            + (bI ? 262144 : 0)
            + (bJ ? 524288 : 0)
            + (bK ? 1048576 : 0)
            + (bL ? 2097152 : 0)
            + (bM ? 4194304 : 0)
            + (bN ? 8388608 : 0)
        )
    }

    read_boolean_group3(): boolean[] & { length: 24 } {
        const packedGroup = this.read_uint24()

        return [
            (packedGroup & 1) !== 0,
            (packedGroup & 2) !== 0,
            (packedGroup & 4) !== 0,
            (packedGroup & 8) !== 0,
            (packedGroup & 16) !== 0,
            (packedGroup & 32) !== 0,
            (packedGroup & 64) !== 0,
            (packedGroup & 128) !== 0,
            (packedGroup & 256) !== 0,
            (packedGroup & 512) !== 0,
            (packedGroup & 1024) !== 0,
            (packedGroup & 2048) !== 0,
            (packedGroup & 4096) !== 0,
            (packedGroup & 8192) !== 0,
            (packedGroup & 16384) !== 0,
            (packedGroup & 32768) !== 0,
            (packedGroup & 65536) !== 0,
            (packedGroup & 131072) !== 0,
            (packedGroup & 262144) !== 0,
            (packedGroup & 524288) !== 0,
            (packedGroup & 1048576) !== 0,
            (packedGroup & 2097152) !== 0,
            (packedGroup & 4194304) !== 0,
            (packedGroup & 8388608) !== 0
        ] as boolean[] & { length: 24 }
    }

    write_booleans(l: boolean[]): this {
        const byteCount = Math.ceil(l.length / 8)
        for (let i = 0; i < byteCount; i++) {
            let packed = 0
            for (let bit = 0; bit < 8; bit++) {
                const index = i * 8 + bit
                if (index >= l.length) break
                if (l[index]) {
                    packed |= (1 << bit)
                }
            }
            this.write_uint8(packed)
        }
        return this
    }
    read_booleans(count: number): boolean[] {
        const result: boolean[] = new Array(count);
        const byteCount = Math.ceil(count / 8);
        let idx = 0
        for (let i = 0; i < byteCount; i++) {
            const packed = this.read_uint8()
            for (let bit = 0; bit < 8 && idx < count; bit++) {
                result[idx++] = (packed & (1 << bit)) !== 0;
            }
        }
        return result
    }

    write_string(string:string="",bytes: 1|2|3|4 = 1):this{
        this.write_uint(string.length, bytes)
        this.write_string_sized(string, string.length)
        return this
    }
    read_string(bytes: 1|2|3|4 = 1){
        return this.read_string_sized(this.read_uint(bytes))
    }

    write_array<T>(source: ArrayLike<T>, elementWriter: (item: T,idx:number, stream: this) => void, bytes: 1|2|3|4 = 1): this {
        const length = Math.min(source.length, 2 ** (8 * bytes) - 1);
        this.write_uint(length,bytes)
        for (let i = 0; i < length; i++) {
            elementWriter(source[i],i, this)
        }
        return this;
    }
    read_array<T>(elementReader: (idx:number, stream: this) => T, bytes: 1|2|3|4 = 1): T[] {
        const len = this.read_uint(bytes)
        const arr = new Array<T>(len)
        for (let i = 0; i < len; i++) arr[i] = elementReader(i,this)
        return arr
    }

    write_number_dict<T>(source: Record<number,T>, elementWriter: (item: T, stream: this) => void, bytes: 1|2|3|4=1):this{
        const keys=Object.keys(source)
        this.write_uint(keys.length,bytes)
        for(const k of keys){
            const key=parseInt(k)
            this.write_uint(key,bytes)
            elementWriter(source[key],this)
        }
        return this
    }
    read_number_dict<T>(elementReader: (stream: this) => T, bytes: 1|2|3|4=1): Record<number,T> {
        const len=this.read_uint(bytes)
        const ret:Record<string,T>={}
        for (let i = 0; i < len; i++) {
            const key=this.read_uint(bytes)
            ret[key]=elementReader(this)
        }
        return ret
    }

    
    write_string_dict<T>(source: Record<string, T>,elementWriter: (item: T, stream: this) => void,bytes: 1|2|3|4=1,string_len_bytes:1|2|3|4=1): this {
        const keys = Object.keys(source)
        this.write_uint(keys.length,bytes)
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i]
            this.write_string(key,string_len_bytes)
            elementWriter(source[key], this)
        }

        return this
    }
    read_string_dict<T>(elementReader: (stream: this) => T,bytes: 1|2|3|4=1,string_len_bytes:1|2|3|4=1): Record<string, T> {
        const len=this.read_uint(bytes)
        const obj: Record<string, T> = {}
        for (let i = 0; i < len; i++) {
            const key = this.read_string(string_len_bytes)
            obj[key] = elementReader(this)
        }
        return obj
    }

    write_any(obj: any,bytes1?:1|2|3|4,bytes2?:1|2|3|4): this {
        if (obj==null) {
            this.write_uint8(0)
            return this
        }
        switch (typeof obj) {
            case "boolean":
                this.write_uint8(1)
                this.write_uint8(obj ? 1 : 0)
                return this
            case "number":
                this.write_uint8(2)
                this.write_float32(obj)
                return this
            case "string":
                this.write_uint8(3)
                this.write_string(obj,bytes2)
                return this
            case "object":
                if (Array.isArray(obj)) {
                    this.write_uint8(4)
                    this.write_array(obj, (v) => this.write_any(v,bytes1,bytes2), bytes1)
                    return this
                }
                if(obj instanceof BaseHitbox2D){
                    this.write_uint8(6)
                    this.write_hitbox(obj as Hitbox2D)
                    return this
                }
                this.write_uint8(5)
                this.write_string_dict(obj, (v) => this.write_any(v,bytes1,bytes2), bytes1, bytes2)
                return this
        }

        throw new Error("Unsupported type in writeObject")
    }
    read_any(bytes1?:1|2|3|4,bytes2?:1|2|3|4): any {
        const type = this.read_uint8()
        switch (type) {
            case 0: return null
            case 1:
                return this.read_uint8() === 1
            case 2:
                return this.read_float32()  
            case 3:
                return this.read_string(bytes2)
            case 4:
                return this.read_array(_s => this.read_any(bytes1,bytes2),bytes1)
            case 5:
                return this.read_string_dict(_s => this.read_any(bytes1,bytes2),bytes1,bytes2)
            case 6:
                return this.read_hitbox()
        }
        throw new Error("Invalid type in readObject")
    }

    write_td(val: any, td: TD): this {
        switch (td.type) {
            case TDType.int:
                td.unsigned?this.write_uint(val, td.bytes):this.write_int(val, td.bytes)
                break
            case TDType.float:
                td.bytes===4?this.write_float32(val):this.write_float64(val)
                break
            case TDType.string:
                this.write_string(val, td.len_bytes)
                break
            case TDType.boolean:
                this.write_uint8(val?1:0)
                break
            case TDType.onu:
                if(val===undefined){
                    this.write_uint8(0)
                }else if(val===null){
                    this.write_uint8(1)
                }else{
                    this.write_uint8(2)
                    this.write_td(val,td.content)
                }
                break
            case TDType.object:
                for (const field of td.content) {
                    this.write_td(val[field.name], field.content)
                }
                break
            case TDType.array:
                this.write_array(val??[],(v)=>this.write_td(v, td.content),td.len_bytes)
                break
            case TDType.options: {
                const option = td.get_option(val)
                this.write_uint8(option)
                this.write_td(val, td.options[option])
                break
            }
            case TDType.advanced:
                td.on_encode(val, this)
                break
            case TDType.any:
                this.write_any(val,td.bytes1 as 1 | 2 | 3 | 4 | undefined,td.bytes2 as 1 | 2 | 3 | 4 | undefined)
                break
        }
        return this
    }
    read_td(td: TD): any {
        switch (td.type) {
            case TDType.int:
                return td.unsigned?this.read_uint(td.bytes):this.read_int(td.bytes)
            case TDType.float:
                return td.bytes===4?this.read_float32():this.read_float64()
            case TDType.string:
                return this.read_string(td.len_bytes)
            case TDType.boolean:
                return this.read_uint8()===1
            case TDType.onu:{
                const val=this.read_uint8()
                if(val===0){
                    return undefined
                }else if(val===1){
                    return null
                }else if(val===2){
                    return this.read_td(td.content)
                }
                return undefined
            }
            case TDType.object: {
                const obj: Record<string, any>={}
                for(const field of td.content){
                    obj[field.name]=this.read_td(field.content)
                }
                return obj
            }
            case TDType.array:
                return this.read_array(() => this.read_td(td.content),td.len_bytes)
            case TDType.options: {
                const option = this.read_uint8()
                return this.read_td(td.options[option])
            }
            case TDType.advanced:
                return td.on_decode(this)
            case TDType.any:
                return this.read_any(td.bytes1 as 1 | 2 | 3 | 4 | undefined,td.bytes2 as 1 | 2 | 3 | 4 | undefined)
        }
    }

    write_vec2(vector: Vec2,min: number, max: number,bytes: 1 | 2 | 3 | 4): this {
        this.write_float(vector.x, min, max, bytes)
        this.write_float(vector.y, min, max, bytes)
        return this
    }
    read_vec2(min: number,max: number,bytes: 1|2|3|4): Vec2 {
        return {
            x: this.read_float(min, max, bytes),
            y: this.read_float(min, max, bytes)
        };
    }

    write_pos2(vector: Vec2):this{
        this.write_float32(vector.x);
        this.write_float32(vector.y);
        return this;
    }
    read_pos2(): Vec2 {
        return {
            x: this.read_float32(),
            y: this.read_float32()
        };
    }

    write_polar_mov2(move:PolarMovement):this{
        this.write_rad(move.dir)
        this.write_float(move.scale,0,1,1)
        return this;
    }
    read_polar_mov2():PolarMovement{
        return {
            dir: this.read_rad(),
            scale: this.read_float(0,1,1)
        }
    }

    write_rad(val: number):this{
        this.write_float(val,(-Math.PI)*2,Math.PI*2,3);
        return this;
    }
    read_rad(): ID {
        return this.read_float((-Math.PI)*2,Math.PI*2,3);
    }

    
    write_hitbox(hb:Hitbox2D){
        this.write_uint8(hb.type)
        hb.encode(this)
        return this
    }
    read_hitbox():Hitbox2D{
        switch(this.read_uint8() as HitboxType2D){
            case HitboxType2D.circle:
                return CircleHitbox2D.decode(this)
            case HitboxType2D.rect:
                return RectHitbox2D.decode(this)
            case HitboxType2D.group:
                return HitboxGroup2D.decode(this)
            case HitboxType2D.polygon:
                return PolygonHitbox2D.decode(this)
            case HitboxType2D.null:
                return NullHitbox2D.decode(this)
        }
    }

    write_kdate(kdate: KDate): this {
        this.write_uint8(kdate.second)
        this.write_uint8(kdate.minute)
        this.write_uint8(kdate.hour)

        this.write_uint8(kdate.day)
        this.write_uint8(kdate.month)
        
        this.write_uint16(kdate.year)
        return this;
    }
    read_kdate(): KDate {
        return {
            second: this.read_uint8(),
            minute: this.read_uint8(),
            hour:   this.read_uint8(),

            day:    this.read_uint8(),
            month:  this.read_uint8(),

            year:   this.read_uint16()
        };
    }

    static write_uv(stream:Stream,x:number,y:number){
        stream.write_uint16((x*65535+0.5)|0)
        stream.write_uint16((y*65535+0.5)|0)
    }

    abstract write_bytes(bytes:Uint8Array):void
    abstract read_bytes(count:number):void
    abstract lock():void
}
export class StaticStream extends Stream{
    _view: DataView;
    _u8Array: Uint8Array;
    little_endian:boolean=true

    constructor(source: ArrayBuffer,byteOffset?: number,byteLength?: number) {
        super()
        this._view = new DataView(source, byteOffset, byteLength)
        this._u8Array = new Uint8Array(source, byteOffset, byteLength)
    }

    clear(){
        this.index=0
        this.length=0
    }


    _index = 0
    override get index(): number {
        return this._index
    }
    override set index(val: number) {
        this._index=val
    }

    _length = 0
    override get length(): number {
        return this._length
    }
    override set length(val:number){
        this._length=val
    }

    override get data(): Uint8Array<ArrayBufferLike> {
        return this._u8Array
    }

    get buffer(): ArrayBufferLike { return this._view.buffer }

    lock(): this {
        if (this.length === this._u8Array.length) return this

        const newBuffer = new ArrayBuffer(this.length)
        const newArray = new Uint8Array(newBuffer)

        newArray.set(
            this._u8Array.subarray(0, this.length)
        )

        this._u8Array = newArray
        this._view = new DataView(newBuffer)

        if (this.index > this.length) {
            this.index = this.length
        }

        return this
    }

    write_uint8(value: number): this {
        this._view.setUint8(this.index, value)
        this.index += 1
        if(this.index>this.length)this.length=this.index
        return this
    }
    read_uint8(): number {
        const val = this._view.getUint8(this.index);
        this.index += 1
        return val
    }

    write_uint16(value: number): this {
        this._view.setUint16(this.index, value,this.little_endian)
        this.index += 2
        if(this.index>this.length)this.length=this.index
        return this
    }
    read_uint16(): number {
        const val = this._view.getUint16(this.index,this.little_endian)
        this.index += 2
        return val
    }

    write_uint24(value:number): this {
        this._view.setUint16(this.index, value >> 8,this.little_endian)
        this.index += 2
        this._view.setUint8(this.index++, value)
        if (this.index > this.length)this.length = this.index
        return this
    }
    read_uint24(): number {
        const val = (this._view.getUint16(this.index,this.little_endian) << 8) + this._view.getUint8(this.index + 2)
        this.index += 3
        return val
    }

    write_uint32(value: number): this {
        this._view.setUint32(this.index, value,this.little_endian)
        this.index += 4
        if(this.index>this.length)this.length=this.index
        return this
    }
    read_uint32(): number {
        const val = this._view.getUint32(this.index,this.little_endian)
        this.index += 4
        return val
    }

    write_uint64(value: bigint): this {
        this._view.setBigUint64(this.index, value,this.little_endian)
        this.index += 8
        if(this.index>this.length)this.length=this.index
        return this
    }
    read_uint64(): bigint {
        const val = this._view.getBigUint64(this.index,this.little_endian)
        this.index += 8
        return val
    }

    write_id(value: number): this {
        this._view.setUint16(this.index, value,this.little_endian)
        this.index += 2
        if(this.index>this.length)this.length=this.index
        return this
    }
    read_id(): number {
        const val = this._view.getUint16(this.index,this.little_endian)
        this.index += 2
        return val
    }

    write_int8(value: number): this {
        this._view.setInt8(this.index, value)
        this.index += 1
        if(this.index>this.length)this.length=this.index
        return this
    }
    read_int8(): number {
        const val = this._view.getInt8(this.index)
        this.index += 1
        return val
    }

    write_int16(value: number): this {
        this._view.setInt16(this.index, value,this.little_endian)
        this.index += 2
        if(this.index>this.length)this.length=this.index
        return this
    }
    read_int16(): number {
        const val = this._view.getInt16(this.index,this.little_endian)
        this.index += 2
        return val
    }

    write_int24(value: number): this {
        this._view.setUint16(this.index, value >> 8,this.little_endian)
        this.index += 2
        this._view.setUint8(this.index++, value)
        if(this.index>this.length)this.length=this.index
        return this
    }
    read_int24(): number {
        const val = (this._view.getInt16(this.index,this.little_endian) << 8) + this._view.getInt8(this.index + 2)
        this.index += 3
        return val
    }

    write_int32(value: number): this {
        this._view.setInt32(this.index, value,this.little_endian)
        this.index += 4
        if(this.index>this.length)this.length=this.index
        return this
    }
    read_int32(): number {
        const val = this._view.getInt32(this.index,this.little_endian)
        this.index += 4
        return val
    }

    write_int64(value: bigint): this { 
        this._view.setBigInt64(this.index, value, this.little_endian)
        this.index += 8
        if(this.index>this.length)this.length=this.index
        return this
    }
    read_int64(): bigint {
        const val = this._view.getBigInt64(this.index, this.little_endian)
        this.index += 8
        return val
    }

    write_float32(value: number): this {
        this._view.setFloat32(this.index, value,this.little_endian)
        this.index += 4
        if(this.index>this.length)this.length=this.index
        return this
    }
    read_float32(): number {
        const val = this._view.getFloat32(this.index,this.little_endian)
        this.index += 4
        return val
    }

    write_float64(value: number): this {
        this._view.setFloat64(this.index, value,this.little_endian)
        this.index += 8
        if(this.index>this.length)this.length=this.index
        return this
    }
    read_float64(): number {
        const val = this._view.getFloat64(this.index,this.little_endian)
        this.index += 8
        if(this.index>this.length)this.length=this.index
        return val
    }

    write_string_sized(string: string,bytes: number): this {
        const byteArray = Stream.encoder.encode(string)
        for (let i = 0; i < bytes; i++) {
            const val = byteArray[i] ?? 0
            this._view.setUint8(this.index+i, val)
            if(val===0)break
        }
        this.index+=bytes
        if(this.index>this.length)this.length=this.index
        return this
    }
    read_string_sized(bytes: number): string {
        const buf = Stream._tmpU8
        let i=0
        while(i<bytes) {
            buf[i] = this._view.getUint8(this.index+i)
            if(buf[i]===0)break
            i++
        }
        this.index+=bytes
        return Stream.decoder.decode(buf.subarray(0, i))
    }
    write_stream(src: Stream,offset = 0,length = src.length - offset): this{
        this._u8Array.set(src.data.subarray(offset, offset + length), this.index)
        this.index += length
        if(this.index>this.length)this.length=this.index
        return this
    }

    write_stream_dynamic(src: Stream): this {
        this.write_uint24(src.length)
        this._u8Array.set(src.data.subarray(0, src.length), this.index)
        this.index += src.length
        if(this.index>this.length)this.length=this.index
        return this
    }
    read_stream_dynamic(): Stream {
        const len = this.read_uint24()
        const stream = new StaticStream(
            this._view.buffer as ArrayBuffer,
            this.index,
            len
        )
        stream.length = len
        this.index += len
        return stream
    }

    override write_bytes(data: Uint8Array): void {
        this._u8Array.set(data, this.index)
        this.index += data.length
    }
    override read_bytes(size: number): Uint8Array {
        const out = this._u8Array.subarray(this.index, this.index + size)
        this.index += size
        return out
    }
}
export class DynamicStream extends Stream{
    _view: DataView;
    _u8Array: Uint8Array;
    little_endian:boolean=true

    constructor(initialSize=10) {
        super()
        const b=new ArrayBuffer(initialSize)
        this._view = new DataView(b)
        this._u8Array = new Uint8Array(b)
    }

    clear(){
        this.index=0
        this.length=0
    }

    ensure(extra: number): void {
        const required = this.index + extra
        if (required <= this._u8Array.length) return

        let newSize = this._u8Array.length
        while (newSize < required) {
            newSize *= 2
        }

        const newBuffer = new ArrayBuffer(newSize)
        const newArray = new Uint8Array(newBuffer)

        newArray.set(this._u8Array.subarray(0, this.length))

        this._u8Array = newArray
        this._view = new DataView(newBuffer)
    }
    _index = 0
    override get index(): number {
        return this._index
    }
    override set index(val: number) {
        this._index=val
    }
    _length = 0
    override get length(): number {
        return this._length
    }
    override set length(val:number){
        this._length=val
    }
    override get data(): Uint8Array<ArrayBufferLike> {
        return this._u8Array
    }
    get buffer(): ArrayBufferLike { return this._view.buffer }

    lock(): this {
        if (this.length === this._u8Array.length) return this
        const newBuffer = new ArrayBuffer(this.length)
        const newArray = new Uint8Array(newBuffer)
        newArray.set(this._u8Array.subarray(0, this.length))
        this._u8Array = newArray
        this._view = new DataView(newBuffer)
        if (this.index > this.length) {
            this.index = this.length
        }
        return this
    }

    write_uint8(value: number): this {
        this.ensure(1)
        this._view.setUint8(this.index, value)
        this.index += 1
        if(this.index>this.length)this.length=this.index
        return this
    }
    read_uint8(): number {
        if(this._index+1>this.length)return 0
        const val = this._view.getUint8(this.index);
        this.index += 1
        return val
    }

    write_uint16(value: number): this {
        this.ensure(2)
        this._view.setUint16(this.index, value,this.little_endian)
        this.index += 2
        if(this.index>this.length)this.length=this.index
        return this
    }
    read_uint16(): number {
        if(this._index+2>this.length)return 0
        const val = this._view.getUint16(this.index,this.little_endian)
        this.index += 2
        return val
    }

    write_uint24(value:number): this {
        this.ensure(3)
        this._view.setUint16(this.index, value >> 8,this.little_endian)
        this.index += 2
        this._view.setUint8(this.index++, value)
        if (this.index > this.length)this.length = this.index
        return this
    }
    read_uint24(): number {
        if(this._index+3>this.length)return 0
        const val = (this._view.getUint16(this.index,this.little_endian) << 8) + this._view.getUint8(this.index + 2)
        this.index += 3
        return val
    }

    write_uint32(value: number): this {
        this.ensure(4)
        this._view.setUint32(this.index, value,this.little_endian)
        this.index += 4
        if(this.index>this.length)this.length=this.index
        return this
    }
    read_uint32(): number {
        if(this._index+4>this.length)return 0
        const val = this._view.getUint32(this.index,this.little_endian)
        this.index += 4
        return val
    }

    write_uint64(value: bigint): this {
        this.ensure(8)
        this._view.setBigUint64(this.index, value,this.little_endian)
        this.index += 8
        if(this.index>this.length)this.length=this.index
        return this
    }
    read_uint64(): bigint {
        if(this._index+8>this.length)return BigInt(0)
        const val = this._view.getBigUint64(this.index,this.little_endian)
        this.index += 8
        return val
    }

    write_id(value: number): this {
        this.ensure(2)
        this._view.setUint16(this.index, value,this.little_endian)
        this.index += 2
        if(this.index>this.length)this.length=this.index
        return this
    }
    read_id(): number {
        if(this._index+2>this.length)return 0
        const val = this._view.getUint16(this.index,this.little_endian)
        this.index += 2
        return val
    }

    write_int8(value: number): this {
        this.ensure(1)
        this._view.setInt8(this.index, value)
        this.index += 1
        if(this.index>this.length)this.length=this.index
        return this
    }
    read_int8(): number {
        if(this._index+1>this.length)return 0
        const val = this._view.getInt8(this.index)
        this.index += 1
        return val
    }

    write_int16(value: number): this {
        this.ensure(2)
        this._view.setInt16(this.index, value,this.little_endian)
        this.index += 2
        if(this.index>this.length)this.length=this.index
        return this
    }
    read_int16(): number {
        if(this._index+2>this.length)return 0
        const val = this._view.getInt16(this.index,this.little_endian)
        this.index += 2
        return val
    }

    write_int24(value: number): this {
        this.ensure(3)
        this._view.setUint16(this.index, value >> 8,this.little_endian)
        this.index += 2
        this._view.setUint8(this.index++, value)
        if(this.index>this.length)this.length=this.index
        return this
    }
    read_int24(): number {
        if(this._index+3>this.length)return 0
        const val = (this._view.getInt16(this.index,this.little_endian) << 8) + this._view.getInt8(this.index + 2)
        this.index += 3
        return val
    }

    write_int32(value: number): this {
        this.ensure(4)
        this._view.setInt32(this.index, value,this.little_endian)
        this.index += 4
        if(this.index>this.length)this.length=this.index
        return this
    }
    read_int32(): number {
        if(this._index+4>this.length)return 0
        const val = this._view.getInt32(this.index,this.little_endian)
        this.index += 4
        return val
    }

    write_int64(value: bigint): this {
        this.ensure(8)
        this._view.setBigInt64(this.index, value,this.little_endian)
        this.index += 8
        if(this.index>this.length)this.length=this.index
        return this
    }
    read_int64(): bigint {
        if(this._index+8>this.length)return BigInt(0)
        const val = this._view.getBigInt64(this.index,this.little_endian)
        this.index += 8
        return val
    }

    write_float32(value: number): this {
        this.ensure(4)
        this._view.setFloat32(this.index, value,this.little_endian)
        this.index += 4
        if(this.index>this.length)this.length=this.index
        return this
    }
    read_float32(): number {
        if(this._index+4>this.length)return 0
        const val = this._view.getFloat32(this.index,this.little_endian)
        this.index += 4
        return val
    }

    write_float64(value: number): this {
        this.ensure(8)
        this._view.setFloat64(this.index, value,this.little_endian)
        this.index += 8
        if(this.index>this.length)this.length=this.index
        return this
    }
    read_float64(): number {
        if(this._index+8>this.length)return 0
        const val = this._view.getFloat64(this.index,this.little_endian)
        this.index += 8
        if(this.index>this.length)this.length=this.index
        return val
    }

    write_string_sized(string: string,bytes: number): this {
        this.ensure(bytes)
        const byteArray = Stream.encoder.encode(string)
        for (let i = 0; i < bytes; i++) {
            const val = byteArray[i] ?? 0
            this._view.setUint8(this.index+i, val)
            if(val===0)break
        }
        this.index+=bytes
        if(this.index>this.length)this.length=this.index
        return this
    }
    read_string_sized(bytes: number): string {
        if(this._index+bytes>this.length)return ""
        const buf = StaticStream._tmpU8
        let i=0
        while(i<bytes) {
            buf[i] = this._view.getUint8(this.index+i)
            if(buf[i]===0)break
            i++
        }
        this.index+=bytes
        return Stream.decoder.decode(buf.subarray(0, i))
    }
    write_stream(src: Stream,offset = 0,length = src.length - offset): this{
        this.ensure(length)
        this._u8Array.set(src.data.subarray(offset, offset + length), this.index)
        this.index += length
        if(this.index>this.length)this.length=this.index
        return this
    }

    write_stream_dynamic(src: Stream): this {
        this.write_uint24(src.length)
        this.ensure(src.length)
        this._u8Array.set(src.data.subarray(0, src.length), this.index)
        this.index += src.length
        if(this.index>this.length)this.length=this.index
        return this
    }
    read_stream_dynamic(): Stream {
        const len = this.read_uint24()
        const stream = new StaticStream(
            this._view.buffer as ArrayBuffer,
            this.index,
            len
        )
        if(this._index+len>this.length)return stream
        stream.length = len
        this.index += len
        return stream
    }

    override write_bytes(data: Uint8Array): void {
        this.ensure(data.length)
        this._u8Array.set(data, this.index)
        if(this.index>this.length)this.length=this.index
    }
    override read_bytes(size: number): Uint8Array {
        const out = this._u8Array.subarray(this.index, this.index + size)
        this.index += size
        return out
    }
}