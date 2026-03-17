package surgemd_api

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
)
func (s *ApiServer) handleDeletePost(w http.ResponseWriter, r *http.Request){
    if r.Method != "DELETE" {
        w.WriteHeader(http.StatusNoContent)
        return
    }
	origin := r.Header.Get("Origin")

    username := s.getUserNameFromCookie(r)
    if username == "" {
        http.Error(w, "Not logged in", 401)
        return
    }

    parts := strings.Split(r.URL.Path, "/")
    if len(parts) < 4 {
        http.Error(w, "Missing post id", 400)
        return
    }
    postID, err := strconv.Atoi(parts[3])
    if err != nil {
        http.Error(w, "Invalid post id", 400)
        return
    }

    var author string
    err = s.forum_db.QueryRow("SELECT author FROM posts WHERE id = ?", postID).Scan(&author)
    if err != nil {
        http.Error(w, "Post not found", 404)
        return
    }
    if author != username {
        http.Error(w, "Unauthorized", 403)
        return
    }

    _, err = s.forum_db.Exec("DELETE FROM posts WHERE id = ?", postID)
    if err != nil {
        http.Error(w, "DB error", 500)
        return
    }
	s.corsHeaders(w, origin)

    w.Write([]byte("Post deleted"))
}
func (s *ApiServer) handleDeleteComment(w http.ResponseWriter, r *http.Request) {
    if r.Method != "DELETE" {
        w.WriteHeader(http.StatusNoContent)
        return
    }
	origin := r.Header.Get("Origin")

    username := s.getUserNameFromCookie(r)
    if username == "" {
        http.Error(w, "Not logged in", 401)
        return
    }

    parts := strings.Split(r.URL.Path, "/")
    if len(parts) < 4 {
        http.Error(w, "Missing comment id", 400)
        return
    }
    commentID, err := strconv.Atoi(parts[3])
    if err != nil {
        http.Error(w, "Invalid comment id", 400)
        return
    }

    var author string
    err = s.forum_db.QueryRow("SELECT author FROM comments WHERE id = ?", commentID).Scan(&author)
    if err != nil {
        http.Error(w, "Comment not found", 404)
        return
    }
    if author != username {
        http.Error(w, "Unauthorized", 403)
        return
    }

    _, err = s.forum_db.Exec("DELETE FROM comments WHERE id = ?", commentID)
    if err != nil {
        http.Error(w, "DB error", 500)
        return
    }
	s.corsHeaders(w, origin)

    w.Write([]byte("Comment deleted"))
}

func (s *ApiServer) handleCreatePost(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	username := s.getUserNameFromCookie(r)
	if username == "" {
		http.Error(w, "Not logged in", 401)
		return
	}
	var in struct {
		Title string `json:"title"`
		Body  string `json:"body"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		http.Error(w, "Invalid JSON", 400)
		return
	}
	if strings.TrimSpace(in.Title) == "" || strings.TrimSpace(in.Body) == "" {
		http.Error(w, "Missing title or body", 400)
		return
	}
	res, err := s.forum_db.Exec("INSERT INTO posts (author, title, body) VALUES (?, ?, ?)", username, in.Title, in.Body)
	if err != nil {
		http.Error(w, "DB error", 500)
		return
	}
	id, _ := res.LastInsertId()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"id": id})
}

// GET /forum/posts?limit=20&offset=0
func (s *ApiServer) handleListPosts(w http.ResponseWriter, r *http.Request) {
	limit := 50
	offset := 0
	q := r.URL.Query()
	if q.Get("limit") != "" {
		if v, err := strconv.Atoi(q.Get("limit")); err == nil {
			limit = v
		}
	}
	if q.Get("offset") != "" {
		if v, err := strconv.Atoi(q.Get("offset")); err == nil {
			offset = v
		}
	}
	rows, err := s.forum_db.Query("SELECT id, author, title, substr(body,1,400) as preview, created_at FROM posts ORDER BY created_at DESC LIMIT ? OFFSET ?", limit, offset)
	if err != nil {
		http.Error(w, "DB error", 500)
		return
	}
	defer rows.Close()
	type P struct {
		ID        int    `json:"id"`
		Author    string `json:"author"`
		Title     string `json:"title"`
		Preview   string `json:"preview"`
		CreatedAt string `json:"created_at"`
	}
	var out []P
	for rows.Next() {
		var p P
		rows.Scan(&p.ID, &p.Author, &p.Title, &p.Preview, &p.CreatedAt)
		out = append(out, p)
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(out)
}

// GET /forum/post/{id}
func (s *ApiServer) handleGetPost(w http.ResponseWriter, r *http.Request) {
	parts := strings.Split(r.URL.Path, "/")
	if len(parts) < 4 {
		http.Error(w, "Missing id", 400)
		return
	}
	id, err := strconv.Atoi(parts[3])
	if err != nil {
		http.Error(w, "Invalid id", 400)
		return
	}
	var post struct {
		ID        int    `json:"id"`
		Author    string `json:"author"`
		Title     string `json:"title"`
		Body      string `json:"body"`
		CreatedAt string `json:"created_at"`
	}
	err = s.forum_db.QueryRow("SELECT id, author, title, body, created_at FROM posts WHERE id = ?", id).
		Scan(&post.ID, &post.Author, &post.Title, &post.Body, &post.CreatedAt)
	if err != nil {
		http.Error(w, "Not found", 404)
		return
	}
	// fetch comments
	rows, _ := s.forum_db.Query("SELECT id, author, body, created_at FROM comments WHERE post_id = ? ORDER BY created_at ASC", id)
	defer rows.Close()
	type C struct {
		ID        int    `json:"id"`
		Author    string `json:"author"`
		Body      string `json:"body"`
		CreatedAt string `json:"created_at"`
	}
	var comments []C
	for rows.Next() {
		var c C
		rows.Scan(&c.ID, &c.Author, &c.Body, &c.CreatedAt)
		comments = append(comments, c)
	}
	resp := map[string]interface{}{"post": post, "comments": comments}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func (s *ApiServer) handleCreateComment(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	username := s.getUserNameFromCookie(r)
	if username == "" {
		http.Error(w, "Not logged in", 401)
		return
	}
	parts := strings.Split(r.URL.Path, "/")
	if len(parts) < 4 {
		http.Error(w, "Missing id", 400)
		return
	}
	id, err := strconv.Atoi(parts[3])
	if err != nil {
		http.Error(w, "Invalid id", 400)
		return
	}
	var in struct {
		Body string `json:"body"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		http.Error(w, "Invalid JSON", 400)
		return
	}
	if strings.TrimSpace(in.Body) == "" {
		http.Error(w, "Empty comment", 400)
		return
	}
	_, err = s.forum_db.Exec("INSERT INTO comments (post_id, author, body) VALUES (?, ?, ?)", id, username, in.Body)
	if err != nil {
		http.Error(w, "DB error", 500)
		return
	}
	w.Write([]byte("ok"))
}
func (s *ApiServer) handlePost(w http.ResponseWriter, r *http.Request) {
	if strings.HasSuffix(r.URL.Path, "/comment") {
		s.handleCreateComment(w, r)
	} else {
		s.handleGetPost(w, r)
	}
}
