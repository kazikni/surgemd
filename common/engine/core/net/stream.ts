import { KDate } from "../definition/definitions.ts";
import { PolarMovement } from "../math/geometry.ts";
import { CircleHitbox2D, Hitbox2D, HitboxGroup2D, HitboxType2D, NullHitbox2D, PolygonHitbox2D, RectHitbox2D } from "../math/hitbox.ts";
import { ID } from "../math/utils.ts";
import { Vec2,v2 } from "../math/vec2.ts";
import { v3 } from "../math/vec3.ts";
//Thanks Suroi.io

export class NetStream {
    static readonly decoder = new TextDecoder();
    static readonly encoder = new TextEncoder();

    readonly _view: DataView;
    readonly _u8Array: Uint8Array;
    private static _tmpU8 = new Uint8Array(4096)

    get buffer(): ArrayBufferLike { return this._view.buffer; }

    index = 0
    length = 0

    constructor(
        source: ArrayBuffer,
        byteOffset?: number,
        byteLength?: number
    ) {
        this._view = new DataView(source, byteOffset, byteLength);
        this._u8Array = new Uint8Array(source, byteOffset, byteLength);
    }

    clear(){
        this.index=0
        this.length=0
    }

    /**
     * @returns An integer in `[0, 256[`
     */
    readUint8(): number {
        const val = this._view.getUint8(this.index);
        this.index += 1;
        return val;
    }

    /**
     * @param value An integer in range `[0, 256[` to write. The following cause undefined behavior:
     * - `value` being `NaN`
     * - `value` being infinite
     * Negative values cause underflow, and decimals are truncated.
     *
     * Integers larger than 255 have their least significant byte written
     */
    writeUint8(value: number): this {
        this._view.setUint8(this.index, value);
        this.index += 1;
        if(this.index>this.length)this.length=this.index
        return this;
    }

    /**
     * @returns An integer in `[0, 65536[`
     */
    readUint16(): number {
        const val = this._view.getUint16(this.index);
        this.index += 2;
        return val;
    }

    /**
     * @param value An integer in range `[0, 65536[` to write. The following cause undefined behavior:
     * - `value` being `NaN`
     * - `value` being infinite
     * Negative values cause underflow, and decimals are truncated.
     *
     * Integers larger than 65535 have their 2 least significant bytes written
     */
    writeUint16(value: number): this {
        this._view.setUint16(this.index, value);
        this.index += 2;
        if(this.index>this.length)this.length=this.index
        return this;
    }

    /**
     * **Warning**: This is not a native DataView method
     * @returns An integer in `[0, 16777216[`
     */
    readUint24(): number {
        const val = (this._view.getUint16(this.index) << 8) + this._view.getUint8(this.index + 2);
        this.index += 3;
        return val;
    }

    /**
     * **Warning**: This is not a native DataView method
     * @param value An integer in range `[0, 16777216[` to write. The following cause undefined behavior:
     * - `value` being `NaN`
     * - `value` being infinite
     * Negative values cause underflow, and decimals are truncated.
     *
     * Integers larger than 16777215 have their 4 least significant bytes written
     */
    writeUint24(value: number): this {
        this._view.setUint16(this.index, value >> 8);
        this.index += 2;
        this._view.setUint8(this.index++, value);
        if(this.index>this.length)this.length=this.index
        return this;
    }

    /**
     * @returns An integer in `[0, 4294967296[`
     */
    readUint32(): number {
        const val = this._view.getUint32(this.index);
        this.index += 4;
        return val;
    }

    /**
     * @param value An integer in range `[0, 4294967296[` to write. The following cause undefined behavior:
     * - `value` being `NaN`
     * - `value` being infinite
     * Negative values cause underflow, and decimals are truncated.
     *
     * Integers larger than 4294967295 have their 4 least significant bytes written
     */
    writeUint32(value: number): this {
        this._view.setUint32(this.index, value);
        this.index += 4;
        if(this.index>this.length)this.length=this.index
        return this;
    }

    /**
     * @returns An integer in `[0, 18446744073709551616[`
     */
    readUint64(): bigint {
        const val = this._view.getBigUint64(this.index);
        this.index += 8;
        return val;
    }

