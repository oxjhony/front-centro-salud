import { DatePipe, JsonPipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Api, errorMessage } from '../../core/api';
import { AuthService } from '../../core/auth';
import {
  AuditRecord,
  IntegrationLogRecord,
  Permission,
  ReconciliationSummary,
  RoleSummary,
  TaxonomyType,
  TermAdmin,
  UserStatus,
  UserSummary,
} from '../../core/models';
import { LabelPipe, taxonomyLabel } from '../../shared/labels';
import { termsOfType } from '../../shared/taxonomy';

const TAXONOMY_TYPES: TaxonomyType[] = ['THEME', 'TERRITORY', 'POPULATION', 'RESOURCE_TYPE', 'TAG'];

/**
 * Administracion: usuarios, roles y estado de las cuentas (H-03), taxonomia (RF-15), integracion
 * con Moodle (H-24, H-33) y bitacora de auditoria (H-35). Cada seccion aparece solo si la persona
 * tiene el permiso; la API lo vuelve a comprobar en cada operacion.
 */
@Component({
  selector: 'app-admin',
  imports: [DatePipe, JsonPipe, FormsModule, LabelPipe],
  template: `
    <h1>Administración</h1>

    @if (error()) {
      <p class="notice error" role="alert">{{ error() }}</p>
    }
    @if (notice()) {
      <p class="notice ok" role="status">{{ notice() }}</p>
    }

    @if (auth.can(Permission.UserManage)) {
      <section aria-labelledby="users-title">
        <h2 id="users-title">Usuarios y roles</h2>
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">Usuario</th>
                <th scope="col">Roles</th>
                <th scope="col">Estado</th>
                <th scope="col">Acción</th>
              </tr>
            </thead>
            <tbody>
              @for (user of users(); track user.id) {
                <tr>
                  <td>
                    {{ user.displayName }}<br />
                    <span class="meta">{{ user.email }}</span><br />
                    <span class="meta">Último ingreso: {{ user.lastLoginAt ? (user.lastLoginAt | date: 'dd/MM/yyyy HH:mm') : 'nunca' }}</span>
                  </td>
                  <td>
                    <fieldset class="plain" [disabled]="isSelf(user)">
                      <legend class="meta">Roles de {{ user.displayName }}</legend>
                      @for (role of assignableRoles(); track role.name) {
                        <label [title]="role.description">
                          <input type="checkbox" [checked]="user.roles.includes(role.name)" (change)="toggleRole(user, role.name)" />
                          {{ role.name | label }}
                        </label>
                      }
                    </fieldset>
                  </td>
                  <td>
                    <label class="visually-hidden" [for]="'status-' + user.id">Estado de {{ user.displayName }}</label>
                    <select [id]="'status-' + user.id" [disabled]="isSelf(user)" [ngModel]="user.status" (ngModelChange)="setStatus(user, $event)">
                      @for (status of statuses; track status) {
                        <option [value]="status">{{ status | label }}</option>
                      }
                    </select>
                  </td>
                  <td>
                    @if (isSelf(user)) {
                      <span class="meta">Nadie cambia sus propios roles ni su estado</span>
                    } @else {
                      <button type="button" class="secondary" (click)="saveRoles(user)">Guardar roles</button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    }

    @if (auth.can(Permission.TaxonomyManage)) {
      <section aria-labelledby="taxonomy-title">
        <h2 id="taxonomy-title">Taxonomía</h2>
        <p class="meta">
          Temas, territorios, poblaciones, tipos de recurso y etiquetas con los que se clasifica todo el contenido.
          Un término en uso no se borra: se desactiva y deja de ofrecerse para clasificar contenido nuevo.
        </p>

        <form class="filters" (ngSubmit)="createTerm()">
          <div class="field">
            <label for="term-type">Tipo</label>
            <select id="term-type" name="type" [(ngModel)]="newTerm.type" (ngModelChange)="newTerm.parentId = ''">
              @for (type of taxonomyTypes; track type) {
                <option [value]="type">{{ typeLabel(type) }}</option>
              }
            </select>
          </div>
          <div class="field">
            <label for="term-name">Nombre</label>
            <input id="term-name" name="name" type="text" required minlength="2" maxlength="150" [(ngModel)]="newTerm.name" />
          </div>
          <div class="field">
            <label for="term-parent">Dentro de</label>
            <select id="term-parent" name="parent" [(ngModel)]="newTerm.parentId">
              <option value="">(ninguno)</option>
              @for (term of termsOf(newTerm.type); track term.id) {
                <option [value]="term.id">{{ term.depth ? '— ' : '' }}{{ term.name }}</option>
              }
            </select>
          </div>
          <button type="submit">Agregar término</button>
        </form>

        @for (type of taxonomyTypes; track type) {
          <h3>{{ typeLabel(type) }}</h3>
          <div class="table-scroll">
            <table>
              <thead>
                <tr>
                  <th scope="col">Término</th>
                  <th scope="col">Uso</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (term of termsOf(type); track term.id) {
                  <tr>
                    <td [style.padding-left.px]="12 + term.depth * 20">{{ term.name }}</td>
                    <td>{{ term.usage }} {{ term.usage === 1 ? 'contenido' : 'contenidos' }}</td>
                    <td>{{ term.active ? 'Activo' : 'Inactivo' }}</td>
                    <td>
                      <button type="button" class="secondary" (click)="renameTerm(term)">Renombrar</button>
                      <button type="button" class="secondary" (click)="toggleTerm(term)">{{ term.active ? 'Desactivar' : 'Activar' }}</button>
                      @if (term.usage === 0 && term.children === 0) {
                        <button type="button" class="secondary danger" (click)="deleteTerm(term)">Borrar</button>
                      }
                    </td>
                  </tr>
                } @empty {
                  <tr><td colspan="4" class="meta">Sin términos.</td></tr>
                }
              </tbody>
            </table>
          </div>
        }
      </section>
    }

    @if (auth.can(Permission.IntegrationOperate)) {
      <section aria-labelledby="moodle-title">
        <h2 id="moodle-title">Integración con Moodle</h2>
        <p>
          La conciliación vuelve a comprobar contra Moodle el enlace de cada curso: detecta aulas eliminadas,
          identificadores duplicados y cambios tras una restauración.
        </p>
        <button type="button" [disabled]="reconciling()" (click)="reconcile()">
          {{ reconciling() ? 'Conciliando…' : 'Conciliar con Moodle ahora' }}
        </button>

        @if (summary(); as result) {
          <p class="notice" role="status">
            Cursos revisados: {{ result.reviewed }} · verificados: {{ result.verified }} · huérfanos:
            {{ result.orphaned }} · con error: {{ result.withError }} · sin respuesta de Moodle: {{ result.unanswered }}
          </p>
        }

        <h3>Errores de integración recientes</h3>
        @if (integrationErrors().length === 0) {
          <p class="meta">No hay errores de integración registrados.</p>
        } @else {
          <div class="table-scroll">
            <table>
              <thead>
                <tr>
                  <th scope="col">Momento</th>
                  <th scope="col">Sistema</th>
                  <th scope="col">Resultado</th>
                  <th scope="col">Código</th>
                  <th scope="col">Detalle</th>
                </tr>
              </thead>
              <tbody>
                @for (log of integrationErrors(); track log.id) {
                  <tr>
                    <td>{{ log.occurredAt | date: 'dd/MM/yyyy HH:mm:ss' }}</td>
                    <td>{{ log.integration }}</td>
                    <td>{{ log.status }}</td>
                    <td>{{ log.errorCode }}</td>
                    <td>{{ log.message }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </section>
    }

    @if (auth.can(Permission.AuditView)) {
      <section aria-labelledby="audit-title">
        <h2 id="audit-title">Bitácora de auditoría</h2>
        <p class="meta">Solo consulta: la bitácora no se puede editar ni borrar desde la aplicación.</p>
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">Momento</th>
                <th scope="col">Quién</th>
                <th scope="col">Acción</th>
                <th scope="col">Objeto</th>
                <th scope="col">Detalle</th>
              </tr>
            </thead>
            <tbody>
              @for (audit of audits(); track audit.id) {
                <tr>
                  <td>{{ audit.occurredAt | date: 'dd/MM/yyyy HH:mm:ss' }}</td>
                  <td>{{ audit.actorName || '—' }}</td>
                  <td>{{ audit.action }}</td>
                  <td>{{ audit.objectType }}</td>
                  <td>{{ audit.minimalDetail ? (audit.minimalDetail | json) : '' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    }
  `,
})
export class Admin implements OnInit {
  private readonly api = inject(Api);
  protected readonly auth = inject(AuthService);
  protected readonly Permission = Permission;
  protected readonly taxonomyTypes = TAXONOMY_TYPES;
  protected readonly statuses: UserStatus[] = ['ACTIVE', 'INACTIVE', 'SUSPENDED'];
  protected readonly typeLabel = taxonomyLabel;

