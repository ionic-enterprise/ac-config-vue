import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.acconfigvue',
  appName: 'AC Config Tool',
  webDir: 'dist',
  android: {
    adjustMarginsForEdgeToEdge: 'auto',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
    },
    StatusBar: {
      overlaysWebView: false,
    },
  },
};

export default config;
