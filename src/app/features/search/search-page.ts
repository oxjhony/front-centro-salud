import { Component, inject, PendingTasks, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Api, errorMessage } from '../../core/api';
import { Page, SearchableType, SearchHit } from '../../core/models';
import { LabelPipe } from '../../shared/labels';
import { Pager } from '../../shared/pager';
import { TermTags } from '../../shared/taxonomy';

const DETAIL_ROUTE: Record<SearchableType, string> = {
  initiatives: '/iniciativas',
  resources: '/recursos',
  courses: '/cursos',
};

/** Busqueda unica del portal (RF-10): iniciativas, recursos y cursos publicados, por pertinencia. */
@Component({
  selector: 'app-search-page',
  imports: [FormsModule, RouterLink, LabelPipe, Pager, TermTags],
  template: `
    <h1>Buscar en el portal</h1>
    <p class="lead">Busca a la vez en iniciativas, recursos y cursos publicados.</p>

    <form class="filters" role="search" (ngSubmit)="apply()">
      <div class="field">
        <label for="q">Palabras</label>
        <input id="q" name="q" type="search" [(ngModel)]="filters.q" />
      </div>
      <div class="field">
        <label for="tipo">Tipo de contenido</label>
        <select id="tipo" name="tipo" [(ngModel)]="filters.type">
          <option value="">Todos</option>
          <option value="initiatives">Iniciativas</option>
          <option value="resources">Recursos</option>
          <option value="courses">Cursos</option>
        </select>
      </div>
      <button type="submit">Buscar</button>
    </form>

    @if (error()) {
      <p class="notice error" role="alert">{{ error() }}</p>
    } @else if (result(); as page) {
      <p class="meta" aria-live="polite">{{ page.total }} {{ page.total === 1 ? 'resultado' : 'resultados' }}</p>
      @if (page.total === 0) {
        <div class="empty">
          <p><strong>No encontramos contenidos publicados con esos criterios.</strong></p>
          <p>Prueba con otras palabras, sin tildes o con menos términos.</p>
        </div>
      } @else {
        <ul class="cards">
          @for (hit of page.items; track hit.type + hit.id) {
            <li class="card">
              <p class="meta">{{ hit.type | label }}</p>
              <h2><a [routerLink]="[route(hit), hit.id]">{{ hit.title }}</a></h2>
              <p>{{ hit.excerpt }}</p>
              <app-term-tags [terms]="hit.terms" />
            </li>
          }
        </ul>
        <app-pager [page]="page" />
      }
    } @else {
      <p class="loading" role="status">Buscando…</p>
    }
  `,
})
export class SearchPage {
  private readonly api = inject(Api);
  private readonly router = inject(Router);
  private readonly route$ = inject(ActivatedRoute);
  private readonly tasks = inject(PendingTasks);

  protected readonly result = signal<Page<SearchHit> | null>(null);
  protected readonly error = signal('');
  protected filters = { q: '', type: '' };

  constructor() {
    this.route$.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      this.filters = { q: params.get('q') ?? '', type: params.get('tipo') ?? '' };
      this.tasks.run(() => this.load(Number(params.get('pagina')) || 1));
    });
  }

  private async load(page: number): Promise<void> {
    try {
      this.result.set(await this.api.search({ q: this.filters.q, type: this.filters.type, page }));
      this.error.set('');
    } catch (error) {
      this.error.set(errorMessage(error));
    }
  }

  protected route(hit: SearchHit): string {
    return DETAIL_ROUTE[hit.type];
  }

  protected apply(): void {
    void this.router.navigate([], { queryParams: { q: this.filters.q || null, tipo: this.filters.type || null, pagina: null } });
  }
}
