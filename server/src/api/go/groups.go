package surgemd_api

import (
	"encoding/json"
	"math/rand"
	"net/http"

	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
)

type PlayerConnection struct {
	Id   uint64
	Name string
	Conn *websocket.Conn
	Role uint8
}

func (p *PlayerConnection) Send(msg any) error {
	return p.Conn.WriteJSON(msg)
}
func (p *PlayerConnection) Close() {
	p.Conn.Close()
}

type Group struct {
	Server *ApiServer
	Code   string
	Leader uint64

	Locked   bool
	AutoFill bool

	Connections map[uint64]*PlayerConnection
}

func (g *Group) AddPlayer(p *PlayerConnection) {
	g.Connections[p.Id] = p
	p.Send(g.Snapshot(p.Id))
	go g.ListenPlayer(p)
}
func (g *Group) ListenPlayer(p *PlayerConnection) {
	defer g.RemovePlayer(p.Id)
	for {
		_, msg, err := p.Conn.ReadMessage()
		if err != nil {
			break
		}
		var cmd map[string]any
		if json.Unmarshal(msg, &cmd) != nil {
			continue
		}
		g.HandleCommand(
			p.Id,
			cmd,
		)
	}
}
func (g *Group) RemovePlayer(id uint64) {
	if p, ok := g.Connections[id]; ok {
		p.Close()
		delete(g.Connections, id)
	}
	if len(g.Connections) == 0 {
		delete(g.Server.Groups, g.Code)
	}
}
func (g *Group) Broadcast(msg any) {
	for id, p := range g.Connections {
		if err := p.Send(msg); err != nil {
			p.Close()
			delete(g.Connections, id)
		}
	}
}
func (g *Group) IsLeader(id uint64) bool {
	return g.Leader == id || g.Connections[id].Role == 1
}
func (t *Group) Snapshot(self uint64) map[string]any {
	return map[string]any{
		"type":     "snapshot",
		"code":     t.Code,
		"leader":   t.Leader,
		"locked":   t.Locked,
		"autofill": t.AutoFill,
		"self":     self,
	}
}
func (g *Group) HandleCommand(player uint64, cmd map[string]any) {
	t, _ := cmd["type"].(string)

	switch t {
	case "leave":
		g.RemovePlayer(player)
	case "kick":
		if !g.IsLeader(player) {
			return
		}
		target := uint64(cmd["target"].(float64))
		if g.Leader == target {
			return
		}
		g.Broadcast(map[string]any{
			"type":   "kicked",
			"player": target,
		})
		g.RemovePlayer(target)
	case "lock":
		if !g.IsLeader(player) {
			return
		}
		g.Locked = cmd["value"].(bool)
		g.Broadcast(map[string]any{
			"type":   "lock_changed",
			"locked": g.Locked,
		})
	case "autofill":
		if !g.IsLeader(player) {
			return
		}
		g.AutoFill = cmd["value"].(bool)
		g.Broadcast(map[string]any{
			"type":     "autofill_changed",
			"autofill": g.AutoFill,
		})
	}
}
func NewGroup(server *ApiServer) *Group {
	group := &Group{
		Code: RandString(6),

		Leader: 0,

		Locked:   false,
		AutoFill: true,

		Server: server,

		Connections: make(
			map[uint64]*PlayerConnection,
		),
	}
	server.Groups[group.Code] = group
	return group
}
func RandString(n int) string {
	letters := []rune("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789")
	out := make([]rune, n)
	for i := range out {
		out[i] = letters[rand.Intn(len(letters))]
	}
	return string(out)
}
func (s *ApiServer) handleGroupCreateWS(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	player := &PlayerConnection{
		Id:   uint64(rand.Int63()),
		Conn: conn,
	}
	group := NewGroup(s)
	group.Leader = player.Id
	group.AddPlayer(player)
}
func (s *ApiServer) handleGroupJoinWS(w http.ResponseWriter, r *http.Request) {
	code := mux.Vars(r)["code"]
	group, ok := s.Groups[code]

	if !ok {
		http.Error(
			w,
			"group not found",
			404,
		)
		return
	}

	if group.Locked {
		http.Error(
			w,
			"group locked",
			403,
		)
		return
	}

	conn, err := upgrader.Upgrade(
		w,
		r,
		nil,
	)

	if err != nil {
		return
	}

	player := &PlayerConnection{
		Id:   uint64(rand.Int63()),
		Conn: conn,
	}

	group.AddPlayer(player)

	group.Broadcast(map[string]any{
		"type":   "member_joined",
		"player": player.Id,
	})
}
