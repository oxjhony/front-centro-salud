import { Component, inject, PendingTasks, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Api, errorMessage } from '../../core/api';
import { Catalogs, Page, PublicResourceSummary } from '../../core/models';
import { FileSizePipe, LabelPipe } from '../../shared/labels';
import { Pager } from '../../shared/pager';
import { termsOfType, TermTags } from '../../shared/taxonomy';

/** Repositorio de conocimiento: buscar y filtrar recursos publicados (RF-05, RF-10). */
@Component({
  selector: 'app-resource-list',
  imports: [FormsModule, RouterLink, LabelPipe, FileSizePipe, Pager, TermTags],
  template: `
    <h1>Recursos</h1>
    <p class="meta">Guías, informes, conjuntos de datos y otros productos de conocimiento revisados por el Centro.</p>

    <form class="filters" role="search" (ngSubmit)="apply()">
      <div class="field">
        <label for="q">Buscar</label>
        <input id="q" name="q" type="search" [(ngModel)]="filters.q" />
      </div>
      <div class="field">
        <label for="tipo-recurso">Tipo de recurso</label>
        <select id="tipo-recurso" name="tipoRecurso" [(ngModel)]="filters.resourceTypeId">
          <option value="">Todos</option>
          @for (type of options('RESOURCE_TYPE'); track type.id) {
            <option [value]="type.id">{{ type.name }}</option>
          }
        </select>
      </div>
      <div class="field">
        <label for="tema">Tema</label>
        <select id="tema" name="tema" [(ngModel)]="filters.themeId">
          <option value="">Todos</option>
          @for (theme of options('THEME'); track theme.id) {
            <option [value]="theme.id">{{ theme.name }}</option>
          }
        </select>
      </div>
      <div class="field">
        <label for="acceso">Acceso</label>
        <select id="acceso" name="acceso" [(ngModel)]="filters.visibility">
          <option value="">Todos</option>
          @for (visibility of catalogs()?.visibilities; track visibility) {
            <option [value]="visibility">{{ visibility | label }}</option>
          }
        </select>
      </div>
      <button type="submit">Buscar</button>
      <button type="button" class="secondary" (click)="clear()">Limpiar</button>
    </form>

    @if (error()) {
      <p class="notice error" role="alert">{{ error() }}</p>
    } @else if (result(); as page) {
      <p class="meta" aria-live="polite">{{ page.total }} {{ page.total === 1 ? 'recurso publicado' : 'recursos publicados' }}</p>

      @if (page.total === 0) {
        <div class="notice">
          <p><strong>No encontramos recursos con esos criterios.</strong></p>
          <p>Prueba con otras palabras o quita algún filtro con el botón «Limpiar».</p>
        </div>
      } @else {
        <ul class="cards">
          @for (resource of page.items; track resource.id) {
            <li class="card">
              <h2><a [routerLink]="['/recursos', resource.id]">{{ resource.title }}</a></h2>
              <p class="meta">
                {{ resource.visibility | label }}
                @if (resource.file; as file) {
                  · {{ file.originalFilename }} ({{ file.sizeBytes | fileSize }})
                }
              </p>
              <p>{{ resource.description }}</p>
              <app-term-tags [terms]="resource.terms" />
            </li>
          }
        </ul>
        <app-pager [page]="page" />
      }
    } @else {
      <p>Cargando recursos…</p>
    }
  `,
})
export class ResourceList {
  private readonly api = inject(Api);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly tasks = inject(PendingTasks);

  protected readonly catalogs = signal<Catalogs | null>(null);
  protected readonly result = signal<Page<PublicResourceSummary> | null>(null);
  protected readonly error = signal('');
  protected filters = { q: '', themeId: '', resourceTypeId: '', visibility: '' };

  constructor() {
    this.tasks.run(async () => this.catalogs.set(await this.api.catalogs().catch(() => null)));

    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      this.filters = {
        q: params.get('q') ?? '',
        themeId: params.get('tema') ?? '',
        resourceTypeId: params.get('tipo') ?? '',
        visibility: params.get('acceso') ?? '',
      };
      this.tasks.run(() => this.load(Number(params.get('pagina')) || 1));
    });
  }

  protected options(type: 'THEME' | 'RESOURCE_TYPE') {
    return termsOfType(this.catalogs()?.terms ?? [], type);
  }

  private async load(page: number): Promise<void> {
    try {
      this.result.set(
        await this.api.publicResources({
          q: this.filters.q,
          themeId: this.filters.themeId,
          resourceTypeId: this.filters.resourceTypeId,
          visibility: this.filters.visibility,
          page,
        }),
      );
      this.error.set('');
    } catch (error) {
      this.error.set(errorMessage(error));
    }
  }

  protected apply(): void {
    void this.router.navigate([], {
      queryParams: {
        q: this.filters.q || null,
        tema: this.filters.themeId || null,
        tipo: this.filters.resourceTypeId || null,
        acceso: this.filters.visibility || null,
        pagina: null,
      },
    });
  }

  protected clear(): void {
    void this.router.navigate([], { queryParams: {} });
  }
}
