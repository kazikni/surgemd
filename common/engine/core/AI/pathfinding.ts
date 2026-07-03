import { BaseObject2D, GameObjectManager2D } from "../game/gameObject.ts";
import { hash } from "../math/hash.ts";
import { Hitbox2D } from "../math/hitbox.ts";
import { MinHeap } from "../math/utils.ts";
import { v2, Vec2 } from "../math/vec2.ts";

function defaultHeuristic(ax: number, ay: number, bx: number, by: number) {
    return Math.abs(ax - bx) + Math.abs(ay - by)
}

type AStarNode = {
    x: number
    y: number
    g: number
    h: number
    f: number
    parent?: AStarNode
}

export function astar_path2d(object: BaseObject2D,base_hitbox: Hitbox2D,dest_world: Vec2,is_blocked: (
        manager: GameObjectManager2D<BaseObject2D>,
        hb: Hitbox2D,
        cellX: number,
        cellY: number,
        layer: number
    ) => boolean,   options: {
        cellSize?: number
        heuristic?: (ax: number, ay: number, bx: number, by: number) => number
        dirs?: readonly [number, number][]
        maxIterations?: number
    } = {}
): Vec2[] {
    const manager = object.manager
    const layer = object.layer

    const cellSize = options.cellSize ?? 1
    const heuristic = options.heuristic ?? defaultHeuristic
    const dirs = options.dirs ?? [
        [1, 0], [-1, 0],
        [0, 1], [0, -1],
    ]
    const maxIterations = options.maxIterations ?? 10_000

    const startCell = v2(Math.floor(object.position.x/cellSize),Math.floor(object.position.y/cellSize))
    const goalCell  = v2(Math.floor(dest_world.x/cellSize),Math.floor(dest_world.y/cellSize))

    const startHash=hash.hash_2d(startCell.x,startCell.y)
    const start: AStarNode = {
        x: startCell.x,
        y: startCell.y,
        g: 0,
        h: heuristic(startCell.x, startCell.y, goalCell.x, goalCell.y),
        f: 0,
    }
    start.f = start.h

    const open = new MinHeap<AStarNode>(n=>n.f)
    const openMap = new Map<number, AStarNode>()
    open.push(start)
    openMap.set(startHash, start)

    const closed = new Set<number>()
    let iterations = 0

    const worldPos=v2.zero()
    while (open.length > 0) {
        if (++iterations > maxIterations) break

        const current = open.pop()!
        const hv=hash.hash_2d(current.x, current.y)
        openMap.delete(hv)
        if (current.x === goalCell.x && current.y === goalCell.y) {
            const path: Vec2[] = []
            let n: AStarNode | undefined = current
            while (n) {
                path.push(v2((n.x + 0.5) * cellSize,(n.y + 0.5) * cellSize))
                n = n.parent
            }
            path.reverse()
            return path
        }
        openMap.delete(hv)

        const hb=base_hitbox.clone()
        for (const [dx, dy] of dirs) {
            const nx = current.x + dx
            const ny = current.y + dy
            const k = hash.hash_2d(nx, ny)

            if (closed.has(k)) continue

            closed.add(hv)
            worldPos.x=(nx + 0.5) * cellSize
            worldPos.y=(ny + 0.5) * cellSize
            
            hb.copy_from(base_hitbox)
            const testHB = base_hitbox.transform(v2.sub(worldPos, base_hitbox.position))
            if (is_blocked(manager, testHB, nx, ny, layer)) continue

            const cost = (dx === 0 || dy === 0) ? 1 : 1.414
            const g = current.g + cost

            let node = openMap.get(k)
            if (!node) {
                node = {
                    x: nx,
                    y: ny,
                    g,
                    h: heuristic(nx, ny, goalCell.x, goalCell.y),
                    f: 0,
                    parent: current,
                }
                node.f = node.g + node.h
                open.push(node)
                openMap.set(k, node)
            }else if (g < node.g) {
                node.g = g
                node.f = node.g + node.h
                node.parent = current
                open.push(node)
            }
        }
    }
    return []
}