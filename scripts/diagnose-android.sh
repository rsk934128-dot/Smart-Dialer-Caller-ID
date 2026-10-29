#!/usr/bin/env bash
# ==============================================================================
# Smart Dialer & Caller ID - Android Project Diagnostic & Health Verification
# ==============================================================================
# This script inspects the project structure, checks for android/gradlew,
# validates Gradle wrapper, SDK and Capacitor configuration files, and flags
# any missing components that would prevent Android APK compilation.
#
# Usage:
#   bash scripts/diagnose-android.sh          # Run diagnostics and report issues
#   bash scripts/diagnose-android.sh --fix    # Run diagnostics and auto-repair missing files
# ==============================================================================

set -uo pipefail

# ANSI Color Codes
BOLD="\033[1m"
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[0;33m"
CYAN="\033[0;36m"
GRAY="\033[0;90m"
RESET="\033[0m"

PASS_COUNT=0
WARN_COUNT=0
FAIL_COUNT=0

AUTO_FIX=false
if [[ "${1:-}" == "--fix" || "${1:-}" == "-f" ]]; then
  AUTO_FIX=true
fi

print_header() {
  echo -e "\n${BOLD}${CYAN}==============================================================================${RESET}"
  echo -e "${BOLD}${CYAN}  $1${RESET}"
  echo -e "${BOLD}${CYAN}==============================================================================${RESET}"
}

report_pass() {
  echo -e "  [${GREEN}PASS${RESET}] $1"
  ((PASS_COUNT++))
}

report_warn() {
  echo -e "  [${YELLOW}WARN${RESET}] $1"
  if [ -n "${2:-}" ]; then
    echo -e "         ${GRAY}↳ $2${RESET}"
  fi
  ((WARN_COUNT++))
}

report_fail() {
  echo -e "  [${RED}FAIL${RESET}] $1"
  if [ -n "${2:-}" ]; then
    echo -e "         ${GRAY}↳ Reason / Fix: $2${RESET}"
  fi
  ((FAIL_COUNT++))
}

report_info() {
  echo -e "  [${CYAN}INFO${RESET}] $1"
}

# Determine script directory and workspace root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

print_header "1. Node.js & Workspace Environment Check"

# Node version check (Capacitor CLI requires Node >= 22)
if command -v node >/dev/null 2>&1; then
  NODE_VER=$(node -v | sed 's/v//')
  NODE_MAJOR=$(echo "$NODE_VER" | cut -d. -f1)
  if [ "$NODE_MAJOR" -ge 22 ]; then
    report_pass "Node.js v$NODE_VER detected (Meets Capacitor CLI requirement >= 22.0.0)"
  else
    report_fail "Node.js v$NODE_VER detected (Requires Node.js >= 22.0.0 for Capacitor)" \
      "Update Node.js or use actions/setup-node@v4 with node-version: 22"
  fi
else
  report_fail "Node.js binary not found in PATH"
fi

# package.json check
if [ -f "package.json" ]; then
  report_pass "package.json present in project root"
  
  # Check Capacitor dependencies
  if grep -q '"@capacitor/android"' package.json; then
    CAP_VER=$(grep '"@capacitor/android"' package.json | head -n 1 | tr -d '", ' | tr -d ' ')
    report_pass "@capacitor/android dependency defined ($CAP_VER)"
  else
    report_fail "Missing @capacitor/android in package.json" "Run: npm install @capacitor/android"
  fi

  if grep -q '"@capacitor/cli"' package.json; then
    report_pass "@capacitor/cli dependency defined"
  else
    report_warn "Missing @capacitor/cli in package.json (will rely on npx)"
  fi
else
  report_fail "package.json not found in $PROJECT_ROOT"
fi

# package-lock.json check
if [ -f "package-lock.json" ]; then
  report_pass "package-lock.json lockfile exists"
else
  report_warn "package-lock.json not found in root (GitHub Actions npm ci will fall back to npm install)" \
    "Run 'npm install' locally to generate package-lock.json"
fi

# capacitor.config check
if [ -f "capacitor.config.json" ]; then
  report_pass "capacitor.config.json present"
  APP_ID=$(grep '"appId"' capacitor.config.json | head -n 1 | cut -d '"' -f 4 || echo "")
  WEB_DIR=$(grep '"webDir"' capacitor.config.json | head -n 1 | cut -d '"' -f 4 || echo "")
  report_info "Capacitor App ID: ${APP_ID:-'(unknown)'} | Web Directory: ${WEB_DIR:-'dist'}"
elif [ -f "capacitor.config.ts" ]; then
  report_pass "capacitor.config.ts present"
else
  report_fail "Neither capacitor.config.json nor capacitor.config.ts was found" \
    "Create capacitor.config.json with appId and webDir"
fi

# Web distribution build check
if [ -d "dist" ] && [ -f "dist/index.html" ]; then
  report_pass "Web build output exists in dist/ (Ready for Capacitor sync)"
else
  report_warn "dist/ directory or dist/index.html is missing" \
    "Run 'npm run build' before compiling Android APK"
fi

print_header "2. Java JDK & Android SDK Diagnostics"

# Java check
if command -v java >/dev/null 2>&1; then
  JAVA_VER=$(java -version 2>&1 | head -n 1)
  report_pass "Java runtime found: $JAVA_VER"
else
  if [ "${CI:-}" = "true" ] || [ "${GITHUB_ACTIONS:-}" = "true" ]; then
    report_fail "Java runtime (java) is not installed or not in PATH" \
      "Install OpenJDK 17 (e.g. actions/setup-java@v4 with temurin-17)"
  else
    report_warn "Java JDK 17 not installed in current web container" \
      "Local machine builds require OpenJDK 17. GitHub Actions CI provides this automatically."
  fi
fi

if [ -n "${JAVA_HOME:-}" ] && [ -d "$JAVA_HOME" ]; then
  report_pass "JAVA_HOME environment variable is set: $JAVA_HOME"
else
  report_warn "JAVA_HOME is not set or directory does not exist" \
    "Set JAVA_HOME=/path/to/jdk-17"
fi

# Android SDK check
SDK_PATH="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
if [ -n "$SDK_PATH" ] && [ -d "$SDK_PATH" ]; then
  report_pass "Android SDK directory located at: $SDK_PATH"

  # Check platforms
  if [ -d "$SDK_PATH/platforms" ] && [ "$(ls -A "$SDK_PATH/platforms" 2>/dev/null)" ]; then
    INSTALLED_PLATFORMS=$(ls "$SDK_PATH/platforms" | tr '\n' ' ')
    report_pass "Android SDK platforms installed: $INSTALLED_PLATFORMS"
  else
    report_warn "No Android platforms found in $SDK_PATH/platforms" \
      "Install via sdkmanager: 'platforms;android-34'"
  fi

  # Check build-tools
  if [ -d "$SDK_PATH/build-tools" ] && [ "$(ls -A "$SDK_PATH/build-tools" 2>/dev/null)" ]; then
    LATEST_BT=$(ls "$SDK_PATH/build-tools" | sort -V | tail -n 1)
    report_pass "Android Build Tools installed (Latest: $LATEST_BT)"
    if [ -x "$SDK_PATH/build-tools/$LATEST_BT/apksigner" ]; then
      report_pass "Android apksigner utility available"
    else
      report_warn "apksigner not found in $SDK_PATH/build-tools/$LATEST_BT"
    fi
  else
    report_warn "No Android build-tools found in $SDK_PATH/build-tools"
  fi
else
  report_warn "ANDROID_HOME or ANDROID_SDK_ROOT is not set or not accessible in this environment" \
    "In GitHub Actions, android-actions/setup-android configures this automatically"
fi

print_header "3. Android Directory & Configuration File Checks"

if [ ! -d "android" ]; then
  report_fail "android/ directory is missing completely!" \
    "Run 'npx cap add android' to generate the native Android platform"
else
  report_pass "android/ native project root directory exists"

  # CHECK: android/gradlew
  if [ -f "android/gradlew" ]; then
    if [ -x "android/gradlew" ]; then
      report_pass "android/gradlew exists and has executable permissions (+x)"
    else
      report_warn "android/gradlew exists but is NOT executable" \
        "Run 'chmod +x android/gradlew'"
      if [ "$AUTO_FIX" = true ]; then
        chmod +x android/gradlew
        echo -e "         ${GREEN}✓ Fixed: Executable permission applied to android/gradlew${RESET}"
      fi
    fi
  else
    report_fail "android/gradlew DOES NOT EXIST!" \
      "Gradle wrapper script is missing. This causes 'chmod: cannot access android/gradlew: No such file or directory'."
  fi

  # CHECK: android/gradlew.bat
  if [ -f "android/gradlew.bat" ]; then
    report_pass "android/gradlew.bat (Windows wrapper) exists"
  else
    report_warn "android/gradlew.bat is missing (optional for Linux CI, needed for Windows developers)"
  fi

  # CHECK: Gradle wrapper jar & properties
  if [ -f "android/gradle/wrapper/gradle-wrapper.properties" ]; then
    report_pass "android/gradle/wrapper/gradle-wrapper.properties exists"
    WRAPPER_DIST=$(grep 'distributionUrl' android/gradle/wrapper/gradle-wrapper.properties 2>/dev/null || echo "")
    if [ -n "$WRAPPER_DIST" ]; then
      report_info "Gradle distribution: $WRAPPER_DIST"
    fi
  else
    report_fail "android/gradle/wrapper/gradle-wrapper.properties is missing" \
      "Run '(cd android && gradle wrapper)' or generate gradle-wrapper.properties"
  fi

  if [ -f "android/gradle/wrapper/gradle-wrapper.jar" ]; then
    report_pass "android/gradle/wrapper/gradle-wrapper.jar exists"
  else
    report_warn "android/gradle/wrapper/gradle-wrapper.jar is missing" \
      "In CI without the jar, Gradle wrapper download requires system gradle wrapper generation or cap add android"
  fi

  # CHECK: Root build.gradle
  if [ -f "android/build.gradle" ]; then
    report_pass "android/build.gradle (root project) exists"
  else
    report_fail "android/build.gradle (root project) is missing!" \
      "Android build cannot initialize subprojects without root build.gradle"
  fi

  # CHECK: Root settings.gradle
  if [ -f "android/settings.gradle" ]; then
    report_pass "android/settings.gradle exists"
  else
    report_fail "android/settings.gradle is missing!" \
      "Gradle cannot find the :app module without settings.gradle"
  fi

  # CHECK: variables.gradle
  if [ -f "android/variables.gradle" ]; then
    report_pass "android/variables.gradle exists"
  else
    report_warn "android/variables.gradle is missing (Capacitor stores SDK version constants here)"
  fi

  # CHECK: android/app directory
  if [ -d "android/app" ]; then
    report_pass "android/app/ module directory exists"

    # CHECK: android/app/build.gradle
    if [ -f "android/app/build.gradle" ]; then
      report_pass "android/app/build.gradle exists"

      # Check signing configs in app/build.gradle
      if grep -q 'signingConfigs' android/app/build.gradle && grep -q 'release' android/app/build.gradle; then
        report_pass "android/app/build.gradle contains release signing configuration"
      else
        report_warn "android/app/build.gradle does not explicitly define release signingConfigs" \
          "Release APK may be generated unsigned without signing configuration"
      fi

      # Check keystore
      if [ -f "android/app/release.keystore" ]; then
        report_pass "android/app/release.keystore keystore exists for signing"
      else
        report_info "android/app/release.keystore will be generated on-demand during CI build"
      fi
    else
      report_fail "android/app/build.gradle is missing!" \
        "The application module cannot be compiled without app/build.gradle"
    fi

    # CHECK: AndroidManifest.xml
    MANIFEST="android/app/src/main/AndroidManifest.xml"
    if [ -f "$MANIFEST" ]; then
      report_pass "$MANIFEST exists"

      # Check telephony / dialer permissions
      if grep -q 'READ_PHONE_STATE' "$MANIFEST" 2>/dev/null; then
        report_pass "READ_PHONE_STATE permission declared in AndroidManifest.xml"
      else
        report_info "Note: Telecom & Caller ID permissions should be declared in AndroidManifest.xml"
      fi
    else
      report_fail "$MANIFEST is missing!"
    fi

    # CHECK: capacitor.build.gradle
    if [ -f "android/app/capacitor.build.gradle" ]; then
      report_pass "android/app/capacitor.build.gradle exists"
    else
      report_warn "android/app/capacitor.build.gradle missing (will be generated by 'npx cap sync android')"
    fi
  else
    report_fail "android/app/ module directory is missing!"
  fi
fi

# ==============================================================================
# Auto-Repair Routine if --fix was passed or requested
# ==============================================================================
if [ "$AUTO_FIX" = true ]; then
  print_header "4. Automatic Repair Mode (--fix enabled)"

  mkdir -p android/gradle/wrapper
  mkdir -p android/app

  # 1. Restore root android/build.gradle if missing
  if [ ! -f "android/build.gradle" ]; then
    echo "Restoring standard android/build.gradle..."
    cat << 'EOF' > android/build.gradle
// Top-level build file where you can add configuration options common to all sub-projects/modules.

buildscript {
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath 'com.android.tools.build:gradle:8.2.1'
        classpath 'com.google.gms:google-services:4.4.0'
    }
}

