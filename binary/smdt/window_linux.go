//go:build linux

package smdt

type linuxWindow struct {
	events WindowEvents
}

func NewWindow(title string, w, h int) Window {
	return &linuxWindow{}
}

func (w *linuxWindow) Handle() uintptr { return 0 }

func (w *linuxWindow) Show() {}
func (w *linuxWindow) Hide() {}

func (w *linuxWindow) Run()       {}
func (w *linuxWindow) Tick() bool { return false }

func (w *linuxWindow) Destroy() {}

func (w *linuxWindow) Events() *WindowEvents { return &w.events }

func (w *linuxWindow) SetSize(x, y uint)     {}
func (w *linuxWindow) GetSize() (uint, uint) { return 0, 0 }

func (w *linuxWindow) SetTitle(t string) {}
func (w *linuxWindow) GetTitle() string  { return "" }

func (w *linuxWindow) SetIcon(path string) {}

func (w *linuxWindow) Fullscreen(bool)  {}
func (w *linuxWindow) Borderless(bool)  {}
func (w *linuxWindow) AlwaysOnTop(bool) {}
