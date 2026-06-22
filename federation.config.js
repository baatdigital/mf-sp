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
    // RxJS subpaths (nunca compartir, causan conflictos de instancia)
    'rxjs/ajax',
    'rxjs/fetch',
    'rxjs/testing',
    'rxjs/webSocket',
    // NUNCA skipear 'rxjs/operators': Angular lo importa y DEBE compartirse via federation.

    // Angular common subpaths no-estándar
    '@angular/common/http/http',
    '@angular/common/http/upgrade',

    // Angular CDK — todos los subpaths conocidos
    '@angular/cdk',
    '@angular/cdk/accordion',
    '@angular/cdk/bidi',
    '@angular/cdk/clipboard',
    '@angular/cdk/coercion',
    '@angular/cdk/collections',
    '@angular/cdk/dialog',
    '@angular/cdk/drag-drop',
    '@angular/cdk/keycodes',
    '@angular/cdk/layout',
    '@angular/cdk/listbox',
    '@angular/cdk/menu',
    '@angular/cdk/observers',
    '@angular/cdk/overlay',
    '@angular/cdk/platform',
    '@angular/cdk/portal',
    '@angular/cdk/scrolling',
    '@angular/cdk/stepper',
    '@angular/cdk/table',
    '@angular/cdk/text-field',
    '@angular/cdk/tree',
    '@angular/cdk/testing',

    // Angular Material
    '@angular/material',

    // Charts y visualización (no usados en mf-sp actualmente, pero presentes en canon)
    'echarts',
    'echarts/core',
    'echarts/charts',
    'echarts/components',
    'echarts/renderers',
    'echarts/features',
    'ngx-echarts',
    'chart.js',
    'apexcharts',
    'ng-apexcharts',

    // PDF / Office
    'jspdf',
    'jspdf-autotable',
    'xlsx',
    'file-saver',

    // QR / Barcodes / Imágenes
    'qrcode',
    'pngjs',
    'jsbarcode',
    'dijkstrajs',

    // Maps
    'leaflet',
    '@asymmetrik/ngx-leaflet',

    // Código / Syntax highlight
    'prismjs',

    // Clipboard
    'clipboard',

    // Firebase
    'firebase',
    'firebase/app',
    'firebase/messaging',
    'firebase/analytics',
    '@angular/fire',
    '@angular/fire/compat',

    // HTTP clients alternativos
    'axios',
  ],

  sharedMappings: [],

  features: {
    ignoreUnusedDeps: true,
  },
});
