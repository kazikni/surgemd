package surgemd_api

import (
	"database/sql"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"strconv"
	"strings"
)

func (s *ApiServer) handleGetSettings(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	ret := make(map[string]any)
	ret["regions"] = s.Config.Regions
	ret["shop"] = s.Config.Shop
	ret["modes"] = s.Config.Game.Modes
	ret["debug"] = map[string]any{
		"debug_menu": s.Config.Game.Debug.DebugMenu,
	}
	ret["database"] = map[string]any{
		"enabled": s.Config.Database.Enabled,
	}
	json.NewEncoder(w).Encode(ret)
}

func (s *ApiServer) handleRegister(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		w.WriteHeader(204)
		return
	}

	var body struct {
		Name     string `json:"name"`
		Password string `json:"password"`
	}

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "Invalid JSON", 400)
		return
	}

	name := strings.TrimSpace(body.Name)
	password := strings.TrimSpace(body.Password)

	if len(name) < 3 || len(password) < 4 {
		http.Error(w, "Name or password too short", 400)
		return
	}

	var existingName string
	err := s.accounts_db.QueryRow("SELECT name FROM players WHERE name = ?", name).Scan(&existingName)
	if err != sql.ErrNoRows && err != nil {
		http.Error(w, "Internal error", 500)
		return
	}
	if existingName != "" {
		http.Error(w, "User already exists", 409)
		return
	}

	passwordHash := hashPassword(password)
	_, err = s.accounts_db.Exec("INSERT INTO players (name, password_hash) VALUES (?, ?)", name, passwordHash)
	if err != nil {
		http.Error(w, "Internal error", 500)
		return
	}

	log.Println("New account:", name)
	w.WriteHeader(201)
	w.Write([]byte("Registered"))
}

