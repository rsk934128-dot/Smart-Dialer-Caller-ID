#!/usr/bin/env bash
# ==============================================================================
# diagnose_android.sh - Root Diagnostic Script for Android Build & Gradle Wrapper
# ==============================================================================
# Verifies:
#   1. Existence and permissions of 'android/gradlew'
#   2. Java environment (JAVA_HOME, java/javac versions)
#   3. android/app/build.gradle configuration and signing setup
#   4. Complete file structure within the 'android/' directory
#   5. Root-cause analysis for missing Gradle wrapper and remediation steps
# ==============================================================================

set -uo pipefail

# Color palette
RED="\033[0;31m"
GREEN="\033[0;32m"
YELLOW="\033[0;33m"
BLUE="\033[0;34m"
CYAN="\033[0;36m"
GRAY="\033[0;90m"
BOLD="\033[1m"
RESET="\033[0m"

SECTION_NUM=1
ERRORS_FOUND=0
WARNINGS_FOUND=0

print_section() {
  echo -e "\n${BOLD}${CYAN}----------------------------------------------------------------------${RESET}"
  echo -e "${BOLD}${CYAN}[Step $SECTION_NUM] $1${RESET}"
  echo -e "${BOLD}${CYAN}----------------------------------------------------------------------${RESET}"
  ((SECTION_NUM++))
}

log_pass() {
  echo -e "  ${GREEN}✔ [PASS]${RESET} $1"
}

log_fail() {
  echo -e "  ${RED}✘ [FAIL]${RESET} $1"
  if [ -n "${2:-}" ]; then
    echo -e "    ${GRAY}↳ Reason: $2${RESET}"
  fi
  ((ERRORS_FOUND++))
}

log_warn() {
  echo -e "  ${YELLOW}▲ [WARN]${RESET} $1"
  if [ -n "${2:-}" ]; then
    echo -e "    ${GRAY}↳ Info: $2${RESET}"
  fi
  ((WARNINGS_FOUND++))
}

log_info() {
  echo -e "  ${BLUE}ℹ [INFO]${RESET} $1"
}

# Resolve root workspace
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

echo -e "${BOLD}${BLUE}======================================================================${RESET}"
echo -e "${BOLD}${BLUE}       SMART DIALER - ANDROID PROJECT & GRADLEW DIAGNOSTIC TOOL       ${RESET}"
echo -e "${BOLD}${BLUE}======================================================================${RESET}"
echo -e "Workspace root: ${GRAY}$ROOT_DIR${RESET}"
echo -e "Timestamp:      ${GRAY}$(date -u +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date)${RESET}"

# ------------------------------------------------------------------------------
# 1. Check android/gradlew existence & executable permissions
# ------------------------------------------------------------------------------
print_section "Checking 'android/gradlew' Existence and Execution Permissions"

if [ ! -d "android" ]; then
  log_fail "Directory 'android/' does not exist in root workspace." \
    "Run 'npx cap add android' to generate the Android native platform."
elif [ ! -e "android/gradlew" ]; then
  log_fail "File 'android/gradlew' was NOT FOUND!" \
    "This triggers: 'chmod: cannot access android/gradlew: No such file or directory'."
