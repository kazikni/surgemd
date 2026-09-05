return (class extends LevelPlayerScript{
    async initialize_mode(){
        await this.game.auto_init({
            mode:"sequence",
            settings:{
                map: {
                    loot_tables:{},
                    biome:NormalBiome,
                    bounds_size:0,
                    size:v2(50,50),
                    generation:{
                        base:FloorType.Grass,
                    }
                }
            }
        })
        this.game.modeManager.rules.humans.modifiers.health=0.5
    }
    on_spawn_player(player){
        player.set_preset({

            inventory: {
                hand:1,
                gun1: [
                    {item:"colt1873",weight: 1},
                ],
                iitems: [
                    "scope_2",
                    "scope_3"
                ],
            }
        })
    }
    async on_begin(){
        
    }
    async on_before(){
    }
    on_start(){
        this.game.modeManager.add_enemies([
            {
                "def": {
                    ai: {
                        kind: "dumb"
                    },
                    inventory:{
                        gun1: [
                            {item:"colt1873",weight: 1},
                            {item:"m9",weight: 1},
                            {item:"m870",weight: 1},
                            {item:"ak47",weight: 1},
                        ],
                    }
                },
                "count": 10
            },
        ])
    }
})