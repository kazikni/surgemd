import { type ID } from "../math/utils.ts"
import { DynamicStream, Stream } from "../net/stream.ts";
import { random } from "../math/random.ts";
import { v2, v2m, Vec2, Vec2M } from "../math/vec2.ts";
import { Hitbox2D, NullHitbox2D } from "../math/hitbox.ts";
import { hash } from "../math/hash.ts";
import { Rect } from "../math/geometry.ts";
export type GameObjectID=ID
export abstract class BaseObject2D{
    abstract number_type:number
    abstract string_type:string

    // Physical
    public hitbox:Hitbox2D
    public _base_hitbox:Hitbox2D
    get base_hitbox():Hitbox2D{
        return this._base_hitbox
    }
    set base_hitbox(v:Hitbox2D){
        this._base_hitbox=v
        this.update_hitbox()
    }

    public _position:Vec2M
    get position():Vec2{
        return this._position
    }
    set position(v:Vec2){
        this._position.set(v.x,v.y)
    }

    public destroyed:boolean=false
    public deleted:boolean=false
    public registred:boolean=false

    public id!:GameObjectID
    public layer!:number


    allow_tick:boolean=false
    allow_physics_update:boolean=false
    allow_net_update:boolean=false
    allow_render:boolean=false
    allow_checkpoint:boolean=true

    net_sync_deletion:boolean=true
    net_sync_dirty:boolean=true
    net_sync_creation:boolean=true

    physics_frozen:boolean=false
    is_new:boolean=true

    // deno-lint-ignore no-explicit-any
    public manager!:GameObjectManager2D<any>

    constructor(){
        this._position=new Vec2M(0,0,this.update_hitbox.bind(this))
        this._base_hitbox=new NullHitbox2D(v2(0,0))
        this.hitbox=this.base_hitbox.transform(this._position)
    }

    tick(dt:number){
        if(this.destroyed)return
        this.on_tick(dt)
        if(this.manager.cells.dirty_objects.has(this)){
            this.manager.cells.update_object(this)
        }
    }

    update_hitbox():void{
        this.hitbox=this.base_hitbox.transform(this._position)
        if(this.manager?.cells)this.manager.cells.dirty_objects.add(this)
    }
    to_rect():Rect{
        return this.hitbox.to_rect()
    }

    on_encode_net(stream:Stream,full:boolean,options?:any):void{}
    on_decode_net(stream:Stream,full:boolean):void{}

    on_encode_checkpoint(stream: Stream,ctx:CheckpointContext): void {}
    on_decode_checkpoint(stream: Stream,ctx:CheckpointContext): void {}

    on_create(_args:any):void{}
    on_registry():void{}
    on_layer_set():void{}
    on_tick(_dt:number):void{}
    on_physics_tick(_dt:number):void{}
    on_render(_dt:number):void{}
    on_net_update():void{}
    on_destroy():void{}

    destroy():void{
        if(this.destroyed||!this.manager)return
        this.destroyed=true
        this.manager.destroy_queue.push(this)
    }

    set_dirty_part(){
        this.manager.part_dirty_objects[this.id]=this
    }
    set_dirty_full(){
        this.manager.full_dirty_objects[this.id]=this
    }
}
export class CellsManager2D<GameObject extends BaseObject2D = BaseObject2D> {
    cell_size: number;
    cells: Map<bigint,GameObject[]> = new Map();
    object_cells: Map<number, bigint[]> = new Map();

    dirty_objects:Set<GameObject>=new Set()

    constructor(cell_size = 5) {
        this.cell_size = cell_size;
    }

    update(){
        for(const o of this.dirty_objects){
            this.update_object(o)
        }
        this.dirty_objects.clear()
    }

    cell_pos(pos: Vec2) {
        v2m.dscale(pos,pos,this.cell_size)
        v2m.floor(pos)
    }

    registry(obj: GameObject) {
        this.dirty_objects.add(obj)
    }

    unregistry(obj: GameObject) {
        this.remove_object_from_cells(obj);
    }

