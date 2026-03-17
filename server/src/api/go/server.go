package surgemd_api

import (
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"sync"

	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
	_ "github.com/mattn/go-sqlite3"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

type ApiServer struct {
	accounts_db *sql.DB
	forum_db    *sql.DB
	shopSkins   map[int]int
	mu          sync.Mutex
	Config      *Config
	News        struct {
		Data            []NewsData
		ExpandedContent map[string]string
	}
	Teams map[string]*Team
}

func (s *ApiServer) corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin != "" {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Credentials", "true")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, X-Api-Key")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
		}

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func NewApiServer(dbFile string, cfg *Config) (*ApiServer, error) {
	accounts_db, err := sql.Open("sqlite3", dbFile)
	if err != nil {
		return nil, err
	}
	server := &ApiServer{
		accounts_db: accounts_db,
		shopSkins:   cfg.Shop.Skins,
		Config:      cfg,
	}
	err = server.DBInit()
	server.load_news()
	if err != nil {
		return nil, err
	}
	return server, nil
}

func (s *ApiServer) DBInit() error {
	_, err := s.accounts_db.Exec(`
	CREATE TABLE IF NOT EXISTS players (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL UNIQUE,
		password_hash TEXT NOT NULL,
		inventory TEXT DEFAULT '{"skins":[],"items":{}}',
		score INTEGER DEFAULT 0,
		coins INTEGER DEFAULT 0,
		xp INTEGER DEFAULT 0,
		wins INTEGER DEFAULT 0,
		special_wins INTEGER DEFAULT 0,
		games_total INTEGER DEFAULT 0,
		kills INTEGER DEFAULT 0,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	)`)
	if err != nil {
		return err
	}

	// open forum database (file from config)
	if s.Config != nil && s.Config.Database.Files.Forum != "" {
		var err2 error
		s.forum_db, err2 = sql.Open("sqlite3", s.Config.Database.Files.Forum)
		if err2 != nil {
			return err2
		}
		_, err2 = s.forum_db.Exec(`
		CREATE TABLE IF NOT EXISTS posts (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			author TEXT NOT NULL,
			title TEXT NOT NULL,
			body TEXT NOT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		);
		CREATE TABLE IF NOT EXISTS comments (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			post_id INTEGER NOT NULL,
			author TEXT NOT NULL,
			body TEXT NOT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY(post_id) REFERENCES posts(id) ON DELETE CASCADE
		);
		`)
		if err2 != nil {
			return err2
		}
	}

	return nil
}

func hashPassword(password string) string {
	h := sha256.New()
	h.Write([]byte(password))
	return hex.EncodeToString(h.Sum(nil))
}

func (s *ApiServer) corsHeaders(w http.ResponseWriter, origin string) {
	w.Header().Set("Access-Control-Allow-Origin", origin)
	w.Header().Set("Access-Control-Allow-Credentials", "true")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
}

func (s *ApiServer) load_news() {
	basePath := s.Config.API.Files.News
	if basePath == "" {
		panic("news path is empty")
	}
	mainFile := filepath.Join(basePath, "main.json")
	f, err := os.ReadFile(mainFile)
	if err != nil {
		panic("failed to read news main.json: " + err.Error())
	}
	var news map[string]any = make(map[string]any)
	err = json.Unmarshal(f, &news)
	if err != nil {
		panic("failed to parse news main.json: " + err.Error())
	}
	order := news["order"].([]any)
	s.News.ExpandedContent = make(map[string]string)
	for _, v := range order {
		entry := v.(map[string]any)

		content, err := os.ReadFile(filepath.Join(basePath, "content", entry["id"].(string)+".md"))
		if err != nil {
			panic("failed to read news content file: " + err.Error())
		}
		s.News.Data = append(s.News.Data, NewsData{
			Title:   entry["title"].(string),
			Id:      entry["id"].(string),
			Content: string(content),
		})

		content, err = os.ReadFile(filepath.Join(basePath, "expanded", entry["id"].(string)+".md"))
		if err == nil {
			s.News.ExpandedContent[entry["id"].(string)] = string(content)
		}
	}
}
func (s *ApiServer) HandleFunctions() {
	r := mux.NewRouter()

	api_r := r.PathPrefix("/").Subrouter()
	api_r.HandleFunc("/get-settings", s.handleGetSettings)
	api_r.HandleFunc("/register", s.handleRegister)
	api_r.HandleFunc("/login", s.handleLogin)
	api_r.HandleFunc("/logout", s.handleLogout)
	api_r.HandleFunc("/get-your-status", s.handleGetYourStatus)
	api_r.HandleFunc("/get-status/{id}", s.handleGetStatus)
	api_r.HandleFunc("/internal/update-user", s.handleUpdateUser)
	api_r.HandleFunc("/buy-skin/{id}", s.handleBuySkin)
	api_r.HandleFunc("/leaderboard", s.handleLeaderboard)

	news_r := r.PathPrefix("/news").Subrouter()
	news_r.HandleFunc("/get", s.handleGetNewsDefs)
	news_r.HandleFunc("/expanded/{id}", s.handleGetNewsExpanded)

	team_r := r.PathPrefix("/team").Subrouter()
	team_r.HandleFunc("/connect", s.handleTeamConnect).Methods("POST")
	team_r.HandleFunc("/ws/{id}/{player}", s.handleTeamWS).Methods("POST")

	forum_r := r.PathPrefix("/forum").Subrouter()
	forum_r.HandleFunc("/create-post", s.handleCreatePost)
	forum_r.HandleFunc("/posts", s.handleListPosts)
	forum_r.HandleFunc("/post/{id}", s.handlePost)
	forum_r.HandleFunc("/delete-post/{id}", s.handleDeletePost)
	forum_r.HandleFunc("/delete-comment/{id}", s.handleDeleteComment)

	var handler http.Handler = r
	handler = s.rateLimitMiddleware(handler)
	handler = s.limitBodySizeMiddleware(handler)
	handler = logURLMiddleware(handler)
	handler = s.corsMiddleware(handler)

	http.Handle("/", handler)
}
