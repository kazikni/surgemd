return (class extends LevelPlayerScript{
    async initialize_mode(){
        await this.game.auto_init({
            mode:"normal",
            settings:{
                map:{
                    def:{
                        loot_tables:{
                            ...LootTables,
                            common_guns:[
                                {item:"m9",weight:100},
                                {item:"mp5",weight:90},
                                {item:"micro_uzi",weight:80},
                                {item:"ak47",weight:40},
                                {item:"m870",weight:39},
                                {item:"sr25",weight:5},
                                {item:"kar98k",weight:5},
                            ],
                            guns:[
                                {table:"common_guns",weight:1},
                            ],
                            melees:[
                                {item:"survival_knife",weight:15},
                                {item:"shovel",weight:15},
                                {item:"axe",weight:10},
                                {item:"pan",weight:2},
                            ],
                            scopes:[
                                {item:"scope_2",count:1,weight:28},
                                {item:"scope_3",count:1,weight:11},
                            ],
                            consumibles:[
                                {table:"health_consumibles",count:1,weight:10},
                                {table:"adrenaline_consumibles",count:1,weight:6},
                            ],
                            ammos:[
                                {item:"p76",count:10,weight:5},
                                {item:"l19",count:60,weight:5},
                                {item:"c51",count:40,weight:5},
                            ],

                            wood_crate:[
                                {weight:1,count:1,table:"normal_loot"},
                            ],
                            civil_loot:[
                                {weight:1,table:"ammos"},
                                {weight:1,table:"consumibles"},
                                {weight:0.7,table:"equipments"},
                                {weight:0.7,table:"scopes"},
                                {weight:0.1,table:"guns"},
                                {weight:0.003,table:"melees"},
                            ],
                            normal_loot:[
                                {weight:1,table:"ammos"},
                                {weight:1,table:"consumibles"},
                                {weight:0.8,table:"guns"},
                                {weight:0.7,table:"equipments"},
                                {weight:0.6,table:"scopes"},
                                {weight:0.01,table:"melees"},
                            ],
                        },
                        biome:NormalBiome,
                        size:v2(330,330),
                        generation:{
                            base:FloorType.Water,
                            spawn:[
                                {def:"sillo",count:3},
                                {def:"wood_crate",count:200},
                                {def:map_spawns.trees,count:250},
                                {def:"river_rock",count:20},
                                {def:"rock",count:200},
                                {def:"bush",count:120},
                                {def:"barrel",count:50},

                                {def:"normal_loot",count:80},
                            ],
                            islands:[{
                                terrain:{
                                    radius:140,
                                    passes:3,
                                    points:6,
                                    variation:40,
                                    rivers:{
                                        divisions:50,
                                        spawn_floor:1,
                                        expansion:32,
                                        defs:[
                                            {
                                                rivers:[
                                                    {width:10,width_variation:2},
                                                    {width:10,width_variation:2},
                                                ],
                                                weight:1
                                            },
                                        ]
                                    },
                                    floors:[
                                        {
                                            padding:0,
                                            type:FloorType.Sand,
                                            spacing:3,
                                            variation:3,
                                        },
                                        {
                                            padding:10,
                                            type:FloorType.Grass,
                                            spacing:3,
                                            variation:3,
                                        },
                                    ]
                                }
                            }]
                        },
                    }
                },
                deadzone:{
                    mode:DeadZoneMode.staged,
                    stages:MakeDeadZoneStages({
                        count:7,
                        radius:{
                            decay:0.61,
                            initial:30
                        },
                        damage:{
                            advancing_scale:2,
                            waiting_scale:1,
                            limit:10,
                            initial:2
                        },
                        wait_time:{
                            initial:40,
                            decay:0.97,
                            min:30,
                        },
                        advancing_time:{
                            initial:30,
                            decay:0.95,
                            min:20,
                        },
                    }),
                },
                airdrops:{
                    obstacle:"airdrop",
                    spawn:[]
                },
                drones:{
                    spawn:[]
                }
            }
        })
    }
    on_start(){
        this.game.modeManager.add_enemies([
            {
                "def": {
                    "ai": {
                        "kind": "advanced_legacy"
                    },
                    "boosts": [
                        {"weight": 7,"def": "adrenaline","value": 0},
                        {"weight": 1,"def": "adrenaline","value": 1},
                    ],
                    "inventory": {
                        "infinity_ammo": true,
                        "hand": 1,
                        "backpack": [
                            {
                                "item": "basic_pack",
                                "weight": 10
                            },
                            {
                                "item": "military_pack",
                                "weight": 1
                            },
                            {
                                "item": "tactical_pack",
                                "weight": 0.1
                            }
                        ],
                        "vest": [
                            {
                                "item": "civil_vest",
                                "weight": 10
                            },
                            {
                                "item": "military_vest",
                                "weight": 1
                            },
                            {
                                "item": "tactical_vest",
                                "weight": 0.1
                            }
                        ],
                        "helmet": [
                            {
                                "item": "bike_helmet",
                                "weight": 10
                            },
                            {
                                "item": "military_helmet",
                                "weight": 1
                            },
                            {
                                "item": "tactical_helmet",
                                "weight": 0.1
                            }
                        ],
                        "melee": [
                            {
                                "item": "fist",
                                "weight": 40
                            },
                            {
                                "item": "survival_knife",
                                "weight": 10
                            },
                            {
                                "item": "shovel",
                                "weight": 10
                            },
                            {
                                "item": "axe",
                                "weight": 5
                            },
                        ],
                        "gun1": [
                            {
                                "item": "m9",
                                "weight": 8
                            },
                            {
                                "item": "m9_dual",
                                "weight": 8
                            },
                            {
                                "item": "mp5",
                                "weight": 8
                            },
                            {
                                "item": "micro_uzi",
                                "weight": 7
                            },
                            {
                                "item": "m870",
                                "weight": 7
                            },
                            {
                                "item": "ak47",
                                "weight": 7
                            },
                            {item:"sr25",weight:0.3},
                            {
                                "item": "kar98k",
                                "weight": 0.2
                            },
                        ],
                        "gun2": [
                            {
                                "item": "m9",
                                "weight": 8
                            },
                            {
                                "item": "m9_dual",
                                "weight": 8
                            },
                            {
                                "item": "mp5",
                                "weight": 8
                            },
                            {
                                "item": "micro_uzi",
                                "weight": 7
                            },
                            {
                                "item": "ak47",
                                "weight": 7
                            },
                            {item:"sr25",weight:0.6},
                            {
                                "item": "kar98k",
                                "weight": 0.2
                            },
                        ],
                        "aitems": {
                            "p76":20,
                            "c51": 140,
                            "l19": 20,
                        },
                        "items": [
                            [
                                {
                                    "item": "bandage",
                                    "weight": 1,
                                    "count": 5
                                }
                            ],
                            [
                                {
                                    "item": "medikit",
                                    "weight": 1
                                }
                            ],
                            [
                                {
                                    "item": "yellow_soda",
                                    "weight": 1
                                }
                            ]
                        ],
                        "iitems": [
                            "scope_2"
                        ]
                    }
                },
                "count": 15
            },
            {
                "def": {
                    "ai": {
                        "kind": "dumb"
                    }
                },
                "count": 39
            }
        ])
    }
    on_spawn_player(player){
        player.set_preset(this.preset)
    }
    async on_begin(){
        this.cutscene=await this.load_json("cutscenes/begin.jsonc")
        this.preset=await this.level.load_character({"path": "../../characters/nick.jsonc"})
    }
    async on_before(start_with_intro){
        const cutscene=[]
        //if(start_with_intro)cutscene.push(...this.cutscene)
        cutscene.push(...this.make_level_intro())
        await this.show_cutscene(cutscene)
    }
})