/**
 * Remote Entry Component - MF SP
 *
 * Componente raiz del micro-frontend SuperPago SPEI.
 * Cargado por el Shell via Native Federation.
 */
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'mf-sp-entry',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
export class EntryComponent {}
