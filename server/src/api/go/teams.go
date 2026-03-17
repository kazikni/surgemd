package surgemd_api

import (
	"encoding/json"
	"math/rand"
	"net/http"
	"time"

	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
)

type Team struct {
	ID          string
	Code        string
	Leader      string
	Locked      bool
	AutoFill    bool
	Members     []string
	Connections map[string]*websocket.Conn
}

func RandString(n int) string {
	letters := []rune("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789")
	out := make([]rune, n)
	for i := range out {
		out[i] = letters[rand.Intn(len(letters))]
	}
	return string(out)
}
func (t *Team) Broadcast(msg any) {
	data, _ := json.Marshal(msg)
	for player, conn := range t.Connections {
		if err := conn.WriteMessage(websocket.TextMessage, data); err != nil {
			conn.Close()
			delete(t.Connections, player)
		}
	}
}
func (t *Team) Snapshot() map[string]any {
	return map[string]any{
		"type":     "snapshot",
		"id":       t.ID,
		"code":     t.Code,
		"leader":   t.Leader,
		"locked":   t.Locked,
		"autofill": t.AutoFill,
		"members":  t.Members,
	}
}
func (s *ApiServer) handleTeamConnect(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Player string `json:"player"`
		Code   string `json:"code"`
	}
	json.NewDecoder(r.Body).Decode(&req)

	if req.Player == "" {
		http.Error(w, "invalid player", 400)
		return
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	var team *Team
	var ok bool

	if req.Code == "" {
		code := RandString(6)
		team = &Team{
			ID:          RandString(10),
			Code:        code,
			Leader:      req.Player,
			Members:     []string{req.Player},
			Locked:      false,
			AutoFill:    true,
			Connections: make(map[string]*websocket.Conn),
		}
		s.Teams[code] = team
		req.Code = code
	} else {
		team, ok = s.Teams[req.Code]
		if !ok {
			http.Error(w, "team not found", 404)
			return
		}

		if team.Locked {
			http.Error(w, "team locked", 403)
			return
		}

		for _, m := range team.Members {
			if m == req.Player {
				goto SEND_RESPONSE
			}
		}

		team.Members = append(team.Members, req.Player)
		team.Broadcast(map[string]any{
			"type":   "member_joined",
			"player": req.Player,
		})
	}
SEND_RESPONSE:
	json.NewEncoder(w).Encode(map[string]any{
		"status": "ok",
		"code":   req.Code,
		"ws":     "/team/ws/" + req.Code + "/" + req.Player,
	})
}

func (s *ApiServer) handleTeamWS(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	code := vars["code"]
	player := vars["player"]

	s.mu.Lock()
	team, ok := s.Teams[code]
	s.mu.Unlock()

	if !ok {
		http.Error(w, "team not found", 404)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}

	s.mu.Lock()
	team.Connections[player] = conn
	s.mu.Unlock()

	team.Broadcast(map[string]any{
		"type":   "player_connected",
		"player": player,
	})

	conn.WriteJSON(team.Snapshot())

	ticker := time.NewTicker(time.Second)
	go func() {
		for range ticker.C {
			s.mu.Lock()
			_, ok := team.Connections[player]
			s.mu.Unlock()
			if !ok {
				return
			}
			conn.WriteJSON(team.Snapshot())
		}
	}()

	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			break
		}
		var cmd map[string]any
		json.Unmarshal(msg, &cmd)

		s.HandleTeamCommand(team, player, cmd)
	}

	conn.Close()

	s.mu.Lock()
	delete(team.Connections, player)

	newList := make([]string, 0, len(team.Members))
	for _, m := range team.Members {
		if m != player {
			newList = append(newList, m)
		}
	}
	team.Members = newList

	if player == team.Leader {
		team.ReassignLeader()
	}

	if len(team.Members) == 0 {
		delete(s.Teams, code)
		s.mu.Unlock()
		return
	}

	s.mu.Unlock()

	team.Broadcast(map[string]any{
		"type":   "player_disconnected",
		"player": player,
	})
}
func (t *Team) ReassignLeader() {
	if len(t.Members) == 0 {
		return
	}
	t.Leader = t.Members[0]
}
func (s *ApiServer) HandleTeamCommand(team *Team, player string, cmd map[string]any) {
	t := cmd["type"].(string)

	switch t {

	case "leave":
		if c, ok := team.Connections[player]; ok {
			c.Close()
		}

	case "kick":
		if player != team.Leader {
			return
		}
		target := cmd["target"].(string)

		team.Broadcast(map[string]any{
			"type":   "kicked",
			"player": target,
		})
		if c, ok := team.Connections[target]; ok {
			c.Close()
		}

	case "lock":
		if player != team.Leader {
			return
		}
		team.Locked = cmd["value"].(bool)
		team.Broadcast(map[string]any{
			"type":   "lock_changed",
			"locked": team.Locked,
		})

	case "autofill":
		if player != team.Leader {
			return
		}
		team.AutoFill = cmd["value"].(bool)
		team.Broadcast(map[string]any{
			"type":     "autofill_changed",
			"autofill": team.AutoFill,
		})
	}
}
