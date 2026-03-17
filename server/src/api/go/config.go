package surgemd_api

import (
	"encoding/json"
	"fmt"
	"os"
)

type HostConfig struct {
	Port     int    `json:"port"`
	Name     string `json:"name,omitempty"`
	HTTPS    bool   `json:"https,omitempty"`
	CertFile string `json:"cert,omitempty"`
	KeyFile  string `json:"key,omitempty"`
	CAFile   string `json:"ca,omitempty"`
}

type GameConfigInner struct {
	GameTps int `json:"gameTps"`
	NetTps  int `json:"netTps"`
}
type ModeConfig struct {
	TeamSize []int  `json:"team_size"`
	Enabled  bool   `json:"enabled"`
	Gamemode string `json:"gamemode"`
}
type GameConfigDebug struct {
	DebugMenu     bool `json:"debug_menu"`
	DeenableLobby bool `json:"deenable_lobby"`
}
type GameConfig struct {
	MaxGames int             `json:"max_games"`
	Debug    GameConfigDebug `json"debug"`
	Config   GameConfigInner `json:"config"`
	Host     HostConfig      `json:"host"`
	Modes    []ModeConfig    `json:"modes"`
}

type RegionDef struct {
	Host string `json:"host"`
	Port int    `json:"port"`
}

type DatabaseFiles struct {
	Accounts string `json:"accounts"`
	Forum    string `json:"forum"`
}

type DatabaseConfig struct {
	Enabled bool          `json:"enabled"`
	Files   DatabaseFiles `json:"files"`
	ApiKey  string        `json:"api_key"`
}

type ShopConfig struct {
	Skins map[int]int `json:"skins"`
}
type ApiFiles struct {
	News string `json:"news"`
}
type Config struct {
	API struct {
		Host   HostConfig `json:"host"`
		Global string     `json:"global"`
		Files  ApiFiles   `json:"files"`
	} `json:"api"`
	Game     GameConfig           `json:"game"`
	Regions  map[string]RegionDef `json:"regions"`
	Database DatabaseConfig       `json:"database"`
	Shop     ShopConfig           `json:"shop"`
}

func LoadConfig(path string) (*Config, error) {
	b, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var cfg Config

	type rawConfig struct {
		API struct {
			Host   HostConfig `json:"host"`
			Global string     `json:"global"`
			Files  ApiFiles   `json:"files"`
		} `json:"api"`
		Game     GameConfig           `json:"game"`
		Regions  map[string]RegionDef `json:"regions"`
		Database DatabaseConfig       `json:"database"`
		Shop     struct {
			Skins map[string]int `json:"skins"`
		} `json:"shop"`
	}

	var raw rawConfig
	if err := json.Unmarshal(b, &raw); err != nil {
		return nil, err
	}

	cfg.API = raw.API
	cfg.Game = raw.Game
	cfg.Regions = raw.Regions
	cfg.Database = raw.Database
	cfg.Shop.Skins = make(map[int]int, len(raw.Shop.Skins))

	for k, v := range raw.Shop.Skins {
		var keyInt int
		fmt.Sscanf(k, "%d", &keyInt)
		cfg.Shop.Skins[keyInt] = v
	}

	return &cfg, nil
}