    clear() {
        this.cells.clear()
        this.object_cells.clear()
        this.dirty_objects.clear()
    }
    private remove_object_from_cells(obj: GameObject) {
        this.dirty_objects.delete(obj)
        const keys=this.object_cells.get(obj.id)
        if (!keys)return
        for (const key of keys) {
            const arr = this.cells.get(key)
            if (!arr) continue
            const idx = arr.indexOf(obj)
            if (idx !== -1) arr.splice(idx, 1)
            if (arr.length === 0) {
                this.cells.delete(key)
            }
        }
        this.object_cells.delete(obj.id)
    }

    update_object(obj: GameObject) {
        this.remove_object_from_cells(obj)

        const rect = obj.to_rect()
        this.cell_pos(rect.min)
        this.cell_pos(rect.max)

        if(!this.object_cells.has(obj.id)){
            this.object_cells.set(obj.id, [])
        }
        this.object_cells.get(obj.id)!.length=0
        for (let y = rect.min.y; y <= rect.max.y; y++) {
            for (let x = rect.min.x; x <= rect.max.x; x++) {
                const key=hash.hash_3d_big(x,y,obj.layer)
                if(!this.cells.has(key))this.cells.set(key,[])
                this.cells.get(key)!.push(obj)
                this.object_cells.get(obj.id)!.push(key)
            }
        }
    }
    get_objects(hitbox: Hitbox2D, layer: number): GameObject[] {
        const rect = hitbox.to_rect()
        this.cell_pos(rect.min)
        this.cell_pos(rect.max)
        const results:GameObject[] = []
        for (let y = rect.min.y; y <= rect.max.y; y++) {
            for (let x = rect.min.x; x <= rect.max.x; x++) {
                const objects=this.cells.get(hash.hash_3d_big(x,y,layer))
                if(objects){
                    for(const obj of objects){
                        if(!results.includes(obj))results.push(obj);
                    }
                }
            }
        }
        return results
    }
    get_objects_layers(hitbox: Hitbox2D, layers: number[]): GameObject[] {
        const rect = hitbox.to_rect()
        this.cell_pos(rect.min)
        this.cell_pos(rect.max)

        const results: GameObject[] = []
        const visited = new Set<GameObject>()

        for (const layer of layers) {
            for (let y = rect.min.y; y <= rect.max.y; y++) {
                for (let x = rect.min.x; x <= rect.max.x; x++) {
                    const objects=this.cells.get(hash.hash_3d_big(x,y,layer))
                    if(!objects)continue
                    for (const obj of objects) {
                        if (visited.has(obj)) continue
                        visited.add(obj)
                        results.push(obj)
                    }
                }
            }
        }

        return results
    }
    ray(origin: Vec2, dest: Vec2, layer?: number, stopOnFirst: boolean = false): GameObject[] {
        const results: GameObject[] = []
        const tested = new Set<GameObject>()

        const dx = dest.x - origin.x
        const dy = dest.y - origin.y

        const maxDist = Math.sqrt(dx * dx + dy * dy)
        if (maxDist < 1e-6) return results

        const invLen = 1 / maxDist
        const dirX = dx * invLen
        const dirY = dy * invLen

        let cx = Math.floor(origin.x / this.cell_size)
        let cy = Math.floor(origin.y / this.cell_size)

        const endX = Math.floor(dest.x / this.cell_size)
        const endY = Math.floor(dest.y / this.cell_size)

        const stepX = dirX >= 0 ? 1 : -1
        const stepY = dirY >= 0 ? 1 : -1

        const cellSize = this.cell_size

        const tDeltaX = dirX !== 0 ? Math.abs(cellSize / dirX) : Infinity
        const tDeltaY = dirY !== 0 ? Math.abs(cellSize / dirY) : Infinity

        let tMaxX: number
        let tMaxY: number

        if (dirX === 0) {
            tMaxX = Infinity
        } else {
            const boundaryX = (cx + (dirX > 0 ? 1 : 0)) * cellSize
            tMaxX = (boundaryX - origin.x) / dirX
        }

        if (dirY === 0) {
            tMaxY = Infinity
        } else {
            const boundaryY = (cy + (dirY > 0 ? 1 : 0)) * cellSize
            tMaxY = (boundaryY - origin.y) / dirY
        }

        while (true) {
            if (layer !== undefined) {
                const key = hash.hash_3d_big(cx, cy, layer)
                const objects = this.cells.get(key)

                if (objects) {
                    for (const obj of objects) {
                        if (tested.has(obj)) continue
                        tested.add(obj)

                        if (obj.hitbox.colliding_with_line(origin, dest)) {
                            results.push(obj)
                        }
                    }
                }
            } else {
                for (const [key, objects] of this.cells) {
                    for (const obj of objects) {
                        if (tested.has(obj)) continue
                        tested.add(obj)

                        if (obj.hitbox.colliding_with_line(origin, dest)) {
                            results.push(obj)
                        }
                    }
                }
            }

            if (stopOnFirst && results.length > 0) {
                let best = results[0]
                let bestDist = v2.distanceSquared(origin, best.position)

                for (let i = 1; i < results.length; i++) {
                    const d = v2.distanceSquared(origin, results[i].position)
                    if (d < bestDist) {
                        best = results[i]
                        bestDist = d
                    }
                }

                return [best]
            }

            if (cx === endX && cy === endY) break

            if (tMaxX < tMaxY) {
                if (tMaxX > maxDist) break
                cx += stepX
                tMaxX += tDeltaX
            } else {
                if (tMaxY > maxDist) break
                cy += stepY
                tMaxY += tDeltaY
            }
        }

        return results
    }
}
export type CheckpointSettings={
    save_id?:boolean
    blacklist?:(number|string)[]
    orden?:(number|string)[]
}
export type CheckpointContext={
    idco:Record<number,number> // Record<ObjectID, CheckpointObjectID>
    coid:Record<number,number> // Record<CheckpointObjectID, ObjectID>
}
export interface Layer2D<GameObject extends BaseObject2D> {
    //objects:Record<GameObjectID,GameObject>
    orden:number[]
    ticks:number[]
    physics_update:number[]
    net_update:number[]
    render:number[]
}
export type MakeObjectCallback<GameObject extends BaseObject2D>=(id:number,layer:number,type:number)=>GameObject|undefined
export type MakeObjectCheckpointCallback<GameObject extends BaseObject2D>=(stream:Stream,id:number|undefined,layer:number,type:number)=>GameObject|undefined
export class GameObjectManager2D<GameObject extends BaseObject2D>{
    cells:CellsManager2D<GameObject>

