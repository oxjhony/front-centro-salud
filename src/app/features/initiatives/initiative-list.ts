import { Component, inject, PendingTasks, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Api, errorMessage } from '../../core/api';
import { Catalogs, InitiativeSummary, Page } from '../../core/models';
import { LabelPipe } from '../../shared/labels';
import { Pager } from '../../shared/pager';
import { termsOfType, TermTags } from '../../shared/taxonomy';

/** Recorrido R1 "Descubrir conocimiento": buscar y filtrar iniciativas publicadas. */
@Component({
  selector: 'app-initiative-list',
  imports: [FormsModule, RouterLink, LabelPipe, Pager, TermTags],
  template: `
    <h1>Iniciativas</h1>

    <form class="filters" role="search" (ngSubmit)="apply()">
      <div class="field">
        <label for="q">Buscar</label>
        <input id="q" name="q" type="search" [(ngModel)]="filters.q" />
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
        <label for="territorio">Territorio</label>
        <select id="territorio" name="territorio" [(ngModel)]="filters.territoryId">
          <option value="">Todos</option>
          @for (territory of options('TERRITORY'); track territory.id) {
            <option [value]="territory.id">{{ territory.depth ? '— ' : '' }}{{ territory.name }}</option>
          }
        </select>
      </div>
      <div class="field">
        <label for="tipo">Tipo</label>
        <select id="tipo" name="tipo" [(ngModel)]="filters.type">
          <option value="">Todos</option>
          @for (type of catalogs()?.initiativeTypes; track type) {
            <option [value]="type">{{ type | label }}</option>
          }
        </select>
      </div>
      <button type="submit">Buscar</button>
      <button type="button" class="secondary" (click)="clear()">Limpiar</button>
    </form>

    @if (error()) {
      <p class="notice error" role="alert">{{ error() }}</p>
    } @else if (result(); as page) {
      <p class="meta" aria-live="polite">
        {{ page.total }} {{ page.total === 1 ? 'iniciativa publicada' : 'iniciativas publicadas' }}
      </p>

      @if (page.total === 0) {
        <div class="notice">
          <p><strong>No encontramos iniciativas con esos criterios.</strong></p>
          <p>Prueba con otras palabras o quita algún filtro con el botón «Limpiar».</p>
        </div>
      } @else {
        <ul class="cards">
          @for (initiative of page.items; track initiative.id) {
            <li class="card">
              <h2><a [routerLink]="['/iniciativas', initiative.id]">{{ initiative.title }}</a></h2>
              <p class="meta">{{ initiative.type | label }}</p>
              <p>{{ initiative.summary }}</p>
              <app-term-tags [terms]="initiative.terms" />
            </li>
          }
        </ul>
        <app-pager [page]="page" />
      }
    } @else {
      <p>Cargando iniciativas…</p>
    }
  `,
})
export class InitiativeList {
  private readonly api = inject(Api);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly tasks = inject(PendingTasks);

  protected readonly catalogs = signal<Catalogs | null>(null);
  protected readonly result = signal<Page<InitiativeSummary> | null>(null);
  protected readonly error = signal('');
  protected filters = { q: '', themeId: '', territoryId: '', type: '' };

  constructor() {
    this.tasks.run(async () => this.catalogs.set(await this.api.catalogs().catch(() => null)));

    // Los filtros viven en la URL: la busqueda se puede compartir y el servidor la renderiza.
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      this.filters = {
        q: params.get('q') ?? '',
        themeId: params.get('tema') ?? '',
        territoryId: params.get('territorio') ?? '',
        type: params.get('tipo') ?? '',
      };
      this.tasks.run(() => this.load(Number(params.get('pagina')) || 1));
    });
  }

  protected options(type: 'THEME' | 'TERRITORY') {
    return termsOfType(this.catalogs()?.terms ?? [], type);
  }

  private async load(page: number): Promise<void> {
    try {
      this.result.set(
        await this.api.publicInitiatives({
          q: this.filters.q,
          themeId: this.filters.themeId,
          territoryId: this.filters.territoryId,
          type: this.filters.type,
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
        territorio: this.filters.territoryId || null,
        tipo: this.filters.type || null,
        pagina: null,
      },
    });
  }

  protected clear(): void {
    void this.router.navigate([], { queryParams: {} });
  }
}
