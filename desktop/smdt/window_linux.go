//go:build linux

package smdt

/*
#cgo pkg-config: gtk+-3.0
#include <gtk/gtk.h>

// wrapper seguro
void set_icon(GtkWidget* win, const char* path) {
	if (!win) return;

	GError *err = NULL;
	gtk_window_set_icon_from_file(GTK_WINDOW(win), path, &err);

	if (err) {
		g_error_free(err);
	}
}
*/
import "C"

import (
	"unsafe"

	webview "github.com/webview/webview_go"
)

func SetIcon(w webview.WebView, path string) {
	w.Dispatch(func() {
		ptr := w.Native()
		if ptr == nil {
			return
		}

		cpath := C.CString(path)
		defer C.free(unsafe.Pointer(cpath))

		C.set_icon((*C.GtkWidget)(ptr), cpath)
	})
}

func Fullscreen(w webview.WebView, enable bool) {
	if enable {
		w.Dispatch(func() {
			w.Eval(`(function(){
				const el = document.documentElement;
				if (el.requestFullscreen) el.requestFullscreen();
				else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
			})();`)
		})
	} else {
		w.Dispatch(func() {
			w.Eval(`(function(){
				if (document.exitFullscreen) document.exitFullscreen();
				else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
			})();`)
		})
	}
}
