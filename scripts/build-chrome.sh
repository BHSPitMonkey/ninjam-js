#!/bin/bash
# Build for Chrome Web Store at build/chrome.zip
ZIPFILE="chrome.zip"


cd `dirname $0`/..
mkdir -p builds
rm -f "builds/$ZIPFILE"
cd app

rm -f "../builds/$ZIPFILE"
zip -r "../builds/$ZIPFILE" background.js index.html main.js manifest.json css img lib modules snd
