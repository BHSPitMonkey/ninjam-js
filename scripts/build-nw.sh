#!/bin/bash
# Build zip file for node-webkit at build/app.nw
ZIPFILE="app.nw"


cd `dirname $0`/..
mkdir -p builds
rm -f "builds/$ZIPFILE"
cd app

zip -r "../builds/$ZIPFILE" package.json index.html css img js lib partials snd
