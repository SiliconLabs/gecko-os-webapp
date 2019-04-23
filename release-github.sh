#!/bin/bash

# This is a script that syncs the github repo with the stash repo.
# This script could go into Jenkins in the future.
# Ideally, we'd get rid of this script and combine github and stash repos.

mkdir ../.tmp/
pushd ../.tmp/
git clone https://github.com/SiliconLabs/gecko-os-webapp.git --branch WGM160P --single-branch gecko-os-webapp
mv gecko-os-webapp/.git .git
rm -rf gecko-os-webapp/
mkdir gecko-os-webapp

popd
cp -a . ../.tmp/gecko-os-webapp
rm -rf ../.tmp/gecko-os-webapp/.git ../.tmp/gecko-os-webapp/node_modules ../.tmp/gecko-os-webapp/out ../.tmp/gecko-os-webapp/release-github.sh
mv ../.tmp/.git ../.tmp/gecko-os-webapp/.git

# Now manually cd ../.tmp/gecko-os-webapp to add custom commit messages.