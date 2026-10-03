import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  template: `
    <h1>No encontramos esta página</h1>
    <p>Puede que el enlace esté mal escrito o que el contenido ya no esté publicado.</p>
    <p><a routerLink="/">Volver al inicio</a></p>
  `,
})
export class NotFound {}
