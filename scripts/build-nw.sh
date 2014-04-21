#!/bin/bash
# Build zip file for node-webkit at build/app.nw
ZIPFILE="app.nw"

cd `dirname $0`/..
mkdir -p build
rm -f "build/$ZIPFILE"
cd app

zip -r "../build/$ZIPFILE" package.json index.html css img js lib partials snd
