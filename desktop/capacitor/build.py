#!/usr/bin/env python3
import sys
import subprocess
import os
import shutil
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent.parent
CAPACITOR_DIR = ROOT/"desktop/capacitor"
CAPACITOR_ANDROID_DIR = CAPACITOR_DIR/"android"
CLIENT_DIR = ROOT/"client"
DIST_DIR = CAPACITOR_DIR/"dist"
BUILD_DIR = CLIENT_DIR/"dist"
IS_WINDOWS = os.name == "nt"

def run(cmd, cwd=None):
    print(">", " ".join(cmd))
    subprocess.check_call(cmd, cwd=cwd,shell=True)
def gradle(task):
    return ["gradlew.bat", task] if IS_WINDOWS else ["./gradlew", task]
def build_web():
    run(["npx", "vite", "build"], cwd=CLIENT_DIR)
def cap_sync():
    run(["npx", "cap", "sync", "android"], cwd=CAPACITOR_DIR)
def generate_icons():
    assets_dir = CAPACITOR_DIR / "assets"
    assets_dir.mkdir(parents=True, exist_ok=True)
    src_icon = BUILD_DIR/"icon.png"
    dst_icon = assets_dir / "icon.png"
    shutil.copyfile(src_icon, dst_icon)
    run(["npx","@capacitor/assets","generate","--android"], cwd=CAPACITOR_DIR)
def build_android(mode="debug"):
    os.makedirs(CAPACITOR_DIR/"dist",exist_ok=True)

    build_web()
    generate_icons()
    cap_sync()

    task = "assembleDebug" if mode == "debug" else "assembleRelease"
    run(gradle(task), cwd=CAPACITOR_ANDROID_DIR)
    apk = CAPACITOR_ANDROID_DIR/(
        "app/build/outputs/apk/debug/app-debug.apk"
        if mode == "debug"
        else "app/build/outputs/apk/release/app-release.apk"
    )
    shutil.copyfile(apk,CAPACITOR_DIR/"dist/surgemd.apk")

def run_android():
    build_web()
    cap_sync()

    run(["npx", "cap", "run", "android"], cwd=CAPACITOR_DIR)

def main():
    cmd = sys.argv[1]
    if cmd == "build":
        mode = sys.argv[2] if len(sys.argv) > 2 else "debug"
        build_android(mode)
    elif cmd == "run":
        run_android()
    elif cmd=="install":
        run("npm install @capacitor/core @capacitor/android @capacitor/assets",CAPACITOR_DIR)
if __name__ == "__main__":
    main()