#!/bin/sh
set -eu
if [ "${CONFIGURATION:-}" != "Release" ]; then exit 0; fi
config="$SRCROOT/App/capacitor.config.json"
origin=$(/usr/bin/plutil -extract server.url raw -o - "$config")
start=$(/usr/bin/plutil -extract server.appStartPath raw -o - "$config")
cleartext=$(/usr/bin/plutil -extract server.cleartext raw -o - "$config")
if [ "$origin" != "https://statsmaster.playam.app" ] || [ "$start" != "/app" ] || [ "$cleartext" != "false" ]; then
  echo 'error: Release must load https://statsmaster.playam.app/app. Run npm run native:sync without development overrides.' >&2
  exit 1
fi