  protected readonly users = signal<UserSummary[]>([]);
  protected readonly roles = signal<RoleSummary[]>([]);
  protected readonly assignableRoles = computed(() => this.roles().filter((role) => role.assignable));
  protected readonly terms = signal<TermAdmin[]>([]);
  protected readonly audits = signal<AuditRecord[]>([]);
  protected readonly integrationErrors = signal<IntegrationLogRecord[]>([]);
  protected readonly summary = signal<ReconciliationSummary | null>(null);
  protected readonly reconciling = signal(false);
  protected readonly notice = signal('');
  protected readonly error = signal('');

  protected newTerm: { type: TaxonomyType; name: string; parentId: string } = { type: 'THEME', name: '', parentId: '' };

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  private async load(): Promise<void> {
    try {
      if (this.auth.can(Permission.UserManage)) {
        const [users, roles] = await Promise.all([this.api.users(), this.api.roles()]);
        this.users.set(users);
        this.roles.set(roles);
      }
      if (this.auth.can(Permission.TaxonomyManage)) {
        this.terms.set(await this.api.taxonomy());
      }
      if (this.auth.can(Permission.IntegrationOperate)) {
        this.integrationErrors.set((await this.api.integrationLogs({ status: 'ERROR', pageSize: 10 })).items);
      }
      if (this.auth.can(Permission.AuditView)) {
        this.audits.set((await this.api.audits({ pageSize: 20 })).items);
      }
    } catch (error) {
      this.error.set(errorMessage(error));
    }
  }

