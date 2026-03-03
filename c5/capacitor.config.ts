import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.chinhin.connect',
  appName: 'ChinHin Connect',
  webDir: 'build',
  "server": {
    "androidScheme": "https"
  },
  "plugins": {
    "SplashScreen": {
      "launchShowDuration": 0,
      "launchAutoHide": true,
      "showSpinner": false
    }
  }
};

export default config;
