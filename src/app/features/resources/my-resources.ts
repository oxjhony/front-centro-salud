import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Api, errorMessage } from '../../core/api';
import { ResourceSummary } from '../../core/models';
import { LabelPipe } from '../../shared/labels';

@Component({
  selector: 'app-my-resources',
  imports: [RouterLink, DatePipe, LabelPipe],
  template: `
    <h1>Mis recursos</h1>
    <p><a class="button" routerLink="/mis-recursos/nuevo">Nuevo recurso</a></p>

    @if (error()) {
      <p class="notice error" role="alert">{{ error() }}</p>
    } @else if (resources(); as items) {
      @if (items.length === 0) {
        <div class="notice">
          <p><strong>Todavía no has registrado recursos.</strong></p>
          <p>Crea el primero con el botón «Nuevo recurso», carga su archivo y envíalo a revisión.</p>
        </div>
      } @else {
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">Título</th>
                <th scope="col">Estado</th>
                <th scope="col">Acceso</th>
                <th scope="col">Versión vigente</th>
                <th scope="col">Última actualización</th>
              </tr>
            </thead>
            <tbody>
              @for (resource of items; track resource.id) {
                <tr>
                  <td><a [routerLink]="['/mis-recursos', resource.id]">{{ resource.title }}</a></td>
                  <td><span class="state" [attr.data-state]="resource.state">{{ resource.state | label }}</span></td>
                  <td>{{ resource.visibility | label }}</td>
                  <td>{{ resource.latestVersion ? 'v' + resource.latestVersion.versionNumber : 'Sin archivo' }}</td>
                  <td>{{ resource.updatedAt | date: 'dd/MM/yyyy HH:mm' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    } @else {
      <p>Cargando…</p>
    }
  `,
})
export class MyResources implements OnInit {
  private readonly api = inject(Api);

  protected readonly resources = signal<ResourceSummary[] | null>(null);
  protected readonly error = signal('');

  async ngOnInit(): Promise<void> {
    try {
      this.resources.set(await this.api.myResources());
    } catch (error) {
      this.error.set(errorMessage(error));
    }
  }
}
