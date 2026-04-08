//go:build windows

package smdt

import (
	"syscall"
	"unsafe"

	webview "github.com/webview/webview_go"
)

var (
	user32 = syscall.NewLazyDLL("user32.dll")

	getActiveWindow  = user32.NewProc("GetActiveWindow")
	loadImage        = user32.NewProc("LoadImageW")
	sendMessage      = user32.NewProc("SendMessageW")
	getWindowLong    = user32.NewProc("GetWindowLongW")
	setWindowLong    = user32.NewProc("SetWindowLongW")
	setWindowPos     = user32.NewProc("SetWindowPos")
	getWindowRect    = user32.NewProc("GetWindowRect")
	getSystemMetrics = user32.NewProc("GetSystemMetrics")
)

type RECT struct {
	Left   int32
	Top    int32
	Right  int32
	Bottom int32
}

const (
	IMAGE_ICON      = 1
	LR_LOADFROMFILE = 0x00000010

	WM_SETICON = 0x0080
	ICON_SMALL = 0
	ICON_BIG   = 1
)

var (
	fsPrevStyle uintptr
	fsPrevRect  RECT
	fsActive    bool
)

func HWNDSetIcon(hwnd uintptr, path string) {
	iconPath, _ := syscall.UTF16PtrFromString(path)

	hIcon, _, _ := loadImage.Call(
		0,
		uintptr(unsafe.Pointer(iconPath)),
		IMAGE_ICON,
		0,
		0,
		LR_LOADFROMFILE,
	)

	if hIcon == 0 {
		return
	}

	sendMessage.Call(hwnd, WM_SETICON, ICON_SMALL, hIcon)
	sendMessage.Call(hwnd, WM_SETICON, ICON_BIG, hIcon)
}

func HWNDFullscreen(hwnd uintptr, enable bool) {
	const (
		WS_OVERLAPPEDWINDOW = 0x00CF0000

		SWP_FRAMECHANGED = 0x0020
		SWP_NOZORDER     = 0x0004

		SM_CXSCREEN = 0
		SM_CYSCREEN = 1
	)

	var GWL_STYLE int32 = -16

	if enable && !fsActive {

		getWindowRect.Call(
			hwnd,
			uintptr(unsafe.Pointer(&fsPrevRect)),
		)

		style, _, _ := getWindowLong.Call(
			hwnd,
			uintptr(int(GWL_STYLE)),
		)

		fsPrevStyle = style

		setWindowLong.Call(
			hwnd,
			uintptr(int(GWL_STYLE)),
			style&^WS_OVERLAPPEDWINDOW,
		)

		width, _, _ := getSystemMetrics.Call(SM_CXSCREEN)
		height, _, _ := getSystemMetrics.Call(SM_CYSCREEN)

		setWindowPos.Call(
			hwnd,
			0,
			0,
			0,
			width,
			height,
			SWP_FRAMECHANGED|SWP_NOZORDER,
		)

		fsActive = true
		return
	}

	if !enable && fsActive {

		setWindowLong.Call(
			hwnd,
			uintptr(int(GWL_STYLE)),
			fsPrevStyle,
		)

		setWindowPos.Call(
			hwnd,
			0,
			uintptr(fsPrevRect.Left),
			uintptr(fsPrevRect.Top),
			uintptr(fsPrevRect.Right-fsPrevRect.Left),
			uintptr(fsPrevRect.Bottom-fsPrevRect.Top),
			SWP_FRAMECHANGED|SWP_NOZORDER,
		)

		fsActive = false
	}
}
func Get_Active_HWND() uintptr {
	ret, _, _ := getActiveWindow.Call()
	return ret
}
func Fullscreen(w webview.WebView, enable bool) {
	HWNDFullscreen(Get_Active_HWND(), enable)
}
func SetIcon(w webview.WebView, path string) {
	HWNDSetIcon(Get_Active_HWND(), path)
}