    /**
     * @param value An integer in range `[0, 18446744073709551616[` to write. `value` being negative
     * causes underflow
     *
     * Integers larger than 18446744073709551615 have their 8 least significant bytes written
     */
    writeUint64(value: bigint): this {
        this._view.setBigUint64(this.index, value);
        this.index += 8;
        if(this.index>this.length)this.length=this.index
        return this;
    }

    /**
     * @returns An integer in `[-128, 128[`
     */
    readInt8(): number {
        const val = this._view.getInt8(this.index);
        this.index += 1;
        return val;
    }

    /**
     * @param value An integer in range `[-128, 128[` to write. The following cause undefined behavior:
     * - `value` being `NaN`
     * - `value` being infinite
     * - `value` not being an integer
     * - `value` being out-of-range
     */
    writeInt8(value: number): this {
        this._view.setInt8(this.index, value);
        this.index += 1;
        if(this.index>this.length)this.length=this.index
        return this;
    }

    /**
     * @returns An integer in `[-32768, 32768[`
     */
    readInt16(): number {
        const val = this._view.getInt16(this.index);
        this.index += 2;
        return val;
    }

    /**
     * @param value An integer in range `[-32768, 32768[` to write. The following cause undefined behavior:
     * - `value` being `NaN`
     * - `value` being infinite
     * - `value` being negative
     * - `value` not being an integer
     * - `value` being out-of-range
     */
    writeInt16(value: number): this {
        this._view.setInt16(this.index, value);
        this.index += 2;
        if(this.index>this.length)this.length=this.index
        return this;
    }

    /**
     * @returns An integer in `[-2147483648, 2147483648[`
     */
    readInt32(): number {
        const val = this._view.getInt32(this.index);
        this.index += 4;
        return val;
    }

    /**
     * @param value An integer in range `[-2147483648, 2147483648[` to write. The following cause undefined behavior:
     * - `value` being `NaN`
     * - `value` being infinite
     * - `value` being negative
     * - `value` not being an integer
     * - `value` being out-of-range
     */
    writeInt32(value: number): this {
        this._view.setInt32(this.index, value);
        this.index += 4;
        if(this.index>this.length)this.length=this.index
        return this;
    }

    /**
     * @returns An integer in `[-9223372036854775808, 9223372036854775808[`
     */
    readInt64(): bigint {
        const val = this._view.getBigInt64(this.index);
        this.index += 8;
        return val;
    }

    /**
     * @param value An integer in range `[-9223372036854775808, 9223372036854775808[` to write. `value` being out-of-range
     * leads to undefined behavior
     */
    writeInt64(value: bigint): this {
        this._view.setBigInt64(this.index, value);
        this.index += 8;
        if(this.index>this.length)this.length=this.index
        return this;
    }

    /**
     * @returns An IEEE-754 single-precision float which may be `NaN` or ±`Infinity`
     */
    readFloat32(): number {
        const val = this._view.getFloat32(this.index);
        this.index += 4;
        return val;
    }

    /**
     * @param value Any floating point value, including `NaN`, ±`Infinity`, and any integer
     */
    writeFloat32(value: number): this {
        this._view.setFloat32(this.index, value);
        this.index += 4;
        if(this.index>this.length)this.length=this.index
        return this;
    }

    /**
     * @returns An IEEE-754 double-precision float (same format natively used by Javascript) which may be `NaN` or ±`Infinity`
     */
    readFloat64(): number {
        const val = this._view.getFloat64(this.index);
        this.index += 8;
        if(this.index>this.length)this.length=this.index
        return val;
    }

    /**
     * @param value Any floating point value, including `NaN`, ±`Infinity`, and any integer
     */
    writeFloat64(value: number): this {
        this._view.setFloat64(this.index, value);
        this.index += 8;
        if(this.index>this.length)this.length=this.index
        return this;
    }

