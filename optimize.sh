#!/bin/bash
rm -rf build
rm builded.tar.gz
r.js -o app.build.js

# remove backup files
rm -f build/*~

# remove .git
rm -rf build/.git

# remove unnecessary javascript files
for FILE in `ls build/*.js`
do
  if [ $FILE != 'build/game.js' -a $FILE != 'build/require.js' ]; then
    rm $FILE
  fi
done

tar czvf builded.tar.gz build
