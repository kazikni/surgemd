import { SignalManager, type ID } from "../math/utils.ts"
import { NetStream } from "../net/stream.ts";
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
    public registred:boolean=false

    public id!:GameObjectID
    public layer!:number


    allow_tick:boolean=false
    allow_physics_update:boolean=false
    allow_net_update:boolean=false
    allow_render:boolean=false

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

    update_hitbox():void{
        this.hitbox=this.base_hitbox.transform(this._position)
        if(this.manager?.cells)this.manager.cells.dirty_objects.add(this)
    }
    to_rect():Rect{
        return this.hitbox.to_rect()
    }

    on_encode(stream:NetStream,full:boolean,options?:any):void{}
    on_decode(stream:NetStream,full:boolean):void{}

    on_create(_args:any):void{}
    on_registry():void{}
    on_layer_set():void{}
    on_tick(_dt:number):void{}
    on_physics_tick(_dt:number):void{}
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
export interface Layer2D<GameObject extends BaseObject2D> {
    //objects:Record<GameObjectID,GameObject>
    orden:number[]
    ticks:number[]
    physics_update:number[]
    net_update:number[]
    render:number[]
}
export type MakeObjectCallback<GameObject extends BaseObject2D>=(_id:number,_layer:number,_type:number)=>GameObject|undefined
export class GameObjectManager2D<GameObject extends BaseObject2D>{
    cells:CellsManager2D<GameObject>

    layers:Record<number,Layer2D<GameObject>>={}
    layers_orden:number[]=[]

    objects:Record<number,GameObject>={}
    full_dirty_objects:Record<number,GameObject>={}
    part_dirty_objects:Record<number,GameObject>={}
    news_queue:Set<GameObject>=new Set()
    destroy_queue:GameObject[]=[]

    make_object:MakeObjectCallback<GameObject>

    stream_cache?:NetStream
    constructor(cell_size?:number,make_object:MakeObjectCallback<GameObject>=(_a,_b,_c)=>{return undefined}){
        this.cells=new CellsManager2D(cell_size)
        this.make_object=make_object
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
    add_object(obj: GameObject,layer: number,id?: number,args: any={},sv: Record<string, any> = {}): GameObject {
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
        return obj
    }
    registry_object(obj: GameObject){
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
        let idx=-1

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
        this.unregister_object(obj)
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
    proccess_object(stream:NetStream):GameObject|undefined{
        const b=stream.readBooleanGroup()
        if(b[0]||b[1]||b[2]){
            const oid=stream.readID()
            const layer=stream.readInt8()
            if(!this.layers[layer]){
                this.add_layer(layer)
            }
            const tp=stream.readUint8()
            let obj=this.objects[oid]
            if(b[3]&&!obj&&!b[2]){
                const obb=this.make_object(oid,layer,tp)
                if(!obb)return
                obj=obb
                this.add_object(obj,layer,oid)
            }
            if(!obj)return
            obj.is_new=b[4]
            if(obj){
                if(obj.layer!==layer){
                    this.set_layer(obj,layer)
                }
                if(b[0]||b[1]){
                    obj.on_decode(stream,b[1])
                }
                if(b[2]){
                    if(obj.net_sync_deletion)obj.destroy()
                    else obj.on_destroy()
                }
                return obj
            }
        }
    }
    proccess_all(stream:NetStream):GameObject[]{
        const ret:GameObject[]=[]

        const ls = stream.readID()
        for(let l=0;l<ls;l++){
            const obj=this.proccess_object(stream)
            if(obj)ret.push(obj)
        }

        return ret
    }
    proccess_list(stream:NetStream,process_deletion:boolean=false):GameObject[]{
        const ret:GameObject[]=[]

        let os=stream.readUint16()
        for(let i=0;i<os;i++){
            const obj=this.proccess_object(stream)
            if(obj)ret.push(obj)
        }
        os=stream.readUint16()
        for(let i=0;i<os;i++){
            const id=stream.readID()
            if(process_deletion&&this.objects[id]){
                const obj=this.objects[id]
                if(obj.net_sync_deletion)obj.destroy()
                else obj.on_destroy()
            }
        }
        return ret
    }
    proccess(stream:NetStream,process_deletion:boolean){
        const tp=stream.readUint8()
        if(tp===100){
            return this.proccess_all(stream)
        }else if(tp===200){
            return this.proccess_list(stream,process_deletion)
        }
    }
    encode_object(object:GameObject,full:boolean,stream:NetStream,options:any){
        const bools=[
            (full||this.part_dirty_objects[object.id])&&object.net_sync_dirty, //Dirty Part
            (full||this.full_dirty_objects[object.id])&&object.net_sync_dirty, //Dirty Full
            object.destroyed&&object.net_sync_deletion, //Dirty Deletion
            object.net_sync_creation, //Dirty Creation
            object.is_new
        ]
        stream.writeBooleanGroup(bools[0],bools[1],bools[2],bools[3],bools[4])
        if(bools[0]||bools[1]||bools[2]){
            stream.writeID(object.id)
            stream.writeInt8(object.layer)
            stream.writeUint8(object.number_type)
            if(bools[0]||bools[1]){
                object.on_encode(stream,bools[1],options)
            }
        }
    }
    encode_all(full:boolean=false,stream?:NetStream):NetStream{
        if(!stream){
            if(!this.stream_cache)this.stream_cache=new NetStream(new ArrayBuffer(1024*50))
            stream=this.stream_cache
            this.stream_cache.clear()
        }
        stream.writeUint8(100) // All Encode
        const list:GameObject[]=full?Object.values(this.objects):[...Object.values(this.part_dirty_objects),...Object.values(this.full_dirty_objects)]
        stream.writeID(list.length)
        for(const obj of list){
            this.encode_object(obj,full,stream,null)
        }
        return stream
    }
    encode_list(objects:GameObject[],last_list:GameObject[],force_full:boolean=false,object_options?:(obj:GameObject)=>any,stream?:NetStream):{last:GameObject[],strm:NetStream}{
        if(!stream){
            if(!this.stream_cache)this.stream_cache=new NetStream(new ArrayBuffer(1024*50))
            stream=this.stream_cache
            this.stream_cache.clear()
        }
        stream.writeUint8(200) // List Encode

        const list:[GameObject,boolean][]=[]
        objects.forEach((v)=>{
            const full=force_full||this.full_dirty_objects[v.id]!==undefined||!last_list.includes(v)
            if(full||this.part_dirty_objects[v.id])list.push([v,full])
        })

        stream.writeUint16(list.length)
        for(const o of list){
            this.encode_object(o[0],o[1],stream,object_options?object_options(o[0]):null)
        }

        // Destroy Queue
        const deletions: GameObject[] = []
        for (const obj of last_list){
            if (obj.net_sync_deletion && !objects.includes(obj))deletions.push(obj)
        }
        stream.writeUint16(deletions.length)
        for(let i=0;i<deletions.length;i++){
            stream.writeID(deletions[i].id)
        }

        return {strm:stream,last:objects}
    }
    tick(dt:number){
        for(const l of this.layers_orden){
            for(const o of this.layers[l].ticks){
                const obj=this.objects[o]
                if(obj.destroyed)continue
                try{
                    obj.on_tick(dt)
                }catch(err){
                    console.error(err)
                }
                if(this.cells.dirty_objects.has(obj)){
                    this.cells.update_object(obj)
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