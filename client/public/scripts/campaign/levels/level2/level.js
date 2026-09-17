return (class extends LevelPlayerScript{
    async initialize_mode(){
        const gun_enemy={
            ai: {
                kind: "npc"
            },
            inventory:{
                hand:1,
                gun1: [
                    {item:"colt1873",weight: 1.1},
                    {item:"m9",weight: 1.1},
                    {item:"taurustx",weight: 1.1},
                    {item:"mp5",weight: 1},
                    {item:"ak47",weight: 1},
                    {item:"ar15",weight: 1},
                    {item:"m870",weight: 0.75},
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
                    {item:"aipc39",weight: 0.5},
                    {item:"vector",weight: 0.5},
                    {item:"p90",weight: 0.5},
                    {item:"kar98k",weight: 0.5},
                    {item:"model94",weight: 0.5},
                    {item:"blr81",weight: 0.5},
                    {item:"rifle_cbc",weight: 0.5},
                    {item:"m1_garand",weight: 0.4},
                    {item:"awp",weight: 0.4},
                    {item:"awm",weight: 0.25},
                ],
            }
        }
        const melee_enemy={
            ai: {
                kind: "npc"
            },
            inventory:{
                melee: [
                    {item:"baseball_bat",weight: 10},
                    {item:"survival_knife",weight: 10},
                    {item:"shovel",weight: 2},
                ],
            }
        }

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
                        spawn:[
                            {def:"shed",count:2},
                            {def:map_spawns.containers,count:2},

                            {def:"sillo",count:1},
                            {def:map_spawns.trees,count:10},
                            {def:map_spawns.rocks,count:10},
                            {def:"bush",count:3},
                            {def:"barrel",count:2},

                            {def:"normal_loot",count:2},
                        ],
                    }
                },
                commands:[
                    // Wave 1
                    {
                        type:"spawn_enemies",
                        enemies:[
                            {
                                "def": gun_enemy,
                                "count": 5
                            },
                            {
                                "def": melee_enemy,
                                "count": 5
                            },
                        ]
                    },
                    { type:"enemys_count"},
                    { type:"save_checkpoint"},

                    // Wave 2
                    {
                        type:"spawn_enemies",
                        enemies:[
                            {
                                "def": gun_enemy,
                                "count": 5
                            },
                            {
                                "def": melee_enemy,
                                "count": 5
                            },
                        ]
                    },
                    { type:"enemys_count"},
                    { type:"save_checkpoint"},

                    // Final Wave
                    {
                        type:"spawn_enemies",
                        enemies:[
                            {
                                "def": gun_enemy,
                                "count": 5
                            },
                            {
                                "def": melee_enemy,
                                "count": 5
                            },
                        ]
                    },
                    { type:"enemys_count"},

                    { type:"finish"},
                ]
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
        await this.send_message_event({type:OnlineMessageType.Load,assets:{"gameplay_music":"/assets/sounds/musics/single_player/music_3.mp3"}})
    }
    async on_before(){
        const cutscene=[{
            type:CutsceneCommandType.SetSoundController,
            controller:"music",
            source:"gameplay_music",
        }]
        await this.show_cutscene(cutscene)
    }
    on_start(first){
    }
})