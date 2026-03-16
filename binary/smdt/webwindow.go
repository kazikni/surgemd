package smdt

/*import (
	"unsafe"

	webview "github.com/webview/webview_go"
)

type WebWindow interface {
	Window
	Navigate(string)
}

type webWindow struct {
	win  Window
	view webview.WebView
}

func NewWebWindow(title string, w, h int, debug bool) WebWindow {
	win := NewWindow(title, w, h)

	view := webview.NewWithOptions(webview.WebViewOptions{
		Debug:  debug,
		Window: unsafe.Pointer(win.Handle()),
	})

	view.SetSize(w, h, webview.HintNone)

	return &webWindow{
		win:  win,
		view: view,
	}
}

func (w *webWindow) Navigate(url string) {
	w.view.Navigate(url)
}

func (w *webWindow) Run() {
	go func() {
		for {
			if !w.win.Tick() {
				break
			}
		}
	}()

	w.view.Run()
}

func (w *webWindow) Tick() bool {
	return w.win.Tick()
}

func (w *webWindow) Destroy() {
	w.view.Destroy()
	w.win.Destroy()
}

func (w *webWindow) Events() *WindowEvents {
	return w.win.Events()
}

func (w *webWindow) Handle() uintptr {
	return w.win.Handle()
}

func (w *webWindow) SetTitle(t string) {
	w.win.SetTitle(t)
	w.view.SetTitle(t)
}

func (w *webWindow) SetSize(x, y uint)     { w.win.SetSize(x, y) }
func (w *webWindow) GetSize() (uint, uint) { return w.win.GetSize() }
func (w *webWindow) SetIcon(p string)      { w.win.SetIcon(p) }
func (w *webWindow) Fullscreen(b bool)     { w.win.Fullscreen(b) }
func (w *webWindow) Borderless(b bool)     { w.win.Borderless(b) }
func (w *webWindow) AlwaysOnTop(b bool)    { w.win.AlwaysOnTop(b) }
func (w *webWindow) Show()                 { w.win.Show() }
func (w *webWindow) Hide()                 { w.win.Hide() }
func (w *webWindow) GetTitle() string      { return w.win.GetTitle() }
*/
