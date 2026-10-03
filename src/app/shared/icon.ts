import { Component, input } from '@angular/core';

/**
 * Icono de trazo del sprite public/icons.svg. Siempre es decorativo: el control lo nombra el
 * texto que lo acompana, por eso el icono se oculta a los lectores de pantalla.
 */
@Component({
  selector: 'app-icon',
  template: `<svg class="icon" aria-hidden="true" focusable="false"><use [attr.href]="'/icons.svg#' + name()" /></svg>`,
})
export class Icon {
  readonly name = input.required<string>();
}
