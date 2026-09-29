import type { CapacitorConfig } from '@capacitor/cli';
import { KeyboardResize, KeyboardStyle } from '@capacitor/keyboard';

const config: CapacitorConfig = {
  appId: 'com.travelbug.client',
  appName: 'Travel Bug',
  webDir: 'out',
  server: {
    androidScheme: 'https',
    iosScheme: 'travelbug',
  },
  android: {
    // Match CSS --background to avoid flash on cold start
    backgroundColor: '#f3f6f4',
  },
  ios: {
    backgroundColor: '#f3f6f4',
  },
  plugins: {
    CapacitorCookies: {
      enabled: true,
    },
    Keyboard: {
      resize: KeyboardResize.Native,
      style: KeyboardStyle.Dark,
      resizeOnFullScreen: false,
    },
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: '#f3f6f4',
    },
    StatusBar: {
      style: 'DARK',
    },
  },
};

export default config;
