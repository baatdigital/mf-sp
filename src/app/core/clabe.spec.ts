/**
 * Tests: clabe.ts — validador CLABE con checksum mod-10
 */

import { FormControl } from '@angular/forms';
import { isClabeValid, clabeChecksumValidator } from './clabe';

// CLABEs reales con checksum correcto (Banxico)
const VALID_CLABE = '646180110400000007'; // STP
const INVALID_CHECKSUM = '646180110400000008'; // ultimo digito incorrecto
const TOO_SHORT = '12345678901234567';
const LETTERS = '64618011040000000X';

describe('isClabeValid', () => {
  it('debe retornar true para CLABE con checksum correcto', () => {
    expect(isClabeValid(VALID_CLABE)).toBeTrue();
  });

  it('debe retornar false para CLABE con checksum incorrecto', () => {
    expect(isClabeValid(INVALID_CHECKSUM)).toBeFalse();
  });

  it('debe retornar false para CLABE con menos de 18 digitos', () => {
    expect(isClabeValid(TOO_SHORT)).toBeFalse();
  });

  it('debe retornar false para CLABE con caracteres no numericos', () => {
    expect(isClabeValid(LETTERS)).toBeFalse();
  });

  it('debe retornar false para cadena vacia', () => {
    expect(isClabeValid('')).toBeFalse();
  });

  it('debe ignorar espacios y validar correctamente', () => {
    // con espacio al inicio -> despues de replace seria la CLABE valida
    expect(isClabeValid(' ' + VALID_CLABE.slice(1))).toBeFalse(); // no es la CLABE correcta
    // La funcion hace replace de espacios pero el largo seria 18 entonces:
    const withSpace = VALID_CLABE.slice(0, 9) + ' ' + VALID_CLABE.slice(9);
    // tras replace queda 18 chars, pero el espacio ya no esta — length original sigue siendo 19 sin replace
    // isClabeValid hace replace antes de test, asi que trata la CLABE correctamente
    expect(isClabeValid(withSpace)).toBeTrue();
  });
});

describe('clabeChecksumValidator', () => {
  it('debe retornar null para campo vacio (valido, requiere Validators.required separado)', () => {
    const ctrl = new FormControl('');
    expect(clabeChecksumValidator(ctrl)).toBeNull();
  });

  it('debe retornar null para null/undefined', () => {
    const ctrl = new FormControl(null);
    expect(clabeChecksumValidator(ctrl)).toBeNull();
  });

  it('debe retornar clabeInvalid para CLABE menor a 18 digitos', () => {
    const ctrl = new FormControl(TOO_SHORT);
    const errors = clabeChecksumValidator(ctrl);
    expect(errors?.['clabeInvalid']).toBeTrue();
  });

  it('debe retornar clabeChecksum para CLABE de 18 digitos con checksum incorrecto', () => {
    const ctrl = new FormControl(INVALID_CHECKSUM);
    const errors = clabeChecksumValidator(ctrl);
    expect(errors?.['clabeChecksum']).toBeTrue();
  });

  it('debe retornar null para CLABE valida con checksum correcto', () => {
    const ctrl = new FormControl(VALID_CLABE);
    expect(clabeChecksumValidator(ctrl)).toBeNull();
  });

  it('debe retornar clabeInvalid para CLABE con letras', () => {
    const ctrl = new FormControl(LETTERS);
    const errors = clabeChecksumValidator(ctrl);
    expect(errors?.['clabeInvalid']).toBeTrue();
  });
});
