import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs'
const identity = JSON.parse(readFileSync(new URL('../native.config.json', import.meta.url)))
const devUrl = process.env.CAP_DEV_SERVER_URL
if (devUrl && process.env.NATIVE_DEV !== '1') throw new Error('Development URLs require NATIVE_DEV=1')
const url = new URL('/app', devUrl || identity.origin)
const result = spawnSync('node_modules/.bin/vite', ['build', '--config', 'native/offline/vite.config.ts'], { stdio: 'inherit' })
if (result.status !== 0) process.exit(result.status || 1)
writeFileSync('native/www/app-url.js', `window.STATS_MASTER_URL=${JSON.stringify(url.href)};\n`)
const html = readFileSync('native/www/offline.html', 'utf8').replace('<head>', '<head><script src="./app-url.js"></script>')
writeFileSync('native/www/offline.html', html)
copyFileSync('native/www/offline.html', 'native/www/index.html')

// Capacitor iOS checks that appStartPath exists locally even with server.url.
copyFileSync('native/www/offline.html', 'native/www/app')