    layers:Record<number,Layer2D<GameObject>>={}
    layers_orden:number[]=[]

    objects:Record<number,GameObject>={}
    full_dirty_objects:Record<number,GameObject>={}
    part_dirty_objects:Record<number,GameObject>={}
    news_queue:Set<GameObject>=new Set()
    destroy_queue:GameObject[]=[]

    make_object_net:MakeObjectCallback<GameObject>
    make_object_checkpoint:MakeObjectCheckpointCallback<GameObject>

    stream_cache?:Stream
    constructor(cell_size?:number,make_object_net:MakeObjectCallback<GameObject>=(_a,_b,_c)=>{return undefined},make_object_checkpoint:MakeObjectCheckpointCallback<GameObject>=(_a,_b,_c,_d)=>{return undefined}){
        this.cells=new CellsManager2D(cell_size)
        this.make_object_net=make_object_net
        this.make_object_checkpoint=make_object_checkpoint
    }
    clear(){
        for(const obj in this.objects){
            this.objects[obj].on_destroy()
            this.objects[obj].registred=false
            this.objects[obj].destroyed=true
        }

        this.layers={}
        this.objects={}
        this.full_dirty_objects={}
        this.part_dirty_objects={}
        this.news_queue.clear()
        this.destroy_queue.length=0
        this.layers_orden.length=0

        this.cells.clear()
    }
    set_layer(obj: GameObject, new_layer: number) {
        if (!obj.registred) return
        if (obj.layer === new_layer) return
        this.unregister_object(obj)
        obj.layer=new_layer
        this.registry_object(obj)
        obj.on_layer_set()
    }
    generate_object_id():number{
        let ret=0
        do {
            ret = random.id()
        } while (this.objects[ret])
        return ret
    }
    // deno-lint-ignore no-explicit-any
    add_object(obj: GameObject,layer: number,id?: number,args: any=undefined,sv: Record<string, any> = {}): GameObject {
        if (!this.layers[layer]) {
            this.add_layer(layer)
        }
        obj.id=id===undefined?this.generate_object_id():id
        obj.layer = layer
        obj.manager = this
        obj.is_new=true
        for (const key in sv) {
            // deno-lint-ignore ban-ts-comment
            // @ts-ignore
            obj[key] = sv[key]
        }
        this.registry_object(obj)
        obj.on_create(args)
        obj.on_layer_set()
        this.cells.update_object(obj)
        return obj
    }
    registry_object(obj: GameObject){
        obj.destroyed=false
        obj.deleted=false
        const idx=this.destroy_queue.indexOf(obj)
        if(idx!==-1){
            this.destroy_queue.splice(idx,1)
        }
        if(obj.registred)return
        obj.registred=true
        obj.set_dirty_full()

        this.objects[obj.id]=obj
        this.layers[obj.layer].orden.push(obj.id)
        this.cells.registry(obj)

        if(obj.allow_tick){
            this.layers[obj.layer].ticks.push(obj.id)
        }
        if(obj.allow_physics_update){
            this.layers[obj.layer].physics_update.push(obj.id)
        }
        if(obj.allow_render){
            this.layers[obj.layer].render.push(obj.id)
        }
        if(obj.allow_net_update){
            this.layers[obj.layer].net_update.push(obj.id)
        }
        this.cells.update_object(obj)
        obj.on_registry()
    }
    unregister_object(obj:GameObject){
        if(!obj.registred)return
        obj.registred=false
        this.cells.unregistry(obj)
        let idx=this.layers[obj.layer].orden.indexOf(obj.id)
        if(idx>=0)this.layers[obj.layer].orden.splice(idx,1)
        if(obj.allow_tick){
            idx=this.layers[obj.layer].ticks.indexOf(obj.id)
            if(idx>=0)this.layers[obj.layer].ticks.splice(idx,1)
        }
        if(obj.allow_physics_update){
            idx=this.layers[obj.layer].physics_update.indexOf(obj.id)
            if(idx>=0)this.layers[obj.layer].physics_update.splice(idx,1)
        }
        if(obj.allow_net_update){
            idx=this.layers[obj.layer].net_update.indexOf(obj.id)
            if(idx>=0)this.layers[obj.layer].net_update.splice(idx,1)
        }
        if(obj.allow_render){
            idx=this.layers[obj.layer].render.indexOf(obj.id)
            if(idx>=0)this.layers[obj.layer].render.splice(idx,1)
        }
        delete this.objects[obj.id]
    }
    delete_object(obj:GameObject){
        if(!obj.deleted)
        obj.deleted=true
        this.unregister_object(obj)
        obj.on_net_update()
        obj.on_destroy()
    }
    get_object(id:number):GameObject|undefined{
        return this.objects[id]
    }
    exist_object(id:number):boolean{
        return Object.hasOwn(this.objects,id)
    }
    add_layer(layer: number) {
        if (this.layers[layer]) return;
        this.layers[layer] = {
            orden: [],
            ticks:[],
            render:[],
            physics_update:[],
            net_update:[]
        }
        this.layers_orden.push(layer)
    }
    proccess_object_net(stream: Stream): GameObject | undefined {
        const size = stream.read_uint24()
        const start = stream.index
        const end = start + size
        try{
            const b = stream.read_boolean_group()
            if (!(b[0] || b[1] || b[2])) {
                return
            }
            const oid = stream.read_id()
            const layer = stream.read_int8()
            if (!this.layers[layer]) {
                this.add_layer(layer)
            }
            const tp = stream.read_uint8()
            let obj:GameObject|undefined = this.objects[oid]
            if (b[3] && !obj && !b[2]) {
                const obb = this.make_object_net(oid, layer, tp)
                if (obb) {
                    obj = obb
                    if(obj)this.add_object(obj, layer, oid)
                }else{
                    throw new Error(`Cannot create object type=${tp} id=${oid} layer=${layer}`)
                }
            }
            if(!obj){
                throw new Error(`Object ${oid} not found. type=${tp}`)
            }
            obj.is_new = b[4]
            if (obj.layer !== layer) {
                this.set_layer(obj, layer)
            }
            if(b[0]||b[1]) {
                obj.on_decode_net(stream, b[1])
            }
            if(b[2]) {
                if (obj.net_sync_deletion) {
                    obj.destroy()
                } else {
                    obj.on_destroy()
                }
            }
            return obj
        }catch(e){
            console.error(e)
        }finally{
            if(stream.index !== end){
                console.warn(`Size mismatch (${stream.index-start}/${size})`)
            }
            stream.index = start + size
        }
    }
    proccess_all_net(stream:Stream):GameObject[]{
        const ret:GameObject[]=[]

        const ls = stream.read_id()
        for(let l=0;l<ls;l++){
            const obj=this.proccess_object_net(stream)
            if(obj)ret.push(obj)
        }

        return ret
    }
    proccess_list_net(stream:Stream,process_deletion:boolean=false):GameObject[]{
        const ret:GameObject[]=[]

        let os=stream.read_uint16()
        for(let i=0;i<os;i++){
            const obj=this.proccess_object_net(stream)
            if(obj)ret.push(obj)
        }
        os=stream.read_uint16()
        for(let i=0;i<os;i++){
            const id=stream.read_id()
            if(process_deletion&&this.objects[id]){
                const obj=this.objects[id]
                if(obj.net_sync_deletion)obj.destroy()
                else obj.on_destroy()
            }
        }
        return ret
    }
    proccess_net(stream:Stream,process_deletion:boolean,allow_deall:boolean=true){
        const tp=stream.read_uint8()
        const bg=stream.read_boolean_group()
        if(bg[1]&&allow_deall)this.clear()
        if(tp===100){
            return this.proccess_all_net(stream)
        }else if(tp===200){
            return this.proccess_list_net(stream,process_deletion)
        }
    }
    encode_object_net(object:GameObject,full:boolean,stream:Stream,options:any){
        const sizePos = stream.index
        stream.write_uint24(0)
        const start = stream.index

        const bools=[
            (full||this.part_dirty_objects[object.id])&&object.net_sync_dirty, //Dirty Part
            (full||this.full_dirty_objects[object.id])&&object.net_sync_dirty, //Dirty Full
            object.destroyed&&object.net_sync_deletion, //Dirty Deletion
            object.net_sync_creation, //Dirty Creation
            object.is_new
        ]
        stream.write_boolean_group(bools[0],bools[1],bools[2],bools[3],bools[4])
        if(bools[0]||bools[1]||bools[2]){
            stream.write_id(object.id)
            stream.write_int8(object.layer)
            stream.write_uint8(object.number_type)
            if(bools[0]||bools[1]){
                object.on_encode_net(stream,bools[1],options)
            }
        }

        const end = stream.index
        stream.index = sizePos
        stream.write_uint24(end - start)
        stream.index = end
    }
    encode_all_net(force_full:boolean=false,delete_all:boolean=false,stream?:Stream):Stream{
        if(!stream){
            if(!this.stream_cache)this.stream_cache=new DynamicStream()
            stream=this.stream_cache
            this.stream_cache.clear()
        }
        stream.write_uint8(100) // All Encode
        stream.write_boolean_group(force_full,delete_all)
    
        const list:GameObject[]=force_full?Object.values(this.objects):[...Object.values(this.part_dirty_objects),...Object.values(this.full_dirty_objects)]
        stream.write_id(list.length)
        for(const obj of list){
            this.encode_object_net(obj,force_full,stream,null)
        }
        return stream
    }
    encode_list_net(objects:GameObject[],last_list:GameObject[],force_full:boolean=false,delete_all:boolean=false,object_options?:(obj:GameObject)=>any,stream?:Stream):{last:GameObject[],strm:Stream}{
        if(!stream){
            if(!this.stream_cache)this.stream_cache=new DynamicStream()
            stream=this.stream_cache
            this.stream_cache.clear()
        }
        stream.write_uint8(200) // List Encode
        stream.write_boolean_group(force_full,delete_all)

        const list:[GameObject,boolean][]=[]
        objects.forEach((v)=>{
            const full=force_full||this.full_dirty_objects[v.id]!==undefined||!last_list.includes(v)
            if(full||this.part_dirty_objects[v.id])list.push([v,full])
        })

        stream.write_uint16(list.length)
        for(const o of list){
            this.encode_object_net(o[0],o[1],stream,object_options?object_options(o[0]):null)
        }

        // Destroy Queue
        const deletions: GameObject[] = []
        for (const obj of last_list){
            if (obj.net_sync_deletion && !objects.includes(obj))deletions.push(obj)
        }
        stream.write_uint16(deletions.length)
        for(let i=0;i<deletions.length;i++){
            stream.write_id(deletions[i].id)
        }

        return {strm:stream,last:objects}
    }
    encode_checkpoint(stream:Stream,settings:CheckpointSettings={}){
        const save_id=settings.save_id??false
        const blacklist=new Set(settings.blacklist??[])
        const orderMap = new Map<number | string, number>()
        for (const [i, value] of (settings.orden ?? []).entries()) {
            orderMap.set(value, i)
        }
        stream.write_boolean_group(save_id)
        stream.write_uint8(this.layers_orden.length)

        let idx=0
        const ctx:CheckpointContext={
            coid:{},
            idco:{}
        }

        const layers:GameObject[][]=[]

        // Create Objects
        for(const l of this.layers_orden){
            const objects:GameObject[]=[]
            stream.write_uint8(l)
            for(const o of this.layers[l].orden){
                if(this.objects[o]?.allow_checkpoint){
                    if(!blacklist.has(this.objects[o].number_type)&&!blacklist.has(this.objects[o].string_type))objects.push(this.objects[o])
                }
            }
            objects.sort((a, b) => {
                const pa=orderMap.get(a.number_type)??orderMap.get(a.string_type)??Number.MAX_SAFE_INTEGER
                const pb=orderMap.get(b.number_type)??orderMap.get(b.string_type)??Number.MAX_SAFE_INTEGER
                return pa - pb
            })
            stream.write_uint16(objects.length)
            for(const obj of objects){
                if(save_id)stream.write_id(obj.id)
                stream.write_id(idx)
                stream.write_uint8(obj.number_type)
                //.write_boolean_group(obj.is_new)
                ctx.coid[idx]=obj.id
                ctx.idco[obj.id]=idx
                idx++
            }
            layers.push(objects)
        }
        // Apply Object
        for(const layer of layers){
            for(const obj of layer){
                obj.on_encode_checkpoint(stream,ctx)
            }
        }
    }
    proccess_checkpoint(stream:Stream):GameObject[][]{
        this.clear()
        const layers:GameObject[][]=[]
        const boolgroup=stream.read_boolean_group()
        const layers_count=stream.read_uint8()

        const read_id=boolgroup[0]
        const ctx:CheckpointContext={
            coid:{},
            idco:{}
        }
        

        for(let i=0;i<layers_count;i++){
            const objects:GameObject[]=[]
            const layer=stream.read_uint8()
            const obj_len=stream.read_uint16()
            for(let j=0;j<obj_len;j++){
                let id:number|undefined
                if(read_id)id=stream.read_id()
                const co=stream.read_id()
                const tp=stream.read_uint8()
                //const bg=stream.read_boolean_group()
                const obb=this.make_object_checkpoint(stream,id,layer,tp)
                if(!obb)continue
                const obj=this.add_object(obb,layer,id)
                obj.is_new=false

                ctx.coid[co]=obj.id
                ctx.idco[obj.id]=co
                if(obj)objects.push(obj)
            }
            layers.push(objects)
        }
        for(let j=0;j<layers.length;j++){
            for(const obj of layers[j]){
                obj.on_decode_checkpoint(stream,ctx)
            }
        }
        return layers
    }
    tick(dt:number){
        for(const l of this.layers_orden){
            for(const o of this.layers[l].ticks){
                const obj=this.objects[o]
                try{
                    obj.tick(dt)
                }catch(err){
                    console.error(err)
                }
            }
        }
        this.cells.update()
    }
    render(dt:number){
        for(const l of this.layers_orden){
            for(const o of this.layers[l].ticks){
                const obj=this.objects[o]
                try{
                    obj.on_render(dt)
                }catch(err){
                    console.error(err)
                }
            }
        }
        this.cells.update()
    }
    update_to_net(){
        for(const n of this.news_queue.values()){
            n.is_new=false
        }
        this.news_queue.clear()
        for(const id in this.full_dirty_objects){
            if(this.full_dirty_objects[id].is_new){
                if(this.objects[id])this.news_queue.add(this.objects[id])
            }
        }
        this.full_dirty_objects={}
        this.part_dirty_objects={}
        for(const l of this.layers_orden){
            for(const o of this.layers[l].net_update){
                this.objects[o].on_net_update()
            }
        }
    }
    apply_destroy_queue(){
        for(const obj of this.destroy_queue){
            if(!this.objects[obj.id])continue
            this.delete_object(obj)
        }
        this.destroy_queue.length=0
    }
}