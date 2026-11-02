import type { CapacitorConfig } from '@capacitor/cli'
import { KeyboardResize } from '@capacitor/keyboard'
import identity from './native.config.json'

const devUrl = process.env.CAP_DEV_SERVER_URL
if (devUrl && process.env.NATIVE_DEV !== '1') {
  throw new Error('CAP_DEV_SERVER_URL requires NATIVE_DEV=1; never archive a development sync.')
}
const url = new URL('/app', devUrl || identity.origin)
if (!devUrl && url.protocol !== 'https:') throw new Error('Release origin must use HTTPS')

const config: CapacitorConfig = {
  appId: identity.appId,
  appName: identity.appName,
  webDir: 'native/www',
  appendUserAgent: ' StatsMasterNative/1',
  backgroundColor: '#eef3f9',
  server: {
    url: url.origin,
    appStartPath: '/app',
    errorPath: 'offline.html',
    cleartext: Boolean(devUrl && url.protocol === 'http:'),
  },
  ios: { scheme: 'Stats Master', contentInset: 'never', preferredContentMode: 'mobile' },
  android: { allowMixedContent: false },
  plugins: {
    Keyboard: { resize: KeyboardResize.Native, resizeOnFullScreen: true },
    SplashScreen: { launchAutoHide: true, launchShowDuration: 500, backgroundColor: '#eef3f9', showSpinner: false },
  },
}
export default config