else
  log_pass "File 'android/gradlew' is present."

  # Check if regular file
  if [ -f "android/gradlew" ]; then
    log_pass "'android/gradlew' is a regular file."
  else
    log_warn "'android/gradlew' exists but is not a regular file (e.g., symlink/broken)."
  fi

  # Check execution permission
  if [ -x "android/gradlew" ]; then
    log_pass "'android/gradlew' has executable permissions (+x)."
  else
    log_fail "'android/gradlew' exists but is missing executable permission (+x)." \
      "Run 'chmod +x android/gradlew' or run git update-index --chmod=+x android/gradlew"
  fi

  # Inspect shebang & file header
  SHEBANG=$(head -n 1 "android/gradlew" 2>/dev/null || echo "")
  if [[ "$SHEBANG" =~ ^#!.*(sh|bash) ]]; then
    log_pass "Valid shebang detected in gradlew: '$SHEBANG'"
  else
    log_warn "Unusual shebang in gradlew: '$SHEBANG'"
  fi
fi

# Check wrapper jar & properties
if [ -f "android/gradle/wrapper/gradle-wrapper.properties" ]; then
  log_pass "'android/gradle/wrapper/gradle-wrapper.properties' exists."
  DIST_URL=$(grep "distributionUrl" "android/gradle/wrapper/gradle-wrapper.properties" 2>/dev/null || echo "not set")
  log_info "Configured Gradle distribution: $DIST_URL"
else
  log_fail "'android/gradle/wrapper/gradle-wrapper.properties' is missing." \
    "Gradle wrapper cannot download the Gradle runtime without this properties file."
fi

if [ -f "android/gradle/wrapper/gradle-wrapper.jar" ]; then
  log_pass "'android/gradle/wrapper/gradle-wrapper.jar' exists."
else
  log_warn "'android/gradle/wrapper/gradle-wrapper.jar' is missing from repo." \
    "Many git repositories ignore *.jar by default. CI builds must generate wrapper via system gradle or use fallback."
fi

# ------------------------------------------------------------------------------
# 2. Verify Java Environment
# ------------------------------------------------------------------------------
print_section "Verifying Java JDK & Runtime Environment"

if [ -n "${JAVA_HOME:-}" ]; then
  if [ -d "$JAVA_HOME" ]; then
    log_pass "JAVA_HOME is defined and directory exists: $JAVA_HOME"
  else
    log_fail "JAVA_HOME is defined but directory does not exist: $JAVA_HOME"
  fi
else
  log_warn "JAVA_HOME environment variable is not explicitly exported."
fi

if command -v java >/dev/null 2>&1; then
  JAVA_BIN_PATH=$(command -v java)
  JAVA_VER_STR=$(java -version 2>&1 | head -n 1)
  log_pass "Java binary located at: $JAVA_BIN_PATH"
  log_pass "Java version: $JAVA_VER_STR"

  # Validate version recommendation (Java 17 is standard for Android Gradle Plugin 8.x)
  if echo "$JAVA_VER_STR" | grep -q '17\.'; then
    log_pass "JDK 17 is active (Optimal for Android Gradle Plugin 8.x and Capacitor)."
  elif echo "$JAVA_VER_STR" | grep -q '21\.'; then
    log_pass "JDK 21 is active."
  else
    log_info "Active Java version detected: $JAVA_VER_STR"
  fi
else
  if [ "${CI:-}" = "true" ] || [ "${GITHUB_ACTIONS:-}" = "true" ]; then
    log_fail "Java command 'java' is not available in PATH." \
      "In GitHub Actions, ensure 'actions/setup-java@v4' step runs before Gradle commands."
  else
    log_warn "Java binary 'java' not found in current local container." \
      "Required for local Android compilation. On GitHub Actions CI, 'actions/setup-java@v4' provides this."
  fi
fi

if command -v javac >/dev/null 2>&1; then
  JAVAC_VER=$(javac -version 2>&1)
  log_pass "Java compiler (javac) available: $JAVAC_VER"
else
  log_info "Java compiler (javac) not in PATH (Only needed if building Java modules locally)."
fi

# ------------------------------------------------------------------------------
# 3. Validate 'android/app/build.gradle'
# ------------------------------------------------------------------------------
print_section "Validating 'android/app/build.gradle' File"

APP_GRADLE="android/app/build.gradle"
if [ ! -f "$APP_GRADLE" ]; then
  log_fail "File '$APP_GRADLE' does not exist." \
    "Module build script is missing. The Android application cannot be built without it."
else
  log_pass "File '$APP_GRADLE' exists."

  # Check plugin declaration
  if grep -q "com.android.application" "$APP_GRADLE"; then
    log_pass "Plugin 'com.android.application' is applied."
  else
    log_fail "Missing 'apply plugin: com.android.application' or 'alias(libs.plugins.android.application)' in $APP_GRADLE."
  fi

  # Check namespace or applicationId
  if grep -q "namespace" "$APP_GRADLE" || grep -q "applicationId" "$APP_GRADLE"; then
    APP_ID=$(grep -E 'applicationId|namespace' "$APP_GRADLE" | head -n 1 | tr -d ' ",' | sed 's/applicationId//' | sed 's/namespace=//' | tr -d ' ')
    log_pass "Application identifier configured: ${APP_ID:-'(configured)'}"
  else
    log_warn "No explicit 'namespace' or 'applicationId' detected in $APP_GRADLE."
  fi

  # Check compileSdk / compileSdkVersion
  if grep -q -E 'compileSdk|compileSdkVersion' "$APP_GRADLE"; then
    log_pass "Compile SDK configuration detected."
  else
    log_warn "compileSdkVersion / compileSdk definition not found in $APP_GRADLE."
  fi

  # Check signingConfigs (Release / Keystore setup)
  if grep -q "signingConfigs" "$APP_GRADLE"; then
    log_pass "signingConfigs block detected in $APP_GRADLE."
    if grep -q "release" "$APP_GRADLE"; then
      log_pass "Release signing configuration found."
    fi
  else
    log_warn "No signingConfigs block found. Release builds will produce unsigned APKs."
  fi

  # Check capacitor dependency / subproject include
  if grep -q "capacitor.build.gradle" "$APP_GRADLE" || grep -q "capacitor-android" "$APP_GRADLE"; then
    log_pass "Capacitor build integration verified in $APP_GRADLE."
  else
    log_warn "Capacitor runtime integration line not detected in $APP_GRADLE."
  fi
fi

# Also check root android/build.gradle & android/settings.gradle
if [ -f "android/build.gradle" ]; then
  log_pass "Root build script 'android/build.gradle' is present."
else
  log_fail "Root build script 'android/build.gradle' is missing." \
    "Gradle cannot configure dependencies or repositories without root build.gradle."
fi

if [ -f "android/settings.gradle" ]; then
  log_pass "Project settings 'android/settings.gradle' is present."
else
  log_fail "Project settings 'android/settings.gradle' is missing." \
    "Gradle cannot identify the ':app' module without settings.gradle."
fi

# ------------------------------------------------------------------------------
# 4. List File Structure within 'android/'
# ------------------------------------------------------------------------------
print_section "Listing File Structure within 'android/' Directory"

if [ -d "android" ]; then
  echo -e "${GRAY}--- android/ Directory Tree ---${RESET}"
  if command -v find >/dev/null 2>&1; then
    find android -maxdepth 4 -not -path '*/.*' -not -path '*/build/*' | sort | sed -e 's/[^-][^\/]*\//  |/g' -e 's/|\([^ ]\)/|-- \1/'
  else
    ls -laR android
  fi
  echo -e "${GRAY}-------------------------------${RESET}"
else
  echo -e "  ${RED}Cannot list structure: 'android/' directory is missing.${RESET}"
fi

# ------------------------------------------------------------------------------
# 5. Diagnostic Root-Cause Summary & Fix Instructions
# ------------------------------------------------------------------------------
print_section "Diagnostic Summary & Gradle Wrapper Root-Cause Analysis"

echo -e "Total Errors (Blocking Build):   ${BOLD}${RED}$ERRORS_FOUND${RESET}"
echo -e "Total Warnings:                  ${BOLD}${YELLOW}$WARNINGS_FOUND${RESET}"

echo ""
if [ "$ERRORS_FOUND" -eq 0 ]; then
  echo -e "${BOLD}${GREEN}✔ DIAGNOSTIC RESULT: All critical Android build files and 'android/gradlew' are present!${RESET}"
  echo -e "  The repository is properly configured for local builds and GitHub Actions CI/CD."
else
  echo -e "${BOLD}${RED}✘ DIAGNOSTIC RESULT: Missing components detected that cause 'gradlew' build failures.${RESET}"
  echo ""
  echo -e "${BOLD}Why does the build fail to find 'android/gradlew'?${RESET}"
  echo -e "  1. Git Tracking: In Capacitor projects, if 'android/' is added without committing 'gradlew', or"
  echo -e "     if .gitignore ignores executable scripts or wrapper files, git checkout in CI leaves 'android/gradlew' absent."
  echo -e "  2. CI Execution Order: Running 'chmod +x android/gradlew' before running 'npx cap add android' or"
  echo -e "     before verifying the file exists causes bash to fail with 'No such file or directory'."
  echo -e "  3. Incomplete Platform: If only 'android/app/' was committed without the root 'android/gradlew',"
  echo -e "     'android/build.gradle', and 'android/settings.gradle', Gradle has no project wrapper entry point."
  echo ""
  echo -e "${BOLD}Immediate Remediation Steps:${RESET}"
  echo -e "  • Run auto-repair:   ${CYAN}bash scripts/diagnose-android.sh --fix${RESET}"
  echo -e "  • Re-sync Capacitor: ${CYAN}npx cap sync android${RESET}"
  echo -e "  • Track in git:      ${CYAN}git add -f android/gradlew android/build.gradle android/settings.gradle${RESET}"
  echo -e "                       ${CYAN}git update-index --chmod=+x android/gradlew${RESET}"
fi

echo -e "\n${BOLD}${BLUE}======================================================================${RESET}"
exit "$ERRORS_FOUND"
