/**
 * Validador CLABE con checksum mod-10 (pesos 3-7-1).
 *
 * Algoritmo oficial Banxico:
 *   1. Multiplica cada uno de los primeros 17 digitos por su peso (3, 7 o 1 ciclicamente).
 *   2. Suma los modulos 10 de cada producto.
 *   3. El digito verificador = (10 - (suma % 10)) % 10.
 *
 * Ref: https://www.banxico.org.mx/EDIFACTMX/service/clabe.html
 */

import { AbstractControl, ValidationErrors } from '@angular/forms';

const CLABE_WEIGHTS = [3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7];

/**
 * Verifica si una cadena de 18 digitos es una CLABE valida (incluye checksum mod-10).
 */
export function isClabeValid(value: string): boolean {
  const clabe = value.replace(/\s/g, '');
  if (!/^\d{18}$/.test(clabe)) return false;

  const digits = clabe.split('').map(Number);
  const sum = CLABE_WEIGHTS.reduce(
    (acc, weight, i) => acc + ((digits[i] * weight) % 10),
    0
  );
  const expectedCheckDigit = (10 - (sum % 10)) % 10;
  return digits[17] === expectedCheckDigit;
}

/**
 * Validador de Angular Forms para CLABE mexicana con checksum mod-10.
 * Permite campo vacio (requiere Validators.required por separado).
 */
export function clabeChecksumValidator(
  control: AbstractControl
): ValidationErrors | null {
  const value = (control.value ?? '').replace(/\s/g, '');
  if (!value) return null; // Dejar a Validators.required manejar el campo vacio

  if (!/^\d{18}$/.test(value)) {
    return { clabeInvalid: true };
  }

  if (!isClabeValid(value)) {
    return { clabeChecksum: true };
  }

  return null;
}
