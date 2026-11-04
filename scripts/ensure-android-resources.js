#!/usr/bin/env node
/**
 * ensure-android-resources.js
 * Guarantees all required Android XML resources exist (strings, styles, colors, file_paths)
 * to prevent AAPT resource linking errors during APK build.
 */
import fs from 'fs';
import path from 'path';

const resDir = path.resolve(process.cwd(), 'android/app/src/main/res');

if (!fs.existsSync(resDir)) {
  console.log('android/app/src/main/res directory not found, skipping resource check.');
  process.exit(0);
}

const valuesDir = path.join(resDir, 'values');
const xmlDir = path.join(resDir, 'xml');
const drawableDir = path.join(resDir, 'drawable');
const mipmapDir = path.join(resDir, 'mipmap-anydpi-v26');

fs.mkdirSync(valuesDir, { recursive: true });
fs.mkdirSync(xmlDir, { recursive: true });
fs.mkdirSync(drawableDir, { recursive: true });
fs.mkdirSync(mipmapDir, { recursive: true });

// 1. strings.xml
const stringsPath = path.join(valuesDir, 'strings.xml');
if (!fs.existsSync(stringsPath)) {
  console.log('Creating android/app/src/main/res/values/strings.xml...');
  const stringsContent = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">Smart Dialer</string>
    <string name="title_activity_main">Smart Dialer</string>
    <string name="package_name">com.smartdialer.telecom</string>
    <string name="custom_url_scheme">com.smartdialer.telecom</string>
</resources>
`;
  fs.writeFileSync(stringsPath, stringsContent, 'utf8');
}

// 2. styles.xml
const stylesPath = path.join(valuesDir, 'styles.xml');
if (!fs.existsSync(stylesPath)) {
  console.log('Creating android/app/src/main/res/values/styles.xml...');
  const stylesContent = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="AppTheme" parent="Theme.AppCompat.DayNight.NoActionBar">
        <item name="android:windowBackground">@color/background</item>
        <item name="colorPrimary">@color/colorPrimary</item>
        <item name="colorPrimaryDark">@color/colorPrimaryDark</item>
        <item name="colorAccent">@color/colorAccent</item>
    </style>

    <style name="AppTheme.NoActionBar" parent="Theme.AppCompat.DayNight.NoActionBar">
        <item name="windowActionBar">false</item>
        <item name="windowNoTitle">true</item>
        <item name="android:background">@null</item>
    </style>

    <style name="AppTheme.NoActionBarLaunch" parent="AppTheme.NoActionBar">
        <item name="android:background">@drawable/splash</item>
    </style>
</resources>
`;
  fs.writeFileSync(stylesPath, stylesContent, 'utf8');
}

// 3. colors.xml
const colorsPath = path.join(valuesDir, 'colors.xml');
if (!fs.existsSync(colorsPath)) {
  console.log('Creating android/app/src/main/res/values/colors.xml...');
  const colorsContent = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="colorPrimary">#0D9488</color>
    <color name="colorPrimaryDark">#0F172A</color>
    <color name="colorAccent">#10B981</color>
    <color name="background">#0F172A</color>
    <color name="ic_launcher_background">#0F172A</color>
</resources>
`;
  fs.writeFileSync(colorsPath, colorsContent, 'utf8');
}

// 4. ic_launcher_background.xml
const bgPath = path.join(valuesDir, 'ic_launcher_background.xml');
if (!fs.existsSync(bgPath)) {
  console.log('Creating android/app/src/main/res/values/ic_launcher_background.xml...');
  const bgContent = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#0F172A</color>
</resources>
`;
  fs.writeFileSync(bgPath, bgContent, 'utf8');
}

// 5. file_paths.xml
const filePathsPath = path.join(xmlDir, 'file_paths.xml');
if (!fs.existsSync(filePathsPath)) {
  console.log('Creating android/app/src/main/res/xml/file_paths.xml...');
  const filePathsContent = `<?xml version="1.0" encoding="utf-8"?>
<paths xmlns:android="http://schemas.android.com/apk/res/android">
    <files-path name="my_files" path="." />
    <cache-path name="my_cache" path="." />
    <external-path name="my_external_files" path="." />
    <external-files-path name="my_external_folder" path="." />
    <external-cache-path name="my_external_cache" path="." />
</paths>
`;
  fs.writeFileSync(filePathsPath, filePathsContent, 'utf8');
}

// 6. Ensure foreground drawable is in drawable/
const fgSource = path.join(resDir, 'drawable-v24', 'ic_launcher_foreground.xml');
const fgDest = path.join(drawableDir, 'ic_launcher_foreground.xml');
if (!fs.existsSync(fgDest) && fs.existsSync(fgSource)) {
  fs.copyFileSync(fgSource, fgDest);
}

// 7. Ensure adaptive icons reference drawable resources
const adaptiveIconContent = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@drawable/ic_launcher_background"/>
    <foreground android:drawable="@drawable/ic_launcher_foreground"/>
</adaptive-icon>
`;

const iconXml = path.join(mipmapDir, 'ic_launcher.xml');
const iconRoundXml = path.join(mipmapDir, 'ic_launcher_round.xml');
if (!fs.existsSync(iconXml) || fs.readFileSync(iconXml, 'utf8').includes('@mipmap/ic_launcher_foreground')) {
  fs.writeFileSync(iconXml, adaptiveIconContent, 'utf8');
}
if (!fs.existsSync(iconRoundXml) || fs.readFileSync(iconRoundXml, 'utf8').includes('@mipmap/ic_launcher_foreground')) {
  fs.writeFileSync(iconRoundXml, adaptiveIconContent, 'utf8');
}

console.log('All required Android XML resources verified successfully.');
