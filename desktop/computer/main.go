package main

import (
	"encoding/base64"
	"fmt"
	"net"
	"net/http"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"runtime"
	"sync"
	"time"

	"syscall"

	webview "github.com/webview/webview_go"
	"smde.io/smdt"
)

var (
	serverProc *exec.Cmd
	serverLock sync.Mutex
	dev_mode   bool
	ports      = []int{3000, 6835, 9255, 2314}
	window     webview.WebView
)

func stopServerInternal() error {
	if serverProc == nil || serverProc.Process == nil {
		return nil
	}

	fmt.Println("Stopping server...")
	_ = serverProc.Process.Signal(os.Interrupt)

	done := make(chan error, 1)
	go func() { done <- serverProc.Wait() }()

	select {
	case <-done:
	case <-time.After(2 * time.Second):
		_ = serverProc.Process.Kill()
	}

	serverProc = nil
	return nil
}
func JStoggleFullscreen(fullscreen bool) {
	smdt.Fullscreen(window, fullscreen)
}

func findFreePort() (int, error) {
	for _, p := range ports {
		ln, err := net.Listen("tcp", fmt.Sprintf("127.0.0.1:%d", p))
		if err == nil {
			ln.Close()
			return p, nil
		}
	}
	return 0, fmt.Errorf("no port available")
}

func JSreadFile(rel string) (string, error) {
	b, e := os.ReadFile(rel)
	return string(b), e
}

func JSwriteFile(rel, content string) error {
	return os.WriteFile(rel, []byte(content), 0644)
}

func JSreadFileB(rel string) (string, error) {
	b, e := os.ReadFile(rel)
	if e != nil {
		return "", e
	}
	return base64.StdEncoding.EncodeToString(b), nil
}

func JSwriteFileB(rel, b64 string) error {
	b, e := base64.StdEncoding.DecodeString(b64)
	if e != nil {
		return e
	}
	return os.WriteFile(rel, b, 0644)
}

func JSlistDir(rel string) ([]string, error) {
	e, err := os.ReadDir(rel)
	if err != nil {
		return nil, err
	}
	out := make([]string, len(e))
	for i, v := range e {
		out[i] = v.Name()
	}
	return out, nil
}

func JSisBinaryVersion() bool { return true }

func shellCommand(cmd string) *exec.Cmd {
	if runtime.GOOS == "windows" {
		return exec.Command("cmd", "/C", cmd)
	}
	return exec.Command("sh", "-c", cmd)
}

func JSexecCommand(command string) (string, error) {
	out, err := shellCommand(command).CombinedOutput()
	return string(out), err
}

func JSexecServer(port int, mode, settings, password string) error {
	serverLock.Lock()
	defer serverLock.Unlock()

	stopServerInternal()

	var cmd *exec.Cmd

	args := []string{
		"start", "game",
		"--port", fmt.Sprint(port),
		"--mode", mode,
		"--mods-state", "save/mods_state.json",
		"--mode-settings", settings,
	}

	if password != "" {
		args = append(args, "--password", password)
	}

	if dev_mode {
		cmd = exec.Command("deno", append([]string{
			"run", "-A", "../server/src/game/cli.ts",
		}, args...)...)
		fmt.Println("DEV → deno", args)
	} else {
		exe := "./server"
		if runtime.GOOS == "windows" {
			exe = "./server.exe"
		}
		cmd = exec.Command(exe, args...)
		fmt.Println("PROD →", exe, args)
	}

	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Start(); err != nil {
		return err
	}

	serverProc = cmd

	go func() {
		err := cmd.Wait()
		serverLock.Lock()
		serverProc = nil
		serverLock.Unlock()

		if err != nil {
			fmt.Println("Server crashed:", err)
		}
	}()

	return nil
}

func JSstopServer() error {
	serverLock.Lock()
	defer serverLock.Unlock()
	return stopServerInternal()
}
func noCache(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")
		w.Header().Set("Pragma", "no-cache")
		w.Header().Set("Expires", "0")
		w.Header().Set("Surrogate-Control", "no-store")
		h.ServeHTTP(w, r)
	})
}
func runWebServer(w webview.WebView) {
	gameDir, _ := filepath.Abs("./files")
	port, err := findFreePort()
	if err != nil {
		panic(err)
	}

	go func() {
		addr := fmt.Sprintf("127.0.0.1:%d", port)
		fmt.Println("Server in http://" + addr)
		http.ListenAndServe(addr, noCache(http.FileServer(http.Dir(gameDir))))
	}()

	w.Navigate(fmt.Sprintf("http://127.0.0.1:%d", port))
	w.Run()
}

func main() {
	os.MkdirAll("save", os.ModeDir)

	w := webview.New(true)
	defer w.Destroy()
	defer stopServerInternal()

	sig := make(chan os.Signal, 1)
	signal.Notify(sig, os.Interrupt, syscall.SIGTERM)
	go func() {
		<-sig
		stopServerInternal()
		os.Exit(0)
	}()

	window = w
	w.SetTitle("Surgemd.io")
	w.SetSize(1280, 720, webview.HintNone)

	w.Bind("go_is_binary_version", JSisBinaryVersion)
	w.Bind("go_fs_readFile", JSreadFile)
	w.Bind("go_fs_writeFile", JSwriteFile)
	w.Bind("go_fs_readFileB", JSreadFileB)
	w.Bind("go_fs_writeFileB", JSwriteFileB)
	w.Bind("go_fs_listDir", JSlistDir)

	w.Bind("go_exec_server", JSexecServer)
	w.Bind("go_stop_server", JSstopServer)
	w.Bind("go_exec_cmd", JSexecCommand)
	w.Bind("go_toggle_fullscreen", JStoggleFullscreen)

	if len(os.Args) > 1 && os.Args[1] == "dev" {
		dev_mode = true
		w.Navigate("http://localhost:3000")
		w.Run()
		smdt.SetIcon(w, "../client/public/favicon.ico")
		return
	}

	smdt.SetIcon(w, "../client/public/favicon.ico")

	runWebServer(w)
}
