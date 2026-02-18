const { withNativeFederation, shareAll } = require('@angular-architects/native-federation/config');

module.exports = withNativeFederation({
  name: 'mfSP',

  exposes: {
    './routes': './src/app/remote-entry/entry.routes.ts',
    './Component': './src/app/remote-entry/entry.component.ts',
  },

  shared: {
    ...shareAll({
      singleton: true,
      strictVersion: false,
      requiredVersion: 'auto',
    }),
  },

  skip: [
    'rxjs/ajax',
    'rxjs/fetch',
    'rxjs/testing',
    'rxjs/webSocket',
    '@angular/common/http/http',
    '@angular/common/http/upgrade',
  ],

  sharedMappings: [],

  features: {
    ignoreUnusedDeps: true,
  },
});
