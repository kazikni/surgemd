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
    on_spawn_player(player,first){
        if(first)player.set_preset({
            inventory: {
                hand:1,
                gun1: [
                    {item:"colt1873",weight: 1},
                ],
                aitems:{
                    "c22": 6,
                },
                items:[
                    [{"item": "frag_grenade", "count": 10, "weight": 1}],
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
    on_start(first){
        if(first)this.game.modeManager.add_enemies([
            {
                "def": {
                    /*ai: {
                        kind: "dumb"
                    },*/
                    inventory:{
                        gun1: [
                            {item:"colt1873",weight: 1.1},
                            {item:"m9",weight: 1.1},
                            {item:"taurustx",weight: 1.1},
                            {item:"m870",weight: 1},
                            {item:"mp5",weight: 1},
                            {item:"ak47",weight: 1},
                            {item:"ar15",weight: 1},
                            {item:"famas",weight: 0.75},
                            {item:"m4a1",weight: 0.75},
                            {item:"micro_uzi",weight: 0.75},
                            {item:"m1921",weight: 0.75},
                            {item:"tec22",weight: 0.75},
                            {item:"hp18",weight: 0.6},
                            {item:"spas12",weight: 0.6},
                            {item:"sr25",weight: 0.6},
                            {item:"vss",weight: 0.5},
                            {item:"desert_eagle",weight: 0.5},
                            {item:"vector",weight: 0.5},
                            {item:"p90",weight: 0.5},
                            {item:"kar98k",weight: 0.5},
                            {item:"model94",weight: 0.5},
                            {item:"rifle_cbc",weight: 0.5},
                            {item:"awp",weight: 0.5},
                            {item:"awm",weight: 0.25},
                        ],
                    }
                },
                "count": 50
            },
        ])
    }
})