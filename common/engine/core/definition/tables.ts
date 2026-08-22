import { type AbstractGame } from "../game/game.ts";
import { random, type WeightDefinition } from "../math/random.ts";

export type LootTableItem<Aditional>={
    table?:LootTable<Aditional>
    item?:string
    count?:number
}&WeightDefinition&Aditional
interface LootTableObject<Aditional>{
    min:number
    max:number
    content:LootTableItem<Aditional>[]
}
export type LootTableGetItemCallback<TP,LootAditional,Settings>=(id:string,count:number,aditional:LootAditional,settings:Settings,game:AbstractGame<any>)=>TP[]
export type LootTable<Aditional>=string|LootTableObject<LootTableItem<Aditional>>|LootTableItem<Aditional>[]|LootTableItem<Aditional>[][]
export class LootTablesManager<TP,LootAditional,Settings>{
    tables:Map<string,LootTable<LootAditional>>=new Map()
    get_item:LootTableGetItemCallback<TP,LootAditional,Settings>
    constructor(get_item:LootTableGetItemCallback<TP,LootAditional,Settings>){
        this.get_item=get_item
    }
    add_loot_table(name:string,table:LootTable<LootAditional>){
        this.tables.set(name,table)
    }
    add_tables(tables:Record<string,LootTable<LootAditional>>){
        for(const t of Object.keys(tables)){
            this.tables.set(t,tables[t])
        }
    }
    get_loot_from_item(item:LootTableItem<LootAditional>,settings:Settings,game:AbstractGame<any>,aditional?:LootAditional,table?:string):TP[]{
        const ret:TP[]=[]
        if(aditional)aditional={...aditional,...item}
        else aditional=item
        const count=item.count??1
        if(item.item){
            ret.push(...this.get_item(item.item,count,aditional,settings,game))
        }
        if(item.table&&item.table!==table){
            for(let i=0;i<count;i++){
                ret.push(...this.get_loot(item.table,settings,game))
            }
        }
        return ret
    }
    get_loot(table:LootTable<LootAditional>,settings:Settings,game:AbstractGame<any>,aditional?:LootAditional,table_name?:string):TP[]{
        const lt=typeof table==="string"?this.tables.get(table):table
        if(!table_name&&typeof table==="string")table_name=table
        if(!lt){
            return []
        }
        const rand=random
        const multiLoot=Array.isArray(lt)&&lt.length>0&&Array.isArray(lt[0])
        if(Array.isArray(lt)&&!multiLoot){
            const obj=rand.weight2(lt as LootTableItem<LootAditional>[])
            if(obj)return this.get_loot_from_item(obj,settings,game,aditional,table_name)
        }else if(multiLoot){
            const ret:TP[]=[]
            for(const slt of (lt as LootTableItem<LootAditional>[][])){
                const obj=rand.weight2(slt)
                if(obj)ret.push(...this.get_loot_from_item(obj,settings,game,aditional,table_name))
            }
            return ret
        }else{
            const ret:TP[]=[]
            const count=rand.int((lt as LootTableObject<LootAditional>).min,(lt as LootTableObject<LootAditional>).max)
            for(let i=0;i<count;i++){
                const obj=rand.weight2((lt as LootTableObject<LootAditional>).content)
                if(obj)ret.push(...this.get_loot_from_item(obj,settings,game,aditional,table_name))
            }
            return ret
        }
        return []
    }
    clear(){
        this.tables.clear()
    }
}