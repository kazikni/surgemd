import { loadConfigDeno } from "../../configs/config.ts";
import { OfflineClientsManager, random } from "common/engine/core.ts";
import { Game } from "./others/game.ts";
import { BattleRoyaleSolo } from "./mode/battle_royale.ts";
import { Maps } from "common/scripts/definitions/maps/base.ts";
import { JoinPacket } from "common/scripts/packets/join_packet.ts";
import { generateGenome, NeuralBotAi } from "./human/neural_ai.ts";
import { PacketManager } from "common/scripts/packets/packet_manager.ts";
import { Player } from "./objects/player.ts";

const POPULATION = 100
const MATCHES_PER_AGENT = 3
const ELITE_RATIO = 0.2
const MUTATION_RATE = 0.02
const MUTATION_STRENGTH = 0.3

const SAVE_FILE = "./population.json"

type Genome = Float32Array

interface Individual {
    genome: Genome
    fitness: number
}

function flattenNetwork(ai: NeuralBotAi): Float32Array {
    const weights: number[] = []

    for (const layer of ai.brain.layers) {
        weights.push(...layer.weights)
        weights.push(...layer.bias)
    }

    return new Float32Array(weights)
}

function applyGenome(ai: NeuralBotAi, genome: Float32Array) {
    let offset = 0

    for (const layer of ai.brain.layers) {

        for (let i = 0; i < layer.weights.length; i++) {
            layer.weights[i] = genome[offset++]
        }

        for (let i = 0; i < layer.bias.length; i++) {
            layer.bias[i] = genome[offset++]
        }
    }
}

function mutate(genome: Float32Array) {
    const g = new Float32Array(genome)

    for (let i = 0; i < g.length; i++) {
        if (Math.random() < MUTATION_RATE) {
            g[i] += random.float(-MUTATION_STRENGTH, MUTATION_STRENGTH)
        }
    }

    return g
}

function crossover(a: Float32Array, b: Float32Array) {
    const child = new Float32Array(a.length)

    for (let i = 0; i < child.length; i++) {

        child[i] = Math.random() < 0.5 ? a[i] : b[i]
    }

    return child
}

async function runMatch(genomes: Genome[],id:number): Promise<number[]> {
    const Config = loadConfigDeno("../config.json")

    const game: Game = new Game(Config, {
        mode: "normal",
        team_size: random.float(1, 10),
    }, new OfflineClientsManager(PacketManager), id)

    game.init(new BattleRoyaleSolo({
        map: Maps["lobby"],
        players_limit: POPULATION,
    }))

    game.on_run()
    game.mainloop(false, false)

    const ais: NeuralBotAi[] = []

    for (let i = 0; i < genomes.length; i++) {
        const p = new JoinPacket()
        p.player_name = `BOT-${i}`

        const conn = game.players.add_bot(p)

        const ai = new NeuralBotAi(conn)

        applyGenome(ai, genomes[i])

        conn.ai = ai

        ais.push(ai)
    }

    let lastPrint = -1

    while (game.running) {
        await game.update(1 / 60)

        const sec = Math.floor(game.ticks / 60)

        if (sec % 60 === 0 && sec !== lastPrint) {
            lastPrint = sec
            console.log("Seconds:", sec, "Ticks:", game.ticks)
        }
    }

    const fitness: number[] = []

    for (let i = 0; i < ais.length; i++) {

        const h = ais[i].conn.human

        if (!h) {
            fitness.push(0)
            continue
        }

        const score =
            h.health_data.health +
            (h as Player).status.kills * 10 +
            (h as Player).status.time_alive * 0.01

        fitness.push(score)
    }
    return fitness
}

async function evaluatePopulation(population: Individual[],id:number) {
    for (const ind of population) ind.fitness = 0

    for (let m = 0; m < MATCHES_PER_AGENT; m++) {
        console.log("Match", m + 1)

        const genomes = population.map(p => p.genome)

        const scores = await runMatch(genomes,id)

        for (let i = 0; i < population.length; i++) {
            population[i].fitness += scores[i]
        }
    }

    for (const ind of population) {
        ind.fitness /= MATCHES_PER_AGENT
    }
}

function nextGeneration(population: Individual[]): Individual[] {
    population.sort((a, b) => b.fitness - a.fitness)

    const eliteCount = Math.floor(POPULATION * ELITE_RATIO)

    const elites = population.slice(0, eliteCount)

    const newPop: Individual[] = []

    for (const e of elites) {
        newPop.push({
            genome: e.genome,
            fitness: 0
        })
    }

    while (newPop.length < POPULATION) {
        const a = elites[random.int(0, elites.length - 1)]
        const b = elites[random.int(0, elites.length - 1)]

        let child = crossover(a.genome, b.genome)

        child = mutate(child)

        newPop.push({
            genome: child,
            fitness: 0
        })
    }

    return newPop
}

async function savePopulation(population: Individual[]) {
    const data = population.map(p => Array.from(p.genome))

    await Deno.writeTextFile(SAVE_FILE, JSON.stringify(data))
}

async function loadPopulation(): Promise<Individual[] | null> {
    try {
        const txt = await Deno.readTextFile(SAVE_FILE)

        const data = JSON.parse(txt)

        return data.map((g: number[]) => ({
            genome: new Float32Array(g),
            fitness: 0
        }))

    } catch {

        return null
    }
}

async function createRandomPopulation(): Promise<Individual[]> {
    const pop: Individual[] = []

    for (let i = 0; i < POPULATION; i++) {
        pop.push({
            genome: generateGenome(),
            fitness: 0
        })
    }

    return pop
}

async function trainer() {
    let population = await loadPopulation()

    if (!population) {
        population = await createRandomPopulation()
    }

    let generation = 0
    let game=0

    while (true) {
        console.log("Generation", generation)

        await evaluatePopulation(population,game)
        game++

        population.sort((a, b) => b.fitness - a.fitness)

        console.log("Best fitness:", population[0].fitness)

        await savePopulation(population)

        population = nextGeneration(population)

        generation++
    }
}

if (import.meta.main) {
    trainer()
}