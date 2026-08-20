const { withNativeFederation, shareAll } = require('@angular-architects/native-federation/config');


/**
 * Widen every shared @angular/* dep to its major range.
 *
 * `requiredVersion: 'auto'` copies the range from package.json verbatim, and
 * these repos pin Angular EXACTLY. A singleton is deduped only when ONE copy
 * satisfies every consumer, so the moment this remote and its host drift by a
 * single patch, no copy satisfies both and TWO Angular instances load -> NG0203
 * -> the remote never mounts and the shell renders "Esta seccion no existe -
 * Puede que el modulo aun no este habilitado para tu organizacion", which blames
 * entitlements and has nothing to do with them.
 *
 * The drift is not hypothetical: measured in production on 2026-08-20,
 * mf-invoicing already published 21.2.19 while the mf-core shell demanded
 * 21.2.18 exactly.
 *
 * This runs on the OUTPUT of withNativeFederation on purpose. Rewriting the
 * shareAll() result does nothing: withNativeFederation re-resolves
 * requiredVersion afterwards and puts the exact version straight back. The only
 * place that proves which value actually ships is the generated
 * dist/remoteEntry.json.
 *
 * Only @angular/* is widened: sharing two rxjs majors would be a real
 * incompatibility, and rxjs already declares a range.
 *
 * Invariant: scripts/check-federation-widening.js (run by CI).
 */
function widenAngularToMajorRange(config) {
  for (const [name, entry] of Object.entries(config.shared ?? {})) {
    if (!name.startsWith('@angular/')) continue;
    const major = String(entry.requiredVersion ?? '').match(/(\d+)\./);
    if (major) entry.requiredVersion = `^${major[1]}.0.0`;
  }
  return config;
}

module.exports = widenAngularToMajorRange(withNativeFederation({
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
}));