    /**
     * Reads a UTF-8 string using the [TextDecoder API](https://developer.mozilla.org/en-US/docs/Web/API/TextDecoder)
     * @param bytes The number of bytes to read. Undefined behavior occurs if this value is:
     * - not an integer
     * - negative
     * - `NaN`
     * - non-finite
     *
     * @returns A UTF-8 string conforming to the output of {@link TextDecoder#decode}, with the decoder's encoding set to UTF-8
     */
    readStringSized(bytes: number): string {
        if (bytes === 0) return "";

        const buf = NetStream._tmpU8;
        let i = 0, c = 0;
        while (i < bytes && (c = this.readUint8()) !== 0) {
            buf[i++] = c;
        }
        if (i === 0) return "";
        return NetStream.decoder.decode(buf.subarray(0, i));
    }
    readString(bytes: 1|2|3|4 = 2){
        let len = 0;
        switch (bytes) {
            case 1: len = this.readUint8(); break
            case 2: len = this.readUint16(); break
            case 3: len = this.readUint24(); break
            case 4: len = this.readUint32(); break
        }
        return this.readStringSized(len)
    }

    /**
     * Writes a UTF-8 string using the [TextEncoder API](https://developer.mozilla.org/en-US/docs/Web/API/TextEncoder)
     * @param bytes The number of bytes to write. Undefined behavior occurs if this value is:
     * - not an integer
     * - negative
     * - `NaN`
     * - non-finite
     * @param string The string to encode. Any null character (equivalently, `\x00`, `\0`, or `\u0000`) will immediately terminate writing,
     * as if the string had no characters beyond it. In other words, any string `s` will be treated as if it were `s.substring(0, s.indexOf("\0"))`
     * Any string whose encoding exceeds the provided byte count will have the excess bits truncated silently
     */
    writeStringSized(bytes: number, string: string): this {
        if (bytes === 0) return this;

        const byteArray = NetStream.encoder.encode(string);

        for (let i = 0; i < bytes; i++) {
            const val = byteArray[i] ?? 0;
            this.writeUint8(val);

            if (val === 0) { break; }
        }
        if(this.index>this.length)this.length=this.index

        return this;
    }
    writeString(string:string,bytes: 1|2|3|4 = 2):this{
        const length=string.length
        switch (bytes) {
            case 1: this.writeUint8(length); break
            case 2: this.writeUint16(length); break
            case 3: this.writeUint24(length); break
            case 4: this.writeUint32(length); break
        }
        this.writeStringSized(string.length,string)
        if(this.index>this.length)this.length=this.index
        return this
    }

    /**
     * Writes a float value constrained to an interval. Undefined behavior occurs if the interval described by
     * `min` and `max` is degenerate (in other words, if `min ≥ max`). The interval is inclusive, and reads/writes of the
     * bounds are guaranteed to be 100% accurate.
     * @param value The value to write. Undefined behavior occurs if it is `NaN`, non-finite, or outside the interval `[min, max]`
     * @param min The lower bound of the interval. Undefined behavior occurs if it is `NaN` or non-finite
     * @param max The upper bound of the interval. Undefined behavior occurs if it is `NaN` or non-finite
     * @param bytes The amount of bytes to used. Must be an integer in [1, 4]. Undefined behavior happens for any other value.
     */
    writeFloat(value: number, min: number, max: number, bytes: 1 | 2 | 3 | 4): this {
        const range = (2 ** (8 * bytes)) - 1;

        const val = ((value - min) / (max - min)) * range + 0.5;
        switch (bytes) {
            case 1: {
                this.writeUint8(val);
                return this;
            }
            case 2: {
                this.writeUint16(val);
                return this;
            }
            case 3: {
                this.writeUint24(val);
                return this;
            }
            case 4: {
                this.writeUint32(val);
                return this;
            }
        }
    }

