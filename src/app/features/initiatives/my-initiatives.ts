import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Api, errorMessage } from '../../core/api';
import { InitiativeSummary } from '../../core/models';
import { LabelPipe } from '../../shared/labels';

@Component({
  selector: 'app-my-initiatives',
  imports: [RouterLink, DatePipe, LabelPipe],
  template: `
    <h1>Mis iniciativas</h1>
    <p><a class="button" routerLink="/mis-iniciativas/nueva">Nueva iniciativa</a></p>

    @if (error()) {
      <p class="notice error" role="alert">{{ error() }}</p>
    } @else if (initiatives(); as items) {
      @if (items.length === 0) {
        <div class="notice">
          <p><strong>Todavía no has registrado iniciativas.</strong></p>
          <p>Crea la primera con el botón «Nueva iniciativa». Se guarda como borrador y solo tú la ves hasta que la envíes a revisión.</p>
        </div>
      } @else {
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">Título</th>
                <th scope="col">Estado</th>
                <th scope="col">Última actualización</th>
              </tr>
            </thead>
            <tbody>
              @for (initiative of items; track initiative.id) {
                <tr>
                  <td><a [routerLink]="['/mis-iniciativas', initiative.id]">{{ initiative.title }}</a></td>
                  <td><span class="state" [attr.data-state]="initiative.state">{{ initiative.state | label }}</span></td>
                  <td>{{ initiative.updatedAt | date: 'dd/MM/yyyy HH:mm' }}</td>
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
export class MyInitiatives implements OnInit {
  private readonly api = inject(Api);

  protected readonly initiatives = signal<InitiativeSummary[] | null>(null);
  protected readonly error = signal('');

  async ngOnInit(): Promise<void> {
    try {
      this.initiatives.set(await this.api.myInitiatives());
    } catch (error) {
      this.error.set(errorMessage(error));
    }
  }
}
