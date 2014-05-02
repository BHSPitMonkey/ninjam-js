#!/bin/bash
# Build for Chrome Web Store at build/chrome.zip
ZIPFILE="chrome.zip"


cd `dirname $0`/..
mkdir -p builds
rm -f "builds/$ZIPFILE"
cd app

zip -r "../builds/$ZIPFILE" manifest.json index.html main.js css img modules lib snd
