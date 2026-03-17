package surgemd_api

import (
	"encoding/json"
	"net/http"
	"strings"
)

type NewsData struct {
	Title   string `json:"title"`
	Id      string `json:"id"`
	Content string `json:"content"`
}

func (s *ApiServer) handleGetNewsDefs(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(s.News.Data)
}
func (s *ApiServer) handleGetNewsExpanded(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/plain")
	// URL Expected: /expanded/{id}
	parts := strings.Split(r.URL.Path, "/")
	id := parts[len(parts)-1]
	_, ok := s.News.ExpandedContent[id]
	if !ok {
		http.Error(w, "News article not found", http.StatusNotFound)
		return
	}
	w.Write([]byte(s.News.ExpandedContent[id]))
}
