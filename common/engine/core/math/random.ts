import { type DegAngle, type RadAngle } from "./geometry.ts";
import { Numeric, type ID } from "./utils.ts";

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
    weight<Item>(items:Item[], weights:number[]) {
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
    }
})
export class SeededRandom {
    private _rng = 0;
    seed:number=0

    constructor(seed: number) {
        this._rng = seed;
        this.seed=seed
    }

    /**
     * @param [min = 0] min value (included)
     * @param [max = 1] max value (excluded)
     */
    float(min = 0, max = 1): number {
        this._rng = this._rng * 16807 % 2147483647;
        return Numeric.lerp(min, max, this._rng / 2147483647);
    }

    /**
     * @param [min = 0] min value (included)
     * @param [max = 1] max value (excluded)
     */
    int(min = 0, max = 1): number {
        return Math.round(this.float(min, max));
    }
    
    random1(val:Random1):number{
        return typeof val==="number"?val:this.float(val.min,val.max)
    }
    irandom1(val:Random1):number{
        return typeof val==="number"?val:this.int(val.min,val.max)
    }
    weight(weights: number[]): number {
        const totalWeight = weights.reduce((a, b) => a + b, 0);
        let r = this.float(0, totalWeight);
        for (let i = 0; i < weights.length; i++) {
        if (r < weights[i]) return i;
        r -= weights[i];
        }
        return weights.length - 1;
    }
    choose<TP>(array:TP[]):TP{
        return array[Numeric.clamp(this.int(0,array.length-1),0,array.length-1)]
    }
    set_seed(seed:number){
        this._rng=this.seed
        this.seed=seed
    }
    reset(){
        this._rng=this.seed
    }
}