apply from: "variables.gradle"

allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

task clean(type: Delete) {
    delete rootProject.buildDir
}
EOF
    echo -e "${GREEN}✓ Created android/build.gradle${RESET}"
  fi

  # 2. Restore android/settings.gradle if missing
  if [ ! -f "android/settings.gradle" ]; then
    echo "Restoring standard android/settings.gradle..."
    cat << 'EOF' > android/settings.gradle
include ':app'
rootProject.name = 'Smart Dialer & Caller ID'

try {
    apply from: 'capacitor.settings.gradle'
} catch (Exception e) {
    // capacitor.settings.gradle will be applied if present
}
EOF
    echo -e "${GREEN}✓ Created android/settings.gradle${RESET}"
  fi

  # 3. Restore android/gradle/wrapper/gradle-wrapper.properties if missing
  if [ ! -f "android/gradle/wrapper/gradle-wrapper.properties" ]; then
    echo "Restoring android/gradle/wrapper/gradle-wrapper.properties..."
    cat << 'EOF' > android/gradle/wrapper/gradle-wrapper.properties
distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\://services.gradle.org/distributions/gradle-8.2.1-all.zip
networkTimeout=10000
validateDistributionUrl=true
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
EOF
    echo -e "${GREEN}✓ Created android/gradle/wrapper/gradle-wrapper.properties${RESET}"
  fi

  # 4. Generate/Restore android/gradlew script if missing
  if [ ! -f "android/gradlew" ]; then
    echo "Generating standard android/gradlew wrapper script..."
    cat << 'EOF' > android/gradlew
