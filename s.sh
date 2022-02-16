#!/bin/bash
grep -Ri ${{secrets.TEST_TEXT}} . --exclude-dir node_modules --exclude-dir e2e/node_modules --exclude-dir .git
if [ $? -eq 0 ]
then
  echo "Found"
  exit 13
else
  echo "Not found"
  exit 0
fi
