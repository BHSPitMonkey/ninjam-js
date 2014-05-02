#!/bin/bash
# Build zip file for node-webkit at build/app.nw
ZIPFILE="app.nw"


cd `dirname $0`/..
mkdir -p builds
rm -f "builds/$ZIPFILE"
cd app

zip -r "../builds/$ZIPFILE" package.json index.html main.js css img modules lib snd
