import { BaseObject2D, GameObjectManager2D } from "../game/gameObject.ts";
import { Hitbox2D } from "../math/hitbox.ts";
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

export function astar_path2d(
    object: BaseObject2D,
    baseHitbox: Hitbox2D,
    destWorld: Vec2,
    isBlocked: (
        manager: GameObjectManager2D<BaseObject2D>,
        hb: Hitbox2D,
        cellX: number,
        cellY: number,
        layer: number
    ) => boolean,
    options: {
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

    const worldToCell = (p: Vec2) => ({
        x: Math.floor(p.x / cellSize),
        y: Math.floor(p.y / cellSize),
    })

    const cellToWorld = (x: number, y: number): Vec2 => ({
        x: (x + 0.5) * cellSize,
        y: (y + 0.5) * cellSize,
    })

    const startCell = worldToCell(object.position)
    const goalCell  = worldToCell(destWorld)

    const start: AStarNode = {
        x: startCell.x,
        y: startCell.y,
        g: 0,
        h: heuristic(startCell.x, startCell.y, goalCell.x, goalCell.y),
        f: 0,
    }
    start.f = start.h

    const open: AStarNode[] = [start]
    const openMap = new Map<string, AStarNode>()
    openMap.set(`${start.x}:${start.y}`, start)

    const closed = new Set<string>()

    const key = (x: number, y: number) => `${x}:${y}`

    let iterations = 0

    while (open.length > 0) {
        if (++iterations > maxIterations) break

        open.sort((a, b) => a.f - b.f)
        const current = open.shift()!
        openMap.delete(key(current.x, current.y))

        if (current.x === goalCell.x && current.y === goalCell.y) {
            const path: Vec2[] = []
            let n: AStarNode | undefined = current

            while (n) {
                path.push(cellToWorld(n.x, n.y))
                n = n.parent
            }

            path.reverse()
            return path
        }

        closed.add(key(current.x, current.y))

        for (const [dx, dy] of dirs) {
            const nx = current.x + dx
            const ny = current.y + dy
            const k = key(nx, ny)

            if (closed.has(k)) continue

            const testHB = baseHitbox.clone()
            const worldPos = cellToWorld(nx, ny)
            testHB.translate(v2.sub(worldPos, baseHitbox.position))

            if (isBlocked(manager, testHB, nx, ny, layer)) continue

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
            } else if (g < node.g) {
                node.g = g
                node.f = node.g + node.h
                node.parent = current
            }
        }
    }
    return []
}