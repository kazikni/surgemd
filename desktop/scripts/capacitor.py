#!/usr/bin/env python3
import sys
import subprocess
import os
import shutil
from pathlib import Path

ROOT=Path(__file__).resolve().parent.parent.parent
CAPACITOR_DIR=ROOT/"desktop/capacitor"
CAPACITOR_ANDROID_DIR=CAPACITOR_DIR/"android"
CLIENT_DIR=ROOT/"client"
DIST_DIR=ROOT/"desktop/dist"
BUILD_DIR=CLIENT_DIR/"dist"
IS_WINDOWS=os.name=="nt"

def run(cmd,cwd=None):
    print(">", " ".join(map(str,cmd)))
    subprocess.check_call(cmd,cwd=cwd)

def gradle(task):
    return ["gradlew.bat",task] if IS_WINDOWS else ["sh","gradlew",task]

def build_web():
    run(["deno","task","build"],cwd=CLIENT_DIR)

def cap_sync():
    run(["npx","cap","sync","android"],cwd=CAPACITOR_DIR)

def generate_icons():
    assets_dir=CAPACITOR_DIR/"assets"
    assets_dir.mkdir(parents=True,exist_ok=True)

    src_icon=BUILD_DIR/"icon.png"
    dst_icon=assets_dir/"icon.png"

    shutil.copyfile(src_icon,dst_icon)

    run(["npx","@capacitor/assets","generate","--android"],cwd=CAPACITOR_DIR)

def build_android(mode="debug"):
    DIST_DIR.mkdir(parents=True,exist_ok=True)

    if mode=="debug":
        build_web()
        generate_icons()

    cap_sync()

    task="assembleDebug" if mode=="debug" else "assembleRelease"
    run(gradle(task),cwd=CAPACITOR_ANDROID_DIR)

    apk_dir=CAPACITOR_ANDROID_DIR/"app/build/outputs/apk"

    apks=[
        apk_dir/"release/app-release.apk",
        apk_dir/"debug/app-debug.apk",
        apk_dir/"release/app-release-unsigned.apk"
    ]

    for apk in apks:
        if apk.exists():
            shutil.copyfile(apk,DIST_DIR/"surgemd.apk")
            print(f"APK: {apk}")
            return

    raise FileNotFoundError("Nenhum APK encontrado")

def run_android():
    build_web()
    cap_sync()
    run(["npx","cap","run","android"],cwd=CAPACITOR_DIR)

def main():
    if len(sys.argv)<2:
        print("usage: cap.py [build|run|install]")
        return

    cmd=sys.argv[1]

    if cmd=="build":
        mode=sys.argv[2] if len(sys.argv)>2 else "debug"
        build_android(mode)
    elif cmd=="run":
        run_android()
    elif cmd=="install":
        run(["npm","install","@capacitor/core","@capacitor/android","@capacitor/assets"],cwd=CAPACITOR_DIR)

if __name__=="__main__":
    main()