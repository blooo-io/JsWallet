#!/bin/sh

if grep -Ri veladev222 ./ --exclude-dir node_modules --exclude-dir .compiled --exclude-dir .compiled-ssr --exclude-dir e2e/node_modules --exclude-dir .git; then
    echo found && exit 1
else
    echo not found && exit 2
fi

echo 'blabla'