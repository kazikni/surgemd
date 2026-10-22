#!/usr/bin/env python3
import sys
import subprocess
import os
import shutil
from pathlib import Path
from getpass import getpass

ROOT=Path(__file__).resolve().parent.parent.parent
CAPACITOR_DIR=ROOT/"desktop/capacitor"
CAPACITOR_ANDROID_DIR=CAPACITOR_DIR/"android"
CLIENT_DIR=ROOT/"client"
DIST_DIR=ROOT/"dist"
BUILD_DIR=CLIENT_DIR/"dist"
IS_WINDOWS=os.name=="nt"

KEYSTORE_DIR = CAPACITOR_ANDROID_DIR / "keystore"
KEYSTORE_PATH = KEYSTORE_DIR / "surgemd-release.keystore"
KEYSTORE_ALIAS = "surgemd"
KEYSTORE_PASSWORD="KEYSTORE_PASSWORD"

KEYSTORE_D_CN="Hugo Mendonca Santana"
KEYSTORE_D_OU="Kazikni"
KEYSTORE_D_O="Kazikni"
KEYSTORE_D_L="Goiania"
KEYSTORE_D_ST="Goias"
KEYSTORE_D_C="BR"

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

def sign_aab(aab_path):
    if not KEYSTORE_PATH.is_file():
        raise FileNotFoundError(
            f"Keystore não encontrada: {KEYSTORE_PATH}"
        )

    command = [
        "jarsigner",
        "-keystore", str(KEYSTORE_PATH),
        "-storepass", KEYSTORE_PASSWORD,
        str(aab_path),
        KEYSTORE_ALIAS,
    ]

    print(">", " ".join(map(str, command)))
    subprocess.check_call(command)

    verify_command = [
        "jarsigner",
        "-verify",
        str(aab_path),
    ]

    print(">", " ".join(map(str, verify_command)))
    subprocess.check_call(verify_command)

    print("AAB assinado e verificado.")
def build_android(mode="debug"):
    DIST_DIR.mkdir(parents=True,exist_ok=True)
    build_web()
    generate_icons()
    cap_sync()

    if not KEYSTORE_PATH.exists():
        run(["keytool", "-genkeypair","-alias",KEYSTORE_ALIAS,"-keyalg","RSA","-keysize","2048","-validity","10000","-keystore","capacitor/android/keystore/surgemd-release.keystore","-storepass",KEYSTORE_PASSWORD,"-dname" f"CN={KEYSTORE_D_CN}, OU={KEYSTORE_D_OU}, O={KEYSTORE_D_O}, L={KEYSTORE_D_L}, ST={KEYSTORE_D_ST}, C={KEYSTORE_D_C}"])

    if mode=="playstore":
        task="bundleRelease"
        output=CAPACITOR_ANDROID_DIR/"app/build/outputs/bundle/release/app-release.aab"
        destination=DIST_DIR/"surgemd.aab"
    elif mode=="release":
        task="assembleRelease"
        output=CAPACITOR_ANDROID_DIR/"app/build/outputs/apk/release/app-release.apk"
        destination=DIST_DIR/"surgemd.apk"
    else:
        task="assembleDebug"
        output=CAPACITOR_ANDROID_DIR/"app/build/outputs/apk/debug/app-debug.apk"
        destination=DIST_DIR/"surgemd.apk"

    run(gradle(task),cwd=CAPACITOR_ANDROID_DIR)
    if mode == "playstore":
        sign_aab(output)

    if not output.exists():
        raise FileNotFoundError(f"Build não encontrada: {output}")

    shutil.copy2(output,destination)
    print(f"Build criada: {destination}")


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