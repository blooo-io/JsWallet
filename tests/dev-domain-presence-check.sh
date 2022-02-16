#!/bin/bash

# this script checks if development domain is present in repository code

echo '----------------------'
echo ${TEST_TEXT}
echo '----------------------'

grep -Ri ${TEST_TEXT} . --exclude-dir node_modules --exclude-dir e2e/node_modules --exclude-dir .git
if [ $? -eq 0 ]
then
  echo ' - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -'
  echo 'The development domain was found in repository code.'
  echo 'See filename above. File content is hidden due to security.'
  echo ' - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -'
  exit 13
else
  echo "All is fine. Dev domain was not mentioned in current repo."
  exit 0
fi



        # run: |
        #   (grep -Ri ${{secrets.TEST_TEXT}} . \
        #   --exclude-dir node_modules \
        #   --exclude-dir e2e/node_modules \
        #   --exclude-dir .git || exit 0) && \
        #   echo ' - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -' && \
        #   echo 'The development domain was found in repository code.' && \
        #   echo 'See filename above. File content is hidden due to security.' && \
        #   echo ' - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -' && \
        #   exit 13