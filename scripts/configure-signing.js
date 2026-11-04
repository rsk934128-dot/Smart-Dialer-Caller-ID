#!/usr/bin/env node
/**
 * configure-signing.js
 * Injects release signing configuration and Kotlin stdlib duplicate-class fix into android/app/build.gradle.
 */
import fs from 'fs';
import path from 'path';

const gradlePath = path.resolve(process.cwd(), 'android/app/build.gradle');

if (!fs.existsSync(gradlePath)) {
  console.log('android/app/build.gradle not found, skipping configuration injection.');
  process.exit(0);
}

let file = fs.readFileSync(gradlePath, 'utf8');
let modified = false;

// 1. Release signing configuration
if (!file.includes('release.keystore')) {
  console.log('Configuring release keystore in android/app/build.gradle...');
  const releaseSigningBlock = `signingConfigs {
        release {
            if (file("release.keystore").exists()) {
                storeFile file("release.keystore")
                storePassword "smartdialer123"
                keyAlias "smartdialer"
                keyPassword "smartdialer123"
            }
        }`;

  if (file.includes('signingConfigs {')) {
    file = file.replace('signingConfigs {', releaseSigningBlock);
  } else if (file.includes('defaultConfig {')) {
    file = file.replace('defaultConfig {', `${releaseSigningBlock}\n    }\n    defaultConfig {`);
  }

  const releaseBuildTypeBlock = `release {
            if (file("release.keystore").exists()) {
                signingConfig signingConfigs.release
            } else {
                signingConfig signingConfigs.debug
            }
            minifyEnabled false
            proguardFiles getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro"
        }`;

  if (file.includes('buildTypes {')) {
    file = file.replace(/release\s*\{[^}]*\}/, releaseBuildTypeBlock);
  }
  modified = true;
}

// 2. Kotlin duplicate class resolution
if (!file.includes('org.jetbrains.kotlin:kotlin-stdlib:1.8.22')) {
  console.log('Injecting Kotlin stdlib resolutionStrategy in android/app/build.gradle...');
  const kotlinResolution = `
configurations.all {
    resolutionStrategy {
        force 'org.bouncycastle:bcprov-jdk18on:1.78.1'
        force 'org.bouncycastle:bcpkix-jdk18on:1.78.1'
        force 'org.jetbrains.kotlin:kotlin-stdlib:1.8.22'
        force 'org.jetbrains.kotlin:kotlin-stdlib-common:1.8.22'
        force 'org.jetbrains.kotlin:kotlin-stdlib-jdk7:1.8.22'
        force 'org.jetbrains.kotlin:kotlin-stdlib-jdk8:1.8.22'
    }
}
`;
  if (file.includes('dependencies {')) {
    file = file.replace('dependencies {', `${kotlinResolution}\ndependencies {`);
    modified = true;
  }
}

// 3. Kotlin replacedBy module replacement
if (!file.includes('replacedBy("org.jetbrains.kotlin:kotlin-stdlib"')) {
  console.log('Injecting Kotlin modules replacement in android/app/build.gradle...');
  const modulesBlock = `dependencies {
    modules {
        module("org.jetbrains.kotlin:kotlin-stdlib-jdk7") {
            replacedBy("org.jetbrains.kotlin:kotlin-stdlib", "kotlin-stdlib-jdk7 merged into kotlin-stdlib")
        }
        module("org.jetbrains.kotlin:kotlin-stdlib-jdk8") {
            replacedBy("org.jetbrains.kotlin:kotlin-stdlib", "kotlin-stdlib-jdk8 merged into kotlin-stdlib")
        }
    }`;
  if (file.includes('dependencies {')) {
    file = file.replace('dependencies {', modulesBlock);
    modified = true;
  }
}

if (modified) {
  fs.writeFileSync(gradlePath, file, 'utf8');
  console.log('Successfully updated android/app/build.gradle');
} else {
  console.log('android/app/build.gradle already configured.');
}
