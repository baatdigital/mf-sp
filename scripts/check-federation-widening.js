#!/usr/bin/env node
/**
 * Invariant: every shared @angular/* dep must publish a MAJOR RANGE, never an
 * exact version.
 *
 * Why a Node script and not a karma spec: the value that matters is the one
 * withNativeFederation produces AFTER it re-resolves `requiredVersion`, not the
 * literal in the source. A spec that read the source text would pass while the
 * build shipped the exact version anyway -- the exact failure this catches.
 *
 * The negative case is real: remove widenAngularToMajorRange() from
 * federation.config.js and this exits 1.
 */
const config = require('../federation.config.js');

const shared = config.shared ?? {};
const angular = Object.entries(shared).filter(([name]) => name.startsWith('@angular/'));

if (angular.length === 0) {
  console.error('FAIL: no @angular/* shared deps found -- the config shape changed.');
  process.exit(1);
}

const exact = angular.filter(([, entry]) => !String(entry.requiredVersion ?? '').startsWith('^'));

if (exact.length > 0) {
  console.error('FAIL: these shared Angular deps publish an exact requiredVersion.');
  console.error('A host or remote one patch away then loads its own Angular copy');
  console.error('(NG0203) and the routes render as "Esta seccion no existe".');
  for (const [name, entry] of exact) {
    console.error(`  ${name}: requiredVersion=${entry.requiredVersion}`);
  }
  process.exit(1);
}

console.log(`OK: ${angular.length} shared @angular/* deps publish a major range.`);
