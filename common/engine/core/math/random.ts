import { type DegAngle, type RadAngle } from "./geometry.ts";
import { type ID } from "./utils.ts";
import { type Vec2 } from "./vec2.ts";

export interface WeightDefinition{
    weight:number
}
export interface MinMax1{
    min:number
    max:number
}
export type Random1=MinMax1|number
export const random=Object.freeze({
    int(min:number,max:number):number{
        return Math.floor(Math.random()*(max-min+1)+min)
    },
    float(min:number,max:number):number{
        return Math.random()*(max-min)+min
    },
    choose<Val>(val:Val[]):Val{
        return val[Math.floor(Math.random()*val.length)]
    },
    id():ID{
        return Math.floor(Math.random() * 16777214)+1
    },
    rad():RadAngle{
        return Math.random()*(Math.PI-(-Math.PI))+(-Math.PI)
    },
    deg():DegAngle{
        return this.int(-180,180)
    },
    random_in_circle(radius:number):Vec2{
        const len=this.float(0,radius)
        const angle=this.rad()
        return {x:Math.cos(angle)*len,y:Math.sin(angle)*len}
    },
    weight<Item>(items:Item[], weights:number[]) {
        if(items.length===1)return items[0]
        const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
        let randomNum = Math.random() * totalWeight;
        
        for (let i = 0; i < items.length; i++) {
            if (randomNum < weights[i]) {
                return items[i];
            }
            randomNum -= weights[i];
        }
    },
    weight2<TP extends WeightDefinition>(items:TP[]) {
        if(items.length===1)return items[0]
        const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
        let randomNum = Math.random() * totalWeight;
    
        for (const item of items) {
            if (randomNum < item.weight) {
                return item;
            }
            randomNum -= item.weight;
        }
    },
    random1(val:Random1):number{
        return typeof val==="number"?val:this.float(val.min,val.max)
    },
    irandom1(val:Random1):number{
        return typeof val==="number"?val:this.int(val.min,val.max)
    },
    code(n:number,chars:string="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"){
        let out=""
        for(let i=0;i<n;i++){
            out+=chars[random.int(0,chars.length-1)]
        }
        return out
    }
})
export class SeededRandom {
    private _rng: number;
    seed: number;

    constructor(seed: number) {
        this.seed = seed;
        this._rng = seed;
    }
    private next(): number {
        this._rng = (this._rng * 16807) % 2147483647;
        return this._rng / 2147483647;
    }
    float(min = 0, max = 1): number {
        return this.next() * (max - min) + min;
    }
    int(min: number, max: number): number {
        return Math.floor(this.float(min, max + 1));
    }
    choose<T>(arr: T[]): T {
        return arr[this.int(0, arr.length - 1)];
    }
    id(): ID {
        return this.int(1, 16777214);
    }

    rad(): RadAngle {
        return this.float(-Math.PI, Math.PI);
    }
    deg(): DegAngle {
        return this.int(-180, 180);
    }

    random_in_circle(radius: number): Vec2 {
        const len = this.float(0, radius);
        const angle = this.rad();
        return {
            x: Math.cos(angle) * len,
            y: Math.sin(angle) * len
        };
    }
    weight<Item>(items: Item[], weights: number[]): Item {
        if (items.length === 1) return items[0];

        const total = weights.reduce((a, b) => a + b, 0);
        let r = this.float(0, total);

        for (let i = 0; i < items.length; i++) {
            if (r < weights[i]) return items[i];
            r -= weights[i];
        }

        return items[items.length - 1];
    }
    weight2<T extends WeightDefinition>(items: T[]): T {
        if (items.length === 1) return items[0];

        const total = items.reduce((a, b) => a + b.weight, 0);
        let r = this.float(0, total);

        for (const item of items) {
            if (r < item.weight) return item;
            r -= item.weight;
        }

        return items[items.length - 1];
    }

    random1(val: Random1): number {
        return typeof val === "number" ? val : this.float(val.min, val.max);
    }
    irandom1(val: Random1): number {
        return typeof val === "number" ? val : this.int(val.min, val.max);
    }

    code(n:number,chars:string="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"){
        let out=""
        for(let i=0;i<n;i++){
            out+=chars[this.int(0,chars.length)]
        }
        return out
    }

    set_seed(seed: number) {
        this.seed = seed;
        this._rng = seed;
    }
    reset() {
        this._rng = this.seed;
    }
}