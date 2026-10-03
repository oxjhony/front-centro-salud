import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Api, errorMessage } from '../../core/api';
import { QueueItem } from '../../core/models';
import { LabelPipe } from '../../shared/labels';

/** Bandeja de revision (H-11): lo enviado, lo que esta en revision y lo aprobado sin publicar. */
@Component({
  selector: 'app-review-queue',
  imports: [RouterLink, DatePipe, LabelPipe],
  template: `
    <h1>Bandeja de revisión</h1>

    @if (error()) {
      <p class="notice error" role="alert">{{ error() }}</p>
    } @else if (queue(); as items) {
      @if (items.length === 0) {
        <div class="notice">
          <p><strong>No hay contenidos pendientes de revisión.</strong></p>
          <p>Cuando un autor envíe una iniciativa, un recurso o un curso, aparecerá aquí.</p>
        </div>
      } @else {
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">Contenido</th>
                <th scope="col">Tipo</th>
                <th scope="col">Autor</th>
                <th scope="col">Estado</th>
                <th scope="col">Desde</th>
              </tr>
            </thead>
            <tbody>
              @for (item of items; track item.id) {
                <tr>
                  <td><a [routerLink]="['/revision', item.entityType, item.id]">{{ item.title }}</a></td>
                  <td>{{ item.entityType | label }}</td>
                  <td>{{ item.authorName }}</td>
                  <td><span class="state" [attr.data-state]="item.state">{{ item.state | label }}</span></td>
                  <td>{{ item.since | date: 'dd/MM/yyyy HH:mm' }}</td>
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
export class ReviewQueue implements OnInit {
  private readonly api = inject(Api);

  protected readonly queue = signal<QueueItem[] | null>(null);
  protected readonly error = signal('');

  async ngOnInit(): Promise<void> {
    try {
      this.queue.set(await this.api.reviewQueue());
    } catch (error) {
      this.error.set(errorMessage(error));
    }
  }
}
