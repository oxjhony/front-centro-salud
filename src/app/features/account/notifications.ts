import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Api, errorMessage } from '../../core/api';
import { NotificationRecord } from '../../core/models';

/** Avisos de la persona (RF-13), como el panel de notificaciones de Moodle. */
@Component({
  selector: 'app-notifications',
  imports: [DatePipe],
  template: `
    <h1>Notificaciones</h1>

    @if (error()) {
      <p class="notice error" role="alert">{{ error() }}</p>
    } @else if (items(); as list) {
      @if (unread() > 0) {
        <div class="actions">
          <span><strong>{{ unread() }}</strong> sin leer</span>
          <button type="button" class="secondary" (click)="readAll()">Marcar todas como leídas</button>
        </div>
      }
      @if (list.length === 0) {
        <div class="empty">
          <p><strong>No tienes notificaciones.</strong></p>
          <p>Aquí verás cuándo tus contenidos avanzan en el flujo editorial.</p>
        </div>
      } @else {
        <ul class="notification-list">
          @for (item of list; track item.id) {
            <li [class.unread]="!item.readAt">
              <p>
                <strong>{{ item.title }}</strong>
                @if (!item.readAt) {
                  <span class="visually-hidden"> (sin leer)</span>
                }
              </p>
              <p class="meta">{{ item.message }} · {{ item.createdAt | date: 'dd/MM/yyyy HH:mm' }}</p>
              @if (item.link) {
                <button type="button" class="secondary" (click)="open(item)">Ver contenido</button>
              } @else if (!item.readAt) {
                <button type="button" class="secondary" (click)="markRead(item)">Marcar como leída</button>
              }
            </li>
          }
        </ul>
      }
    } @else {
      <p class="loading" role="status">Cargando…</p>
    }
  `,
})
export class NotificationsPage implements OnInit {
  private readonly api = inject(Api);
  private readonly router = inject(Router);

  protected readonly items = signal<NotificationRecord[] | null>(null);
  protected readonly unread = signal(0);
  protected readonly error = signal('');

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  private async load(): Promise<void> {
    try {
      const { items, unread } = await this.api.notifications();
      this.items.set(items);
      this.unread.set(unread);
    } catch (error) {
      this.error.set(errorMessage(error));
    }
  }

  protected async markRead(item: NotificationRecord): Promise<void> {
    await this.api.markNotificationRead(item.id);
    await this.load();
  }

  protected async open(item: NotificationRecord): Promise<void> {
    if (!item.readAt) await this.api.markNotificationRead(item.id);
    await this.router.navigateByUrl(item.link ?? '/');
  }

  protected async readAll(): Promise<void> {
    await this.api.markAllNotificationsRead();
    await this.load();
  }
}