func (s *ApiServer) handleLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		w.WriteHeader(204)
		return
	}

	var body struct {
		Name     string `json:"name"`
		Password string `json:"password"`
	}

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "Invalid JSON", 400)
		return
	}

	name := strings.TrimSpace(body.Name)
	password := strings.TrimSpace(body.Password)

	var storedHash string
	err := s.accounts_db.QueryRow("SELECT password_hash FROM players WHERE name = ?", name).Scan(&storedHash)
	if err == sql.ErrNoRows {
		http.Error(w, "User not found", 404)
		return
	} else if err != nil {
		http.Error(w, "Internal error", 500)
		return
	}

	if storedHash != hashPassword(password) {
		http.Error(w, "Wrong password", 403)
		return
	}

	cookie := http.Cookie{
		Name:     "username",
		Value:    name,
		HttpOnly: true,
		Path:     "/",
	}
	http.SetCookie(w, &cookie)
	w.Header().Set("Content-Type", "text/plain")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Credentials", "true")
	w.Write([]byte("Logged in"))
}
func (s *ApiServer) handleLogout(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		w.WriteHeader(204)
		return
	}

	origin := r.Header.Get("Origin")
	s.corsHeaders(w, origin)

	cookie := http.Cookie{
		Name:     "username",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
	}
	http.SetCookie(w, &cookie)

	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"status":"Logged out"}`))
}

func (s *ApiServer) getUserNameFromCookie(r *http.Request) string {
	cookie, err := r.Cookie("username")
	if err != nil {
		return ""
	}
	return cookie.Value
}

func (s *ApiServer) handleGetYourStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != "GET" {
		w.WriteHeader(204)
		return
	}

	username := s.getUserNameFromCookie(r)
	origin := r.Header.Get("Origin")
	s.corsHeaders(w, origin)

	if username == "" {
		http.Error(w, "{\"username\":null}", 401)
		return
	}

	var user struct {
		Name        string `json:"name"`
		Coins       int    `json:"coins"`
		XP          int    `json:"xp"`
		Score       int    `json:"score"`
		Wins        int    `json:"wins"`
		SpecialWins int    `json:"special_wins"`
		GamesTotal  int    `json:"games_total"`
		Kills       int    `json:"kills"`
		Inventory   string `json:"inventory"`
	}

	err := s.accounts_db.QueryRow("SELECT name, coins, xp, score, wins, special_wins, games_total, kills, inventory FROM players WHERE name = ?", username).
		Scan(&user.Name, &user.Coins, &user.XP, &user.Score, &user.Wins, &user.SpecialWins, &user.GamesTotal, &user.Kills, &user.Inventory)
	if err != nil {
		http.Error(w, "{\"user\":null}", 404)
		return
	}

	resp := map[string]interface{}{"user": user}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func (s *ApiServer) handleGetStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != "GET" {
		w.WriteHeader(204)
		return
	}

	// URL esperado: /get-status/{username}
	parts := strings.Split(r.URL.Path, "/")
	if len(parts) < 3 {
		http.Error(w, "Missing username", 400)
		return
	}
	username := parts[2]
	origin := r.Header.Get("Origin")
	s.corsHeaders(w, origin)

	var user struct {
		Name        string `json:"username"`
		Coins       int    `json:"coins"`
		XP          int    `json:"xp"`
		Score       int    `json:"score"`
		Wins        int    `json:"wins"`
		SpecialWins int    `json:"special_wins"`
		GamesTotal  int    `json:"games_total"`
		Kills       int    `json:"kills"`
		Inventory   string `json:"inventory"`
	}

	err := s.accounts_db.QueryRow("SELECT name, coins, xp, score, wins, special_wins, games_total, kills, inventory FROM players WHERE name = ?", username).
		Scan(&user.Name, &user.Coins, &user.XP, &user.Score, &user.Wins, &user.SpecialWins, &user.GamesTotal, &user.Kills, &user.Inventory)
	if err != nil {
		http.Error(w, "User not found", 404)
		return
	}

	resp := map[string]interface{}{"user": user}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func (s *ApiServer) handleUpdateUser(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", 405)
		return
	}

	apiKey := r.Header.Get("x-api-key")
	if apiKey != s.Config.Database.ApiKey {
		http.Error(w, "Unauthorized", 403)
		return
	}

	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Invalid body", 400)
		return
	}
	defer r.Body.Close()

	var data struct {
		Username    string `json:"username"`
		Coins       int    `json:"coins"`
		XP          int    `json:"xp"`
		Score       int    `json:"score"`
		Wins        int    `json:"wins"`
		SpecialWins int    `json:"special_wins"`
		GamesTotal  int    `json:"games_total"`
		Kills       int    `json:"kills"`
	}
	if err := json.Unmarshal(body, &data); err != nil {
		http.Error(w, "Invalid JSON", 400)
		return
	}

	if data.Username == "" {
		http.Error(w, "Missing username", 400)
		return
	}

	_, err = s.accounts_db.Exec(`
		UPDATE players SET
			coins = ?,
			xp = ?,
			score = ?,
			wins = ?,
			special_wins = ?,
			games_total = games_total + ?,
			kills = kills + ?
		WHERE name = ?`, data.Coins, data.XP, data.Score, data.Wins, data.SpecialWins, data.GamesTotal, data.Kills, data.Username)
	if err != nil {
		http.Error(w, "Database error", 500)
		return
	}

	origin := r.Header.Get("Origin")
	s.corsHeaders(w, origin)
	w.Write([]byte("Updated"))
}

func (s *ApiServer) handleBuySkin(w http.ResponseWriter, r *http.Request) {
	if r.Method != "GET" {
		w.WriteHeader(204)
		return
	}

	username := s.getUserNameFromCookie(r)
	origin := r.Header.Get("Origin")
	s.corsHeaders(w, origin)

	if username == "" {
		http.Error(w, "Not logged in", 401)
		return
	}

	// URL Expected: /buy-skin/{skinId}
	parts := strings.Split(r.URL.Path, "/")
	if len(parts) < 3 {
		http.Error(w, "Missing skin ID", 400)
		return
	}
	skinID, err := strconv.Atoi(parts[2])
	if err != nil {
		http.Error(w, "Invalid skin ID", 400)
		return
	}

	price, ok := s.shopSkins[skinID]
	if !ok {
		http.Error(w, "Invalid skin ID", 400)
		return
	}

	var player struct {
		Coins     int    `json:"coins"`
		Inventory string `json:"inventory"`
	}

	err = s.accounts_db.QueryRow("SELECT coins, inventory FROM players WHERE name = ?", username).Scan(&player.Coins, &player.Inventory)
	if err != nil {
		http.Error(w, "Player not found", 404)
		return
	}

	// Parse inventory JSON
	var inventory struct {
		Skins []int               `json:"skins"`
		Items map[string]struct{} `json:"items"`
	}
	if err := json.Unmarshal([]byte(player.Inventory), &inventory); err != nil {
		inventory = struct {
			Skins []int               `json:"skins"`
			Items map[string]struct{} `json:"items"`
		}{Skins: []int{}, Items: map[string]struct{}{}}
	}

	// Verifica se já tem a skin
	for _, sId := range inventory.Skins {
		if sId == skinID {
			http.Error(w, "Skin already owned", 400)
			return
		}
	}

	if player.Coins < price {
		http.Error(w, "Not enough coins", 400)
		return
	}

	inventory.Skins = append(inventory.Skins, skinID)
	newInventory, _ := json.Marshal(inventory)

	_, err = s.accounts_db.Exec("UPDATE players SET coins = coins - ?, inventory = ? WHERE name = ?", price, string(newInventory), username)
	if err != nil {
		http.Error(w, "Database error", 500)
		return
	}

	w.Write([]byte("Skin purchased"))
}
func (s *ApiServer) handleLeaderboard(w http.ResponseWriter, r *http.Request) {
	if r.Method != "GET" {
		w.WriteHeader(204)
		return
	}

	page := 1
	limit := 10

	if p := r.URL.Query().Get("page"); p != "" {
		if pi, err := strconv.Atoi(p); err == nil && pi > 0 {
			page = pi
		}
	}

	if l := r.URL.Query().Get("limit"); l != "" {
		if li, err := strconv.Atoi(l); err == nil && li > 0 && li <= 100 {
			limit = li
		}
	}

	offset := (page - 1) * limit

	rows, err := s.accounts_db.Query(`
        SELECT name, score, coins, xp
        FROM players
        ORDER BY score DESC
        LIMIT ? OFFSET ?
    `, limit, offset)
	if err != nil {
		http.Error(w, "Database error", 500)
		return
	}
	defer rows.Close()

	type Player struct {
		Name  string `json:"name"`
		Score int    `json:"score"`
		Coins int    `json:"coins"`
		XP    int    `json:"xp"`
	}

	leaderboard := []Player{}

	for rows.Next() {
		var p Player
		if err := rows.Scan(&p.Name, &p.Score, &p.Coins, &p.XP); err != nil {
			http.Error(w, "Database error", 500)
			return
		}
		leaderboard = append(leaderboard, p)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"page":        page,
		"limit":       limit,
		"leaderboard": leaderboard,
	})
}
