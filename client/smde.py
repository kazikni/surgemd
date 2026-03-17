#!/usr/bin/env python3
import sys
import subprocess
import shutil
import os
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parent
ANDROID_DIR = ROOT / "android"
RELEASE_DIR = ROOT / "release"
DIST_DIR = ROOT / "dist"
ELECTRON_DIR = ROOT / "electron"

IS_WINDOWS = os.name == "nt"

# ---------------------------
# Utils
# ---------------------------

def die(msg):
    print(f"❌ {msg}")
    sys.exit(1)

def run(cmd, cwd=None):
    print(">", " ".join(["cmd","/c"]+cmd))
    subprocess.check_call(["cmd","/c"]+cmd if IS_WINDOWS else cmd, cwd=cwd)

def has(cmd):
    return shutil.which(cmd) is not None

def require(cmd, name=None):
    if not has(cmd):
        die(f"{name or cmd} not found in PATH")

def gradle(task):
    return ["gradlew.bat", task] if IS_WINDOWS else ["./gradlew", task]

# ---------------------------
# Core steps
# ---------------------------

def build_vite():
    require("deno", "Deno")
    run(["deno", "task", "build"], cwd=ROOT)

def cap_sync():
    require("node", "Node.js")
    require("npm", "npm")
    run(["npx","@capacitor/assets", "generate", "--android", "--assetPath", "public"], cwd=ROOT)
    run(["npx","cap", "sync", "android"], cwd=ROOT)

def build_android(mode):
    build_vite()
    cap_sync()

    tasks = ["assembleDebug"] if mode == "debug" else ["assembleRelease", "bundleRelease"]
    for t in tasks:
        run(gradle(t), cwd=ANDROID_DIR)

    out = RELEASE_DIR / "android"
    out.mkdir(parents=True, exist_ok=True)

    if mode == "debug":
        shutil.copy(
            ANDROID_DIR / "app/build/outputs/apk/debug/app-debug.apk",
            out / "surgemd-debug.apk"
        )
    else:
        shutil.copy(
            ANDROID_DIR / "app/build/outputs/apk/release/app-release.apk",
            out / "surgemd-release.apk"
        )
        shutil.copy(
            ANDROID_DIR / "app/build/outputs/bundle/release/app-release.aab",
            out / "surgemd-release.aab"
        )

def build_electron(platform):
    build_vite()

    RELEASE_DIR.mkdir(exist_ok=True)
    resources = RELEASE_DIR / "resources"
    resources.mkdir(parents=True, exist_ok=True)

    pkg = {
        "name": "surgemd",
        "version": "1.0.0",
        "main": "electron/main.js",
        "author": {"name": "kaklik"},
        "description": "A .io Game",
        "type": "commonjs",
    }

    (ROOT / "package.json").write_text(json.dumps(pkg, indent=2))
    (resources / "package.json").write_text(json.dumps(pkg, indent=2))

    if (resources / "main").exists():
        shutil.rmtree(resources / "main")
    if (resources / "electron").exists():
        shutil.rmtree(resources / "electron")

    shutil.copytree(DIST_DIR, resources / "main")
    shutil.copytree(ELECTRON_DIR, resources / "electron")

    run([
        "npx",
        "@electron/packager",
        "./release/resources",
        f"--platform={platform}",
        "--arch=x64",
        "--out=release",
        "--overwrite",
        "--icon=dist/favicon.ico",
        "--app-version=1.0.0",
        "--prune=true",
        "--no-asar",
        "--ignore=node_modules",
        "--ignore=deno.lock",
        "--ignore=deno.json",
        "--ignore=package-lock.json",
        "--electron-version=31.3.0"
    ], cwd=ROOT)

# ---------------------------
# Install
# ---------------------------

def install_all():
    install_electron()
    install_capacitor()
    install_essentials()

def install_essentials():
    require("node", "Node.js")
    require("npm", "npm")
    run([
        "npm", "i",
        "vite",
        "@sveltejs/vite-plugin-svelte",
        "fdir",
        "sass",
        "canvas",
        "maxrects-packer",
        "minimatch",
        "types",
        "semver"
    ], cwd=ROOT)

def install_electron():
    run(["npm", "i", "electron@31.3.0", "@electron/packager"], cwd=ROOT)

def install_capacitor():
    run([
        "npm", "i",
        "@capacitor/cli",
        "@capacitor/core",
        "@capacitor/android",
        "@capacitor/assets"
    ], cwd=ROOT)

# ---------------------------
# CLI
# ---------------------------

def main():
    if len(sys.argv) < 2:
        die("Usage: smde.py <build|install> [...]")

    cmd = sys.argv[1]

    if cmd == "build":
        if len(sys.argv) < 3:
            die("build requires target: android | windows | linux")

        target = sys.argv[2]

        if target == "android":
            mode = sys.argv[3] if len(sys.argv) > 3 else "debug"
            build_android(mode)
        elif target == "windows":
            build_electron("win32")
        elif target == "linux":
            build_electron("linux")
        else:
            die("Unknown build target")

    elif cmd == "install":
        if len(sys.argv) == 2:
            install_all()
        else:
            what = sys.argv[2]
            if what == "capacitor":
                install_capacitor()
            elif what == "electron":
                install_electron()
            elif what == "essentials":
                install_essentials()
            else:
                die("Unknown install target")
    else:
        die("Unknown command")

    print("✅ Done.")

if __name__ == "__main__":
    main()
