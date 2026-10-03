import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Api } from '../../core/api';
import { AuthService } from '../../core/auth';
import { NotificationRecord, Permission } from '../../core/models';
import { label, LabelPipe } from '../../shared/labels';

interface MyContent {
  title: string;
  route: string;
  items: { id: string; title: string; state: string }[];
}

/**
 * Area personal, como el tablero de Moodle: lo ultimo que le paso a la persona y lo que tiene en
 * curso. Los accesos a cada seccion son las pestanas de la barra personal.
 */
@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, DatePipe, LabelPipe],
  template: `
    <h1>Mi área</h1>
    @if (auth.user(); as user) {
      <p class="lead">
        Hola, {{ user.displayName }}.
        <span class="meta">Roles: {{ roleNames(user.roles) }}</span>
      </p>
    }

    <div class="dashboard">
      <section class="card" aria-labelledby="dash-notifications">
        <h2 id="dash-notifications">Notificaciones recientes</h2>
        @for (item of notifications(); track item.id) {
          <p class="dashboard-item">
            @if (!item.readAt) {
              <strong>{{ item.title }}</strong>
              <span class="attention">Sin leer</span>
            } @else {
              {{ item.title }}
            }
            <br /><span class="meta">{{ item.createdAt | date: 'dd/MM/yyyy HH:mm' }}</span>
          </p>
        } @empty {
          <p class="meta">No tienes notificaciones.</p>
        }
        <p><a routerLink="/notificaciones">Ver todas</a></p>
      </section>

      @for (group of contents(); track group.route) {
        <section class="card" [attr.aria-label]="group.title">
          <h2>{{ group.title }}</h2>
          @for (item of group.items.slice(0, 5); track item.id) {
            <p class="dashboard-item">
              <a [routerLink]="[group.route, item.id]">{{ item.title }}</a><br />
              <span class="state" [attr.data-state]="item.state">{{ item.state | label }}</span>
              @if (item.state === 'RETURNED') {
                <span class="attention">Necesita cambios</span>
              }
            </p>
          } @empty {
            <p class="meta">Todavía no tienes contenidos aquí.</p>
          }
          <p><a [routerLink]="group.route">Ir a {{ group.title.toLowerCase() }}</a></p>
        </section>
      }
    </div>
  `,
})
export class Dashboard implements OnInit {
  private readonly api = inject(Api);
  protected readonly auth = inject(AuthService);

  protected readonly notifications = signal<NotificationRecord[]>([]);
  protected readonly contents = signal<MyContent[]>([]);

  async ngOnInit(): Promise<void> {
    const can = (permission: string) => this.auth.can(permission);
    const [notifications, initiatives, resources, courses] = await Promise.all([
      this.api.notifications().catch(() => ({ items: [] as NotificationRecord[], unread: 0 })),
      can(Permission.InitiativeManage) ? this.api.myInitiatives().catch(() => []) : null,
      can(Permission.ResourceManage) ? this.api.myResources().catch(() => []) : null,
      can(Permission.CourseManage) ? this.api.myCourses().catch(() => []) : null,
    ]);
    this.notifications.set(notifications.items.slice(0, 5));
    const groups: (MyContent | null)[] = [
      initiatives && { title: 'Mis iniciativas', route: '/mis-iniciativas', items: initiatives },
      resources && { title: 'Mis recursos', route: '/mis-recursos', items: resources },
      courses && { title: 'Mis cursos', route: '/mis-cursos', items: courses },
    ];
    this.contents.set(groups.filter((group): group is MyContent => group !== null));
  }

  protected roleNames(roles: string[]): string {
    return roles.map(label).join(', ') || 'sin roles';
  }
}
