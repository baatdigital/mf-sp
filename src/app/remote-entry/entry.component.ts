/**
 * Remote Entry Component - MF SP
 *
 * Componente raiz del micro-frontend SuperPago Portal.
 * Cargado por el Shell via Native Federation.
 */

import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-mf-sp-entry',
  standalone: true,
  imports: [RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<router-outlet />`,
})
export class RemoteEntryComponent {}

export default RemoteEntryComponent;