  /** Mensajes y errores de una accion; recarga los datos al terminar bien. */
  private async act(work: () => Promise<unknown>, done: string): Promise<void> {
    this.notice.set('');
    this.error.set('');
    try {
      await work();
      this.notice.set(done);
      await this.load();
    } catch (error) {
      this.error.set(errorMessage(error));
    }
  }

  protected isSelf(user: UserSummary): boolean {
    return user.id === this.auth.user()?.id;
  }

  protected toggleRole(user: UserSummary, role: string): void {
    const roles = user.roles.includes(role) ? user.roles.filter((r) => r !== role) : [...user.roles, role];
    this.users.update((users) => users.map((u) => (u.id === user.id ? { ...u, roles } : u)));
  }

  protected saveRoles(user: UserSummary): Promise<void> {
    // Se toma la seleccion actual de la tabla, no la del momento en que se pinto la fila.
    const current = this.users().find((u) => u.id === user.id) ?? user;
    return this.act(() => this.api.assignRoles(current.id, current.roles), `Roles de ${current.displayName} actualizados.`);
  }

  protected setStatus(user: UserSummary, status: UserStatus): Promise<void> {
    return this.act(() => this.api.setUserStatus(user.id, status), `La cuenta de ${user.displayName} quedó ${this.statusText(status)}.`);
  }

  private statusText(status: UserStatus): string {
    return { ACTIVE: 'activa', INACTIVE: 'inactiva', SUSPENDED: 'suspendida' }[status];
  }

  protected termsOf(type: TaxonomyType) {
    return termsOfType(this.terms(), type) as (TermAdmin & { depth: number })[];
  }

  protected createTerm(): Promise<void> {
    const { type, name, parentId } = this.newTerm;
    return this.act(async () => {
      await this.api.createTerm({ type, name, parentId: parentId || null });
      this.newTerm = { type, name: '', parentId };
    }, `Término «${name.trim()}» agregado.`);
  }

  protected renameTerm(term: TermAdmin): Promise<void> | void {
    const name = globalThis.prompt?.('Nuevo nombre del término', term.name)?.trim();
    if (!name || name === term.name) return;
    return this.act(() => this.api.updateTerm(term.id, { name, parentId: term.parentId, active: term.active }), 'Término renombrado.');
  }

  protected toggleTerm(term: TermAdmin): Promise<void> {
    return this.act(
      () => this.api.updateTerm(term.id, { name: term.name, parentId: term.parentId, active: !term.active }),
      `«${term.name}» ${term.active ? 'desactivado' : 'activado'}.`,
    );
  }

  protected deleteTerm(term: TermAdmin): Promise<void> {
    return this.act(() => this.api.deleteTerm(term.id), `«${term.name}» borrado.`);
  }

  protected async reconcile(): Promise<void> {
    this.reconciling.set(true);
    this.error.set('');
    try {
      this.summary.set(await this.api.reconcileMoodle());
      await this.load();
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.reconciling.set(false);
    }
  }
}