    /**
     * Reads a float value constrained to an interval. Undefined behavior occurs if the interval described by
     * `min` and `max` is degenerate (in other words, if `min ≥ max`). The interval is inclusive, and reads/writes of the
     * bounds are guaranteed to be 100% accurate.
     * @param min The lower bound of the interval. Undefined behavior occurs if it is `NaN` or non-finite
     * @param max The upper bound of the interval. Undefined behavior occurs if it is `NaN` or non-finite
     * @param bytes The amount of bytes to used. Must be an integer in [1, 4]. Undefined behavior happens for any other value.
     */
    readFloat(min: number, max: number, bytes: 1 | 2 | 3 | 4): number {
        const range = (2 ** (8 * bytes)) - 1;

        let val: number;
        switch (bytes) {
            case 1: {
                val = this.readUint8();
                break;
            }
            case 2: {
                val = this.readUint16();
                break;
            }
            case 3: {
                val = this.readUint24();
                break;
            }
            case 4: {
                val = this.readUint32();
                break;
            }
        }

        return min + (max - min) * val / range;
    }

    /**
     * Writes a group of 8 booleans. Any omitted booleans are interpreted as "don't care" terms—however, they
     * will always be written as `false` to the stream.
     */
    writeBooleanGroup(
        // eslint-disable-next-line @stylistic/type-annotation-spacing
        b0 : boolean, b1?: boolean, b2?: boolean, b3?: boolean,
        b4?: boolean, b5?: boolean, b6?: boolean, b7?: boolean
    ): this {
        return this.writeUint8(
            (b0 ? 1 : 0)
            + (b1 ? 2 : 0)
            + (b2 ? 4 : 0)
            + (b3 ? 8 : 0)
            + (b4 ? 16 : 0)
            + (b5 ? 32 : 0)
            + (b6 ? 64 : 0)
            + (b7 ? 128 : 0)
        );
    }

    /**
     * Reads a group of 8 booleans. "Don't care" terms will have been encoded as `false`.
     * Intended to be used with destructuring:
     * ```ts
     * // … somewhere on server …
     * stream.writeBooleanGroup(isAlive, isBoosted, hasItem);
     *
     * // … somewhere on client …
     * const [isAlive, isBoosted, hasItem] = stream.readBooleanGroup();
     * // the other 5 elements are "don't care" elements, but will always be 0 nevertheless
     * ```
     *
     * Note: can be used on an 8-bit integer. In this case, *the bit order will be reversed*.
     * In other words, the integer's LSB will be in this array's first position, and its MSB
     * will be in this array's last position
     */
    readBooleanGroup(): boolean[] & { length: 8 } {
        const packedGroup = this.readUint8();
        return [
            (packedGroup & 1) !== 0,
            (packedGroup & 2) !== 0,
            (packedGroup & 4) !== 0,
            (packedGroup & 8) !== 0,
            (packedGroup & 16) !== 0,
            (packedGroup & 32) !== 0,
            (packedGroup & 64) !== 0,
            (packedGroup & 128) !== 0
        ];
    }