#!/bin/sh

#
# Copyright © 2015-2021 the original authors.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#

##############################################################################
#
#   Gradle start up script for POSIX generated by Gradle wrapper
#
##############################################################################

# Attempt to set APP_HOME
# Resolve links: $0 may be a link
PRG="$0"
# Need this for relative symlinks.
while [ -h "$PRG" ] ; do
    ls=`ls -ld "$PRG"`
    link=`expr "$ls" : '.*-> \(.*\)$'`
    if expr "$link" : '/.*' > /dev/null; then
        PRG="$link"
    else
        PRG=`dirname "$PRG"`"/$link"
    fi
done
SAVED="`pwd`"
cd "`dirname \"$PRG\"`/" >/dev/null
APP_HOME="`pwd -P`"
cd "$SAVED" >/dev/null

APP_NAME="Gradle"
APP_BASE_NAME=`basename "$0"`

# Add default JVM options here. You can also use JAVA_OPTS and GRADLE_OPTS to pass JVM options to this script.
DEFAULT_JVM_OPTS='"-Xmx64m" "-Xms64m"'

# Use the maximum available, or set MAX_FD != -1 to use that value.
MAX_FD="maximum"

warn () {
    echo "$*"
}

die () {
    echo
    echo "$*"
    echo
    exit 1
}

