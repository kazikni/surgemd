import { type ID } from "../math/utils.ts"
import { NetStream } from "../net/stream.ts";
import { random } from "../math/random.ts";
import { v2, v2m, Vec2, Vec2M } from "../math/vec2.ts";
import { Hitbox2D, NullHitbox2D } from "../math/hitbox.ts";
import { hash } from "../math/hash.ts";
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

    public destroyed:boolean
    public registred:boolean=false

    public id!:GameObjectID
    public layer!:number

    net_sync:{
        full:boolean
        part:boolean
        enabled:{
            deletion:boolean,
            dirty:boolean,
            creation:boolean,
        }
    }={
        full:false,
        part:false,
        enabled:{
            deletion:true,
            creation:true,
            dirty:true,
        },
    }

    is_new:boolean=true
    updatable=true
    visible=true

    // deno-lint-ignore no-explicit-any
    public manager!:GameObjectManager2D<any>

    update_hitbox():void{
        this.hitbox=this.base_hitbox.transform(this._position)
        if(this.manager?.cells)this.manager.cells.dirty_objects.add(this)
    }

    constructor(){
        this._position=new Vec2M(0,0,this.update_hitbox.bind(this))
        this._base_hitbox=new NullHitbox2D(v2(0,0))
        this.hitbox=this.base_hitbox.transform(this._position)
        this.destroyed=false
    }

    encode(stream:NetStream,full:boolean,options?:any):void{}
    decode(stream:NetStream,full:boolean):void{}

    abstract update(dt:number):void
    net_update():void{}
    // deno-lint-ignore no-explicit-any
    abstract create(args:Record<string,any>):void
    on_destroy():void{}
    destroy():void{
        if(this.destroyed)return
        this.destroyed=true
        this.manager.destroy_queue.push(this)
    }
    on_layer_set(layer:number):void{}
    set_layer(layer: number) {
        if (!this.manager) return
        this.manager.set_layer(this as any, layer)
    }
    
    encodeObject(full:boolean,stream:NetStream,options:any){
        const bools=[
            (full||this.net_sync.part)&&this.net_sync.enabled.dirty, //Dirty Part
            (full||this.net_sync.full)&&this.net_sync.enabled.dirty, //Dirty Full
            this.destroyed&&this.net_sync.enabled.deletion, //Dirty Deletion
            this.net_sync.enabled.creation, //Dirty Creation
            this.is_new
        ]
        stream.writeBooleanGroup(bools[0],bools[1],bools[2],bools[3],bools[4])
        if(bools[0]||bools[1]||bools[2]){
            stream.writeID(this.id)
            stream.writeInt8(this.layer)
            stream.writeUint8(this.number_type)
            if(bools[0]||bools[1]){
                this.encode(stream,bools[1],options)
            }
        }
    }
}

export interface Layer2D<GameObject extends BaseObject2D> {
    objects:Record<GameObjectID,GameObject>
    orden:number[]
    updatables:number[]
    renderizables:number[]
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

        const rect = obj.hitbox.to_rect()
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
export class GameObjectManager2D<GameObject extends BaseObject2D>{
    cells:CellsManager2D<GameObject>
    objects:Record<number,Layer2D<GameObject>>={}
    all_objects:Map<number,GameObject>=new Map()
    layers:number[]=[]
    ondestroy:(obj:GameObject)=>void=(_)=>{}
    oncreate:(_id:number,_layer:number,_type:number)=>GameObject|undefined
    destroy_queue:GameObject[]=[]

