return (class extends LevelPlayerScript{
    async initialize_mode(){
        await this.game.auto_init({
            mode:"normal",
            settings:{
                map:{
                    def:{
                        ...NormalMap,
                        loot_tables:{...LootTables,...SimpleLootTables}
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
                events:[]
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
                            {item:"m110a2",weight:0.3},
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
                            {item:"m110a2",weight:0.6},
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
                "count": 29
            },
            {
                "def": {
                    "ai": {
                        "kind": "dumb"
                    }
                },
                "count": 70
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