# OS specific support (both for comes with Unix and Windows-like environment)
cygwin=false
msys=false
darwin=false
nonstop=false
case "`uname`" in
  CYGWIN* )
    cygwin=true
    ;;
  Darwin* )
    darwin=true
    ;;
  MINGW* )
    msys=true
    ;;
  NONSTOP* )
    nonstop=true
    ;;
esac

CLASSPATH=$APP_HOME/gradle/wrapper/gradle-wrapper.jar

# Determine the Java command to use to start the JVM.
if [ -n "$JAVA_HOME" ] ; then
    if [ -x "$JAVA_HOME/jre/sh/java" ] ; then
        # IBM's JDK on AIX uses strange locations for the executables
        JAVACMD="$JAVA_HOME/jre/sh/java"
    else
        JAVACMD="$JAVA_HOME/bin/java"
    fi
    if [ ! -x "$JAVACMD" ] ; then
        die "ERROR: JAVA_HOME is set to an invalid directory: $JAVA_HOME

Please set the JAVA_HOME variable in your environment to match the
location of your Java installation."
    fi
else
    JAVACMD="java"
    which java >/dev/null 2>&1 || die "ERROR: JAVA_HOME is not set and no 'java' command could be found in your PATH.

Please set the JAVA_HOME variable in your environment to match the
location of your Java installation."
fi

# Fallback: If gradle-wrapper.jar does not exist, use system gradle if present
if [ ! -f "$CLASSPATH" ]; then
    if command -v gradle >/dev/null 2>&1; then
        exec gradle "$@"
    else
        echo "gradle-wrapper.jar not found, attempting wrapper download or system gradle..."
    fi
fi

# Escape application args
save () {
    for i do printf %s\\n "$i" | sed "s/'/'\\\\''/g;1s/^/'/;\$s/\$/' \\\\/" ; done
    echo " "
}
APP_ARGS=`save "$@"`

# Collect all arguments for the java sub-shell.
eval set -- $DEFAULT_JVM_OPTS $JAVA_OPTS $GRADLE_OPTS "\"-Dorg.gradle.appname=$APP_BASE_NAME\"" -classpath "\"$CLASSPATH\"" org.gradle.wrapper.GradleWrapperMain "$APP_ARGS"

exec "$JAVACMD" "$@"
EOF
    chmod +x android/gradlew
    echo -e "${GREEN}✓ Created android/gradlew and granted executable permissions (+x)${RESET}"
  fi

  echo -e "\n${BOLD}${GREEN}Auto-repair completed. Re-running verification...${RESET}"
fi

# ==============================================================================
# Summary & Recommended Next Steps
# ==============================================================================
print_header "5. Android Diagnostic Summary"

echo -e "  Total Passed Checks:  ${GREEN}${PASS_COUNT}${RESET}"
echo -e "  Total Warnings:       ${YELLOW}${WARN_COUNT}${RESET}"
echo -e "  Total Critical Fails: ${RED}${FAIL_COUNT}${RESET}"

echo ""
if [ "$FAIL_COUNT" -eq 0 ]; then
  echo -e "${BOLD}${GREEN}✔ Android project structure is HEALTHY and ready for APK compilation!${RESET}"
  echo -e "To compile your APK, run:"
  echo -e "  ${CYAN}cd android && ./gradlew assembleRelease --no-daemon${RESET}"
else
  echo -e "${BOLD}${RED}✘ Android project has ${FAIL_COUNT} critical issues that will fail APK builds.${RESET}"
  echo -e "To automatically fix missing files and permissions, run:"
  echo -e "  ${BOLD}${CYAN}bash scripts/diagnose-android.sh --fix${RESET}"
  echo ""
  echo -e "Or initialize/sync the platform with Capacitor:"
  echo -e "  ${BOLD}${CYAN}npx cap sync android${RESET}"
  exit 1
fi
