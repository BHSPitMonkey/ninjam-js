#!/bin/bash
# Build for Chrome Web Store at build/chrome.zip
ZIPFILE="chrome.zip"


cd `dirname $0`/..
mkdir -p build
rm -f "builds/$ZIPFILE"
cd app

zip -r "../builds/$ZIPFILE" manifest.json index.html css img js lib partials snd
