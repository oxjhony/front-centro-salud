import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '../../shared/icon';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink, Icon],
  template: `
    <div class="not-found">
      <app-icon name="compass" />
      <h1>No encontramos esta página</h1>
      <p class="lead">Puede que el enlace esté mal escrito o que el contenido ya no esté publicado.</p>
      <div class="actions">
        <a class="button" routerLink="/">Volver al inicio</a>
      </div>
    </div>
  `,
})
export class NotFound {}
