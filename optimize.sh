#!/bin/bash
rm -rf build
r.js -o app.build.js

# remove backup files
rm -f build/*~
