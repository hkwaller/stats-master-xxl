import sharp from 'sharp'
import { mkdirSync, writeFileSync, readdirSync, unlinkSync } from 'node:fs'

// The existing PuckMark geometry, on the game's ice with red board trim.
const puck = `<path d="M5 16v9c0 6 30 6 30 0v-9" fill="#0d1b2a"/><ellipse cx="20" cy="16" rx="15" ry="7" fill="#0d1b2a" stroke="#eef3f9" stroke-width="1.5"/><path d="M8 21h24" stroke="#eef3f9" stroke-width="2"/>`
const icon = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><path fill="#eef3f9" d="M0 0h1024v1024H0z"/><path fill="#cf0a2c" d="M0 865h1024v20H0z"/><g transform="translate(102 90) scale(20.5)">${puck}</g></svg>`)
const splash = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="2732" height="2732" viewBox="0 0 2732 2732"><path fill="#eef3f9" d="M0 0h2732v2732H0z"/><g transform="translate(1166 1146) scale(10)">${puck}</g><path fill="#cf0a2c" d="M1216 1506h300v8h-300z"/></svg>`)
await sharp(icon).png().toFile('ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png')
for (const file of ['splash-2732x2732.png','splash-2732x2732-1.png','splash-2732x2732-2.png']) await sharp(splash).png().toFile(`ios/App/App/Assets.xcassets/Splash.imageset/${file}`)
for (const [density,size] of [['mdpi',48],['hdpi',72],['xhdpi',96],['xxhdpi',144],['xxxhdpi',192]]) {
 const dir=`android/app/src/main/res/mipmap-${density}`; mkdirSync(dir,{recursive:true})
 for (const file of ['ic_launcher','ic_launcher_round']) await sharp(icon).resize(size,size).png().toFile(`${dir}/${file}.png`)
 await sharp(icon).resize(Math.round(size*2.25)).png().toFile(`${dir}/ic_launcher_foreground.png`)
}
writeFileSync('android/app/src/main/res/values/colors.xml',`<?xml version="1.0" encoding="utf-8"?><resources><color name="colorPrimary">#0d1b2a</color><color name="colorPrimaryDark">#eef3f9</color><color name="colorAccent">#cf0a2c</color></resources>\n`)
writeFileSync('android/app/src/main/res/drawable/splash.xml',`<?xml version="1.0" encoding="utf-8"?><layer-list xmlns:android="http://schemas.android.com/apk/res/android"><item android:drawable="@color/ic_launcher_background"/><item android:width="160dp" android:height="160dp" android:gravity="center" android:drawable="@mipmap/ic_launcher"/></layer-list>\n`)

// Remove generated Capacitor placeholder rasters; the branded XML scales to every orientation.
for (const dir of readdirSync('android/app/src/main/res', { withFileTypes: true })) {
  if (dir.isDirectory() && dir.name.startsWith('drawable')) {
    const files = readdirSync(`android/app/src/main/res/${dir.name}`)
    if (files.includes('splash.png')) unlinkSync(`android/app/src/main/res/${dir.name}/splash.png`)
  }
}

writeFileSync('android/app/src/main/res/values/ic_launcher_background.xml', '<?xml version="1.0" encoding="utf-8"?><resources><color name="ic_launcher_background">#eef3f9</color></resources>\n')
