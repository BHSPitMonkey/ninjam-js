# Ninjam JS

[![Build Status](https://travis-ci.org/BHSPitMonkey/ninjam-js.svg?branch=master)](https://travis-ci.org/BHSPitMonkey/ninjam-js)

Music collaboration in the browser!

## Overview

NINJAM is a client/server software originally released in 2005 as a way for
musicians to collaborate (by jamming!) over the Internet.

Ninjam JS is built using web technologies (JavaScript, HTML, CSS) and acts as a
NINJAM client, connecting to servers just like the official C++ client. It can
run as a standalone application using Electron, as a Chrome App, or (almost)
as a packaged app for Firefox OS.

## Development Status

Ninjam JS is still a work in progress. The current code is capable of
connecting to servers, sending and receiving chat messages (including votes),
listening to audio channels from other users, and transmitting audio.

## Get the Alpha

You can install a work-in-progress build using Chrome, Chromium, or Chrome OS
by going here:

https://chrome.google.com/webstore/detail/ninjam-js/hgcicpalplclhnoephgjpmoknnnmdfje

## Screenshots

### Server browser

![Server browser](https://raw.github.com/wiki/BHSPitMonkey/ninjam-js/screenshots/servers.png)

### Jamming on a server

![Jamming on a server](https://raw.github.com/wiki/BHSPitMonkey/ninjam-js/screenshots/jam.png)

## Development

### Setting up dependencies

Run `npm install` from the project root to install node dependencies. This will
also invoke `npm install` in the `app/` directory automatically.

```bash
cd <project_root>
npm install # Install packaging tools
cd app/
npm install # Install app dependencies
```

### Running locally

To build and run the app locally:

```bash
cd <project_root>/app/
npm run watch
```

This starts a process which performs an initial build (populating the `app/build/`
directory if it isn't already) and continuously watches for changes, rebuilding
individual assets as needed.

To just build the application once without starting the watcher, run `npm run make-dist` instead.

Once a build has been made, open another terminal and launch the application using Electron:

```
cd <project_root>
npm start
```

### Noteworthy files/directories

    root/
    |- package.json: Used for electron-builder packaging, contains packaging scripts
    |- build/: Resources used by electron-builder during packaging (icons, etc.)
    |- app/:
       |- package.json: Declares app dependencies, contains build scripts
       |- webpack.config.js: Webpack build configuration
       |- build/: Destination for built JS/CSS bundles and copied static assets
       |- src/: React source
       |- static/: Static assets copied as-is into build/ by Webpack
          |- package.json: Declares app metadata used by Electron and electron-builder