    stream_cache?:NetStream
    constructor(cellsSize?:number,oncreate?:((_id:number,_layer:number,_type:number)=>GameObject|undefined)){
        this.cells=new CellsManager2D(cellsSize)
        this.oncreate=oncreate??((_k,_t)=>{return undefined})
    }
    clear(){
        for(const obj of this.all_objects.values()){
            obj.on_destroy()
            obj.registred = false
            obj.destroyed = true
        }

        this.objects = {}
        this.all_objects.clear()

        this.layers.length = 0
        this.destroy_queue.length = 0
        this.cells.clear()
    }
    set_layer(obj: GameObject, newLayer: number) {
        if (!obj.registred) return
        if (obj.layer === newLayer) return

        const oldLayer = obj.layer

        if (!this.objects[oldLayer]) return

        const oldLayerData = this.objects[oldLayer]
        delete oldLayerData.objects[obj.id]

        let idx = oldLayerData.orden.indexOf(obj.id)
        if (idx >= 0) oldLayerData.orden.splice(idx, 1)

        idx = oldLayerData.updatables.indexOf(obj.id)
        if (idx >= 0) oldLayerData.updatables.splice(idx, 1)

        idx = oldLayerData.renderizables.indexOf(obj.id)
        if (idx >= 0) oldLayerData.renderizables.splice(idx, 1)

        this.cells.unregistry(obj)

        if (!this.objects[newLayer]) {
            this.add_layer(newLayer)
        }

        const newLayerData = this.objects[newLayer]

        obj.layer = newLayer

        newLayerData.objects[obj.id] = obj
        newLayerData.orden.push(obj.id)

        if (obj.updatable) {
            newLayerData.updatables.push(obj.id)
        }
        if (obj.visible) {
            newLayerData.renderizables.push(obj.id)
        }

        obj.net_sync.full = true
        obj.net_sync.part = true

        this.cells.update_object(obj)

        obj.on_layer_set(obj.layer)
    }
    // deno-lint-ignore no-explicit-any
    add_object(obj: GameObject,layer: number,id?: number,args?: Record<string, any>,sv: Record<string, any> = {},): GameObject {
        if (!this.objects[layer]) {
            this.add_layer(layer);
        }
        if (id === undefined) {
            do {
                id = random.id();
            } while (this.objects[layer].objects[id]);
        }
        obj.id = id;
        obj.layer = layer;

        obj.net_sync.full = true;

        obj.manager = this;
        obj.registred=true

        this.all_objects.set(obj.id,obj)
        this.objects[layer].objects[obj.id] = obj;
        this.objects[layer].orden.push(obj.id);

        for (const key in sv) {
            // deno-lint-ignore ban-ts-comment
            // @ts-ignore
            obj[key] = sv[key];
        }
        obj.create(args ?? {});
        this.cells.registry(obj);

        if(obj.updatable){
            this.objects[layer].updatables.push(obj.id);
        }
        if(obj.visible){
            this.objects[layer].renderizables.push(obj.id);
        }
        obj.on_layer_set(obj.layer)

        this.cells.update_object(obj)
        return obj;
    }
    registry(obj: GameObject){
        if(obj.registred)return

        obj.registred=true
        obj.destroyed=false
        obj.manager = this;

        obj.net_sync.full = true;
        obj.net_sync.part = true;
        obj.is_new=true;

        do {
            obj.id = random.id()
        } while (this.all_objects.has(obj.id))

        this.all_objects.set(obj.id,obj)
        this.objects[obj.layer].objects[obj.id] = obj;
        this.objects[obj.layer].orden.push(obj.id);
        this.cells.registry(obj);

        if(obj.updatable){
            this.objects[obj.layer].updatables.push(obj.id);
        }
        if(obj.visible){
            this.objects[obj.layer].renderizables.push(obj.id);
        }
        
        const idx = this.destroy_queue.indexOf(obj)
        if(idx !== -1) this.destroy_queue.splice(idx,1)

        obj.on_layer_set(obj.layer)
        this.cells.update_object(obj)
    }
    get_object(id:number):GameObject|undefined{
        return this.all_objects.get(id)
    }
    exist(id:number,layer:number):boolean{
        return Object.hasOwn(this.objects,layer)&&Object.hasOwn(this.objects[layer].objects,id)
    }
    exist_all(id:number,type:number):boolean{
        for(const l of Object.values(this.objects)){
            if(Object.hasOwn(l.objects,id)&&l.objects[id].number_type===type)return true
        }
        return false
    }
    alive_count(layer:keyof typeof this.objects):number{
        return this.objects[layer].orden.length
    }
    add_layer(layer: number) {
        if (this.objects[layer]) return;
        this.objects[layer] = { orden: [], objects: {},updatables:[],renderizables:[] };
        this.layers.push(layer);
    }
    proccess_object(stream:NetStream):GameObject|undefined{
        const b=stream.readBooleanGroup()
        if(b[0]||b[1]||b[2]){
            const oid=stream.readID()
            const layer=stream.readInt8()
            if(!this.objects[layer]){
                this.add_layer(layer)
            }
            const tp=stream.readUint8()
            let obj=this.all_objects.get(oid)
            if(b[3]&&!obj&&!b[2]){
                const obb=this.oncreate(oid,layer,tp)
                if(!obb)return
                obj=obb
                this.add_object(obj,layer,oid,undefined,undefined)
            }
            if(!obj)return
            obj.is_new=b[4]
            if(obj){
                if(obj.layer!==layer){
                    obj.set_layer(layer)
                }
                if(b[0]||b[1]){
                    obj.decode(stream,b[1])
                }
                if(b[2]){
                    if(obj.net_sync.enabled.deletion)obj.destroy()
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
            if(process_deletion&&this.all_objects.has(id)){
                const obj=this.all_objects.get(id)!
                if(obj.net_sync.enabled.deletion)obj.destroy()
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
    encode_all(full:boolean=false,stream?:NetStream,recreate:boolean=false):NetStream{
        if(!stream){
            if(!this.stream_cache)this.stream_cache=new NetStream(new ArrayBuffer(1024*50))
            stream=this.stream_cache
            this.stream_cache.clear()
        }
        stream.writeUint8(100) // All Encode
        const list:GameObject[]=[]
        for(const obj of this.all_objects.values()){
            if(obj.net_sync.full||full||recreate||obj.net_sync.part)list.push(obj)
        }

        stream.writeID(list.length)
        for(const obj of list){
            obj.encodeObject(full||recreate,stream,null)
        }
        return stream
    }
    encode_list(objects_list:GameObject[],last_list:GameObject[]=[],force_dirty:boolean=false,object_options?:(obj:GameObject)=>any,stream?:NetStream,recreate:boolean=false):{last:GameObject[],strm:NetStream}{
        if(!stream){
            if(!this.stream_cache)this.stream_cache=new NetStream(new ArrayBuffer(1024*50))
            stream=this.stream_cache
            this.stream_cache.clear()
        }
        stream.writeUint8(200) // List Encode

        const list:[GameObject,boolean][]=[]
        objects_list.forEach((v)=>{
            const full=v.net_sync.full||force_dirty||!last_list.includes(v)
            if(full||v.net_sync.part)list.push([v,full])
        })

        stream.writeUint16(list.length)
        for(const o of list){
            o[0].encodeObject(o[1],stream,object_options?object_options(o[0]):null)
        }

        const deletions: GameObject[] = []
        for (let i = 0; i < last_list.length; i++) {
            const obj = last_list[i]
            if (obj.net_sync.enabled.deletion && objects_list.indexOf(obj) === -1) deletions.push(obj)
        }

        stream.writeUint16(deletions.length)
        for(let i=0;i<deletions.length;i++){
            stream.writeID(deletions[i].id)
        }
        return {strm:stream,last:objects_list}
    }
    update(dt:number){
        for(const l in this.objects){
            for(let j=0;j<this.objects[l].updatables.length;j++){
                const o=this.objects[l].updatables[j]
                const obj=this.objects[l].objects[o]
                if(obj.destroyed)continue
                obj.update(dt)
                if(this.cells.dirty_objects.has(obj)){
                    this.cells.update_object(obj)
                }
            }
        }
        this.cells.update()
    }
    update_to_net(){
        for(const l of this.layers){
            for(let j=0;j<this.objects[l].orden.length;j++){
                const idx=this.objects[l].orden[j]
                this.objects[l].objects[idx].net_sync.part=false
                this.objects[l].objects[idx].net_sync.full=false
                this.objects[l].objects[idx].is_new=false
                this.objects[l].objects[idx].net_update()
            }
        }
    }
    apply_destroy_queue(){
        for(const obj of this.destroy_queue){
            if(!this.objects[obj.layer]||!this.objects[obj.layer].objects[obj.id])continue
            this.unregister(obj)
            delete this.objects[obj.layer].objects[obj.id]
            this.objects[obj.layer].orden.splice(this.objects[obj.layer].orden.indexOf(obj.id),1)
        }
        this.destroy_queue.length=0
    }
    unregister(obj:GameObject,force_destroy:boolean=true){
        if(force_destroy){
            this.ondestroy(this.objects[obj.layer].objects[obj.id])
            this.objects[obj.layer].objects[obj.id].on_destroy()

            let idx=this.objects[obj.layer].updatables.indexOf(obj.id)
            if(idx>=0)this.objects[obj.layer].updatables.splice(idx,1)
            idx=this.objects[obj.layer].renderizables.indexOf(obj.id)
            if(idx>=0)this.objects[obj.layer].renderizables.splice(idx,1)
            this.all_objects.delete(obj.id)
        }
        obj.registred=false
        this.cells.unregistry(this.objects[obj.layer].objects[obj.id])
    }
}