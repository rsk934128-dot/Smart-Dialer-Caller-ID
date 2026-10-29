#!/usr/bin/env node
/**
 * configure-signing.js
 * Injects release signing configuration into android/app/build.gradle if not already present.
 */
import fs from 'fs';
import path from 'path';

const gradlePath = path.resolve(process.cwd(), 'android/app/build.gradle');

if (!fs.existsSync(gradlePath)) {
  console.log('android/app/build.gradle not found, skipping signing configuration injection.');
  process.exit(0);
}

let file = fs.readFileSync(gradlePath, 'utf8');

if (file.includes('release.keystore')) {
  console.log('Release keystore signing configuration already verified in android/app/build.gradle.');
  process.exit(0);
}

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

fs.writeFileSync(gradlePath, file, 'utf8');
console.log('Successfully configured release signing in android/app/build.gradle');
