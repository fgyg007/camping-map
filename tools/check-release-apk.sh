#!/usr/bin/env bash
set -euo pipefail
apk="$1"
code="$(awk '/^[[:space:]]*versionCode [0-9]+$/ {print $2}' android/app/build.gradle)"
version="$(awk -F'"' '/^[[:space:]]*versionName "[0-9.]+"/ {print $2}' android/app/build.gradle)"
test -n "$code" && test -n "$version"
badging="$("$ANDROID_HOME/build-tools/36.0.0/aapt2" dump badging "$apk")"
grep -Fq "package: name='com.jlmac.yebo' versionCode='$code' versionName='$version'" <<< "$badging"
grep -Fxq "application-label:'野泊'" <<< "$badging"
grep -Fq "launchable-activity: name='com.jlmac.campingmap.MainActivity'" <<< "$badging"
! grep -Fxq 'application-debuggable' <<< "$badging" || { echo 'Refusing debuggable APK'; exit 1; }
manifest="$("$ANDROID_HOME/build-tools/36.0.0/aapt2" dump xmltree "$apk" --file AndroidManifest.xml)"
grep -Fq 'com.jlmac.yebo.fileprovider' <<< "$manifest"
grep -Fq '=":baidu_poi_resolver"' <<< "$manifest"