    /**
     * Writes a group of 16 booleans over 2 bytes. Any omitted booleans are interpreted as "don't care" terms—however, they
     * will always be written as `false` to the stream.
     */
    writeBooleanGroup2(
        // eslint-disable-next-line @stylistic/type-annotation-spacing
        b0 : boolean, b1?: boolean, b2?: boolean, b3?: boolean,
        b4?: boolean, b5?: boolean, b6?: boolean, b7?: boolean,
        b8?: boolean, b9?: boolean, bA?: boolean, bB?: boolean,
        bC?: boolean, bD?: boolean, bE?: boolean, bF?: boolean
    ): this {
        return this.writeUint16(
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
        );
    }
    writeBooleans(l: boolean[]): this {
        const byteCount = Math.ceil(l.length / 8);

        for (let i = 0; i < byteCount; i++) {
            let packed = 0;

            for (let bit = 0; bit < 8; bit++) {
                const index = i * 8 + bit;
                if (index >= l.length) break;

                if (l[index]) {
                    packed |= (1 << bit);
                }
            }

            this.writeUint8(packed);
        }

        return this;
    }
    /**
     * Reads a group of 16 booleans over 2 bytes. "Don't care" terms will have been encoded as `false`.
     * Intended to be used with destructuring:
     * ```ts
     * // … somewhere on server …
     * stream.writeBooleanGroup2(isAlive, isBoosted, hasItem);
     *
     * // … somewhere on client …
     * const [isAlive, isBoosted, hasItem] = stream.readBooleanGroup2();
     * // the other 13 elements are "don't care" elements, but will always be 0 nevertheless
     * ```
     *
     *  Note: can be used on a 16-bit integer. In this case, *the bit order will be reversed*.
     * In other words, the integer's LSB will be in this array's first position
     */
    readBooleanGroup2(): boolean[] & { length: 16 } {
        const packedGroup = this.readUint16();
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
        ];
    }
    readBooleans(count: number): boolean[] {
        const result: boolean[] = new Array(count);
        const byteCount = Math.ceil(count / 8);

        let idx = 0;

        for (let i = 0; i < byteCount; i++) {
            const packed = this.readUint8();

            for (let bit = 0; bit < 8 && idx < count; bit++) {
                result[idx++] = (packed & (1 << bit)) !== 0;
            }
        }

        return result;
    }
    /**
     * Writes an array's elements to the stream, with a maximum length depending on the chosen byte count
     * @param source The source array. Arrays exceeding the maximum length will be truncated silently (see below for maximum lengths)
     * @param elementWriter A function allowing the serialization of any given element in the array
     * @param bytes The amount of bytes to use to signal the array's length. The maximum lengths for a given byte count are as follows:
     * | Bytes             | Max. array length |
     * | :---------------: | :---------------: |
     * | 1                 | 255               |
     * | 2                 | 65535             |
     * | 3                 | 16777215          |
     * | 4                 | 4294967295        |
     * | `n`               | 2 ** 8`n`         |
     */
    writeArray<T>(source: ArrayLike<T>, elementWriter: (item: T, stream: this) => void, bytes: 1 | 2 | 3 | 4 = 1): this {
        const length = Math.min(source.length, 2 ** (8 * bytes) - 1);
        switch (bytes) {
            case 1: {
                this.writeUint8(length);
                break;
            }
            case 2: {
                this.writeUint16(length);
                break;
            }
            case 3: {
                this.writeUint24(length);
                break;
            }
            case 4: {
                this.writeUint32(length);
                break;
            }
        }

        for (let i = 0; i < length; i++) {
            elementWriter(source[i], this);
        }
        if(this.index>this.length)this.length=this.index

        return this;
    }

    /**
     * Reads and creates an array based on the contents of this stream. The length depends on the byte count provided
     * @param bytes The number of bytes to read to obtain the array's length
     * @param elementReader A function allowing to read any given element from the stream
     */
    readArray<T>(elementReader: (stream: this) => T, bytes: 1 | 2 | 3 | 4): T[] {
        let len = 0;
        switch (bytes) {
            case 1: len = this.readUint8(); break
            case 2: len = this.readUint16(); break
            case 3: len = this.readUint24(); break
            case 4: len = this.readUint32(); break
        }
        const arr = new Array<T>(len)
        for (let i = 0; i < len; i++) arr[i] = elementReader(this)
        return arr
    }
    readNumberDict<T>(elementReader: (stream: this) => T, bytes: 1 | 2 | 3 | 4): Record<number,T> {
        let len = 0;
        switch (bytes) {
            case 1: len = this.readUint8(); break
            case 2: len = this.readUint16(); break
            case 3: len = this.readUint24(); break
            case 4: len = this.readUint32(); break
        }
        const ret:Record<string,T>={}
        for (let i = 0; i < len; i++) {
            let key=0;
            switch (bytes) {
                case 1: key = this.readUint8(); break
                case 2: key = this.readUint16(); break
                case 3: key = this.readUint24(); break
                case 4: key = this.readUint32(); break
            }
            ret[key]=elementReader(this)
        }
        return ret
    }
    writeNumberDict<T>(source: Record<number,T>, elementWriter: (item: T, stream: this) => void, bytes: 1 | 2 | 3 | 4 = 1):this{
        const kk=Object.keys(source)
        const length = Math.min(kk.length, 2 ** (8 * bytes) - 1);
        switch (bytes) {
            case 1: {
                this.writeUint8(length);
                break;
            }
            case 2: {
                this.writeUint16(length);
                break;
            }
            case 3: {
                this.writeUint24(length);
                break;
            }
            case 4: {
                this.writeUint32(length);
                break;
            }
        }
        for(const k of kk){
            const key=parseInt(k)
            switch (bytes) {
                case 1: {
                    this.writeUint8(key);
                    break;
                }
                case 2: {
                    this.writeUint16(key);
                    break;
                }
                case 3: {
                    this.writeUint24(key);
                    break;
                }
                case 4: {
                    this.writeUint32(key);
                    break;
                }
            }
            elementWriter(source[key],this)
        }
        return this
    }
    writeStringDict<T>(source: Record<string, T>,elementWriter: (item: T, stream: this) => void,bytes: 1|2|3|4=1,string_len_bytes:1|2|3|4=1): this {
        const keys = Object.keys(source)
        const length = Math.min(keys.length, 2 ** (8 * bytes) - 1)

        switch (bytes) {
            case 1: this.writeUint8(length); break
            case 2: this.writeUint16(length); break
            case 3: this.writeUint24(length); break
            case 4: this.writeUint32(length); break
        }

        for (let i = 0; i < length; i++) {
            const key = keys[i]
            this.writeString(key,string_len_bytes)
            elementWriter(source[key], this)
        }

        return this
    }
    readStringDict<T>(elementReader: (stream: this) => T,bytes: 1|2|3|4,string_len_bytes:1|2|3|4=1): Record<string, T> {
        let len = 0

        switch (bytes) {
            case 1: len = this.readUint8(); break
            case 2: len = this.readUint16(); break
            case 3: len = this.readUint24(); break
            case 4: len = this.readUint32(); break
        }

        const obj: Record<string, T> = {}

        for (let i = 0; i < len; i++) {
            const key = this.readString(string_len_bytes)
            obj[key] = elementReader(this)
        }

        return obj
    }
    writeObject(obj: any,bytes1?:1|2|3|4,bytes2?:1|2|3|4): this {
        if (obj === null) {
            this.writeUint8(0)
            return this
        }

        switch (typeof obj) {
            case "boolean":
                this.writeUint8(1)
                this.writeUint8(obj ? 1 : 0)
                return this
            case "number":
                this.writeUint8(2)
                this.writeFloat64(obj)
                return this
            case "string":
                this.writeUint8(3)
                this.writeString(obj,bytes2)
                return this
            case "object":
                if (Array.isArray(obj)) {
                    this.writeUint8(4)
                    this.writeArray(obj, (v, s) => s.writeObject(v,bytes1,bytes2), 3)
                    return this
                }

                this.writeUint8(5)
                this.writeStringDict(obj, (v,s) => s.writeObject(v,bytes1,bytes2), 3)
                return this
        }

        throw new Error("Unsupported type in writeObject")
    }
    readObject(bytes1?:1|2|3|4,bytes2?:1|2|3|4): any {
        const type = this.readUint8()

        switch (type) {
            case 0: return null
            case 1:
                return this.readUint8() === 1
            case 2:
                return this.readFloat64()
            case 3:
                return this.readString(bytes2)
            case 4:
                return this.readArray(s => s.readObject(bytes1,bytes2), 3)
            case 5:
                return this.readStringDict(s => s.readObject(bytes1,bytes2), 3)
        }

        throw new Error("Invalid type in readObject")
    }
    writeObjectAdvanced(obj: any, settings:{arr_len?:1|2|3|4,str_len?:1|2|3|4,keys_len?:1|2|3|4} = {}): this {
        const t = typeof obj

        if (obj === null) {
            this.writeUint8(0)
            return this
        }

        switch (t) {
            case "undefined":
                this.writeUint8(1)
                break
            case "number":
                if (Number.isInteger(obj)) {
                    this.writeUint8(2)
                    this.writeInt32(obj)
                } else {
                    this.writeUint8(3)
                    this.writeFloat32(obj)
                }
                break
            case "bigint":
                this.writeUint8(4)
                this.writeInt64(obj)
                break
            case "string":
                this.writeUint8(5)
                this.writeString(obj, settings.str_len ?? 2)
                break
            case "boolean":
                this.writeUint8(6)
                this.writeUint8(obj ? 1 : 0)
                break
            case "object":
                if (v3.is_vec3(obj)) {
                    this.writeUint8(7)
                    this.writeFloat32(obj.x)
                    this.writeFloat32(obj.y)
                    this.writeFloat32(obj.z)
                }else if (v2.is_vec2(obj)) {
                    this.writeUint8(8)
                    this.writeFloat32(obj.x)
                    this.writeFloat32(obj.y)
                }else if (Array.isArray(obj)) {
                    this.writeUint8(254)
                    this.writeArray(obj, (v) => this.writeObjectAdvanced(v, settings), settings.arr_len ?? 2)
                }else{
                    this.writeUint8(255)
                    const keys = Object.keys(obj)
                    const lenBytes = settings.keys_len??2
                    switch (lenBytes) {
                        case 1: this.writeUint8(keys.length); break
                        case 2: this.writeUint16(keys.length); break
                        case 3: this.writeUint24(keys.length); break
                        case 4: this.writeUint32(keys.length); break
                    }

                    for (const k of keys) {
                        this.writeString(k, settings.str_len ?? 1)
                        this.writeObjectAdvanced(obj[k], settings)
                    }
                }
                break
        }
        return this
    }
    readObjectAdvanced(settings:{arr_len?:1|2|3|4,str_len?:1|2|3|4,keys_len?:1|2|3|4} = {}): any {
        const type = this.readUint8()
        switch (type) {
            case 0: // null
                return null
            case 1:// undefined
                return undefined
            case 2:// int32
                return this.readInt32()
            case 3:// float32
                return this.readFloat32()
            case 4:// bigint
                return this.readInt64()
            case 5:// string
                return this.readString(settings.str_len ?? 2)
            case 6:// boolean
                return this.readUint8() === 1
            case 7:// vec3
                return v3(
                    this.readFloat32(),
                    this.readFloat32(),
                    this.readFloat32()
                )
            case 8:// vec2
                return v2(
                    this.readFloat32(),
                    this.readFloat32()
                )
            case 254:{// array
                return this.readArray(
                    (s) => s.readObjectAdvanced(settings),
                    settings.arr_len ?? 2
                )
            }
            case 255:{// object
                let len = 0
                const lenBytes = settings.keys_len ?? 2
                switch (lenBytes) {
                    case 1: len = this.readUint8(); break
                    case 2: len = this.readUint16(); break
                    case 3: len = this.readUint24(); break
                    case 4: len = this.readUint32(); break
                }
                const obj: Record<string, any> = {}
                for (let i = 0; i < len; i++) {
                    const key = this.readString(settings.str_len ?? 1)
                    obj[key] = this.readObjectAdvanced(settings)
                }
                return obj
            }
        }

        throw new Error("Invalid type in readObjectAdvanced: " + type)
    }
    /**
     * Copies a section of a stream into this one. By default, the entire source stream is read and copied
     * @param src The ByteStream to copy from
     * @param offset The offset to start copying from. Undefined behavior occurs if this is not a positive
     * integer strictly less than the length of `src`'s buffer
     * @param length How many bytes, starting from the given offset, to copy. Undefined behavior
     * occurs if this is not a positive integer such that `offset + length` is smaller than the length of `src`'s buffer
     */
    writeStream(src: NetStream, offset = 0, length = src.index - offset): this {
        this._u8Array.set(src._u8Array.subarray(offset, offset + length), this.index);
        this.index += length;
        if(this.index>this.length)this.length=this.index
        return this;
    }
    /**
     * Copies a section of a stream into this one. By default, the entire source stream is read and copied
     * @param src The ByteStream to copy from
     * @param offset The offset to start copying from. Undefined behavior occurs if this is not a positive
     * integer strictly less than the length of `src`'s buffer
     * @param length How many bytes, starting from the given offset, to copy. Undefined behavior
     * occurs if this is not a positive integer such that `offset + length` is smaller than the length of `src`'s buffer
     */
    writeStreamDynamic(src: NetStream): this {
        this.writeUint24(src.length)
        this._u8Array.set(src._u8Array.subarray(0, src.length), this.index);
        this.index += src.length;
        if(this.index>this.length)this.length=this.index
        return this;
    }
    /**
     * Copies a section of a stream into this one. By default, the entire source stream is read and copied
     * @param src The ByteStream to copy from
     * @param offset The offset to start copying from. Undefined behavior occurs if this is not a positive
     * integer strictly less than the length of `src`'s buffer
     * @param length How many bytes, starting from the given offset, to copy. Undefined behavior
     * occurs if this is not a positive integer such that `offset + length` is smaller than the length of `src`'s buffer
     */
    readStreamDynamic(): NetStream {
        const len = this.readUint24();
        const stream = new NetStream(this._view.buffer as ArrayBuffer, this.index, len);
        this.index += len; // <== ESSENCIAL
        return stream;
    }

    /**
     * Writes a {@link Vec2} object to the stream. Undefined behavior occurs if either `[minX, maxX]` or `[minY, maxY]` is degenerate.
     * Otherwise, both intervals are inclusive
     * @param vector The vector to write. Undefined behavior occurs if either component is out-of-bounds
     * @param minX The smallest x value
     * @param minY The largest x value
     * @param maxX The smallest y value
     * @param maxY The largest y value
     * @param bytes The number of bytes to use
     */
    writeVec2(
        vector: Vec2,
        minX: number, minY: number,
        maxX: number, maxY: number,
        bytes: 1 | 2 | 3 | 4
    ): this {
        this.writeFloat(vector.x, minX, maxX, bytes);
        this.writeFloat(vector.y, minY, maxY, bytes);
        return this;
    }
    /**
     * Reads a {@link Vec2} object from the stream. Undefined behavior occurs if either `[minX, maxX]` or `[minY, maxY]` is degenerate.
     * Otherwise, both intervals are inclusive
     * @param minX The smallest x value
     * @param minY The largest x value
     * @param maxX The smallest y value
     * @param maxY The largest y value
     * @param bytes The number of bytes to use
     */
    readVec2(
        minX: number, minY: number,
        maxX: number, maxY: number,
        bytes: 1 | 2 | 3 | 4
    ): Vec2 {
        return {
            x: this.readFloat(minX, maxX, bytes),
            y: this.readFloat(minY, maxY, bytes)
        };
    }
    writePolarMov2(move:PolarMovement):this{
        this.writeRad(move.dir);
        this.writeFloat(move.scale,0,1,1);
        return this;
    }
    readPolarMov2():PolarMovement{
        return {
            dir: this.readRad(),
            scale: this.readFloat(0,1,1)
        };
    }
    writePos2(vector: Vec2):this{
        this.writeFloat32(vector.x);
        this.writeFloat32(vector.y);
        return this;
    }
    readPos2(): Vec2 {
        return {
            x: this.readFloat32(),
            y: this.readFloat32()
        };
    }
    writeID(id: ID):this{
        this.writeUint24(id);
        return this;
    }
    readID(): ID {
        return this.readUint24()
    }

    writeRad(val: number):this{
        this.writeFloat(val,(-Math.PI)*2,Math.PI*2,3);
        return this;
    }
    readRad(): ID {
        return this.readFloat((-Math.PI)*2,Math.PI*2,3);
    }

    writeHitbox(hb:Hitbox2D){
        this.writeUint8(hb.type)
        hb.encode(this)
    }
    readHitbox():Hitbox2D{
        switch(this.readUint8() as HitboxType2D){
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
    writeKDate(kdate: KDate): this {
        this.writeUint8(kdate.second)
        this.writeUint8(kdate.minute)
        this.writeUint8(kdate.hour)

        this.writeUint8(kdate.day)
        this.writeUint8(kdate.month)
        
        this.writeUint16(kdate.year)
        return this;
    }

    readKDate(): KDate {
        return {
            second: this.readUint8(),
            minute: this.readUint8(),
            hour:   this.readUint8(),

            day:    this.readUint8(),
            month:  this.readUint8(),

            year:   this.readUint16()
        };
    }
}