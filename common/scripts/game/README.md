# Arquitetura do jogo (componentes)

## Prefixos dos componentes

| Prefixo | Onde roda | O que faz |
|---|---|---|
| `c_`   | todo lugar | dados comuns + helpers de encode/decode (ex: `c_human.encode_human_net`) |
| `si_`  | simulacao (servidor, worker, modo local) | fisica, regras, `net_encode`, checkpoint |
| `cc_`  | cliente | visual (sprites, sons, particulas) |
| `ccs_` | cliente local | `cc_` + `si_` (o objeto simula no proprio cliente) |
| `ccn_` | cliente online/worker | `cc_` + `net_decode` (o servidor simula) |

Fabricas de objetos por modo:
- servidor/worker: `server/src/game/scene.ts` (`simulation_defs`)
- cliente local: `client/src/scripts/scenes/play/localdefs.ts`
- cliente online/worker: `client/src/scripts/scenes/play/netdefs.ts`

## Humanoid x Human

- **Humanoid** (`objects/moving_body/humanoid.ts`): so o visual (corpo, roupa, cabelo, acessorios).
  Serve para bosses, zumbis, inimigos simples. Evento `humanoid_events.visual_changed`.
- **Human** (`objects/moving_body/human.ts`): humano completo (vida, boost, inventario, input, fisica).
  - `knocked`: nocauteado (gameplay). `knock_out()` / `help_up()`.
  - `downed`: deitado (visual). `knocked || lay_down(tempo)` (ex: atropelado).
  - `swimming`: agua profunda. O visual reaproveita a pose deitada.
- O humano **nao sabe** se e player, bot ou npc.

## PlayerConn e ModeManager

- **PlayerConn** (`players/player_conn.ts`): transforma um humano em player e controla ele.
  - `LocalPlayerConn` (modo local), `BotPlayerConn` (IA simples), `NetPlayerConn` (servidor, `server/src/game/net_player_conn.ts`).
- **ModeManager** (`gelo/mode.ts`, `si_mode`): decide quem e player/bot/npc e guarda os dados do modo
  por humano (`ModeHumanData`: time, grupo, vidas, dinheiro, kills). Tambem cuida de start/finish.
  - `mode.add_player(conn, join)` -> cria o humano do player
  - `mode.spawn_human({...})` -> cria um npc
  - Checkpoint: o humano salva vida/boost/inventario; o modo salva time/vidas/dinheiro (`encode_mode_checkpoint`).
- **Battle Royale** (`modes/battle_royale.ts`): estende `si_mode`. Deadzone, grupos, bots, ultimo lado em pe ganha.
- Modos por nome e a montagem da cena (modo + mapa + deadzone): `modes/modes.ts` (`setup_game_scene`).

## Jogar (cliente)

```ts
const game=new PlayScene(app)

await game.self_initialize({mode:"normal",settings:{bots:5}}) // local
// await game.worker_initialize({mode:"normal"})              // worker
// await game.connect("ws://localhost:8080/api/ws/0")         // online

await game.join({name:"Kazikni"})
app.scene=game

await game.close()
app.scene=app.menu_scene
```

Atalho no app: `app.play("self"|"worker"|"online", options)` e `app.leave_game()`.
Sem UI, o modo e escolhido pela URL: `?play=self`, `?play=worker`, `?play=online&server=ws://localhost:8080/api/ws/0`, `&bots=5`, `&map=tundra`.

## Servidor

- `deno task dev:game:host` (pasta `server`): um jogo so em `ws://localhost:8080/api/ws`.
- `deno task dev:game`: servidor completo (varios jogos em `/api/ws/<id>` + conexao com a API).
- Teste rapido sem render: `deno run -A src/test/game_test.ts`.
