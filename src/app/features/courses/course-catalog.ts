import { Component, inject, PendingTasks, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Api, errorMessage } from '../../core/api';
import { Catalogs, Page, PublicCourse } from '../../core/models';
import { LabelPipe } from '../../shared/labels';
import { Pager } from '../../shared/pager';
import { termsOfType, TermTags } from '../../shared/taxonomy';
import { CourseAccessView } from './course-access';

/** Recorrido R3 "Encontrar formacion": filtrar el catalogo y llegar al aula virtual. */
@Component({
  selector: 'app-course-catalog',
  imports: [FormsModule, RouterLink, LabelPipe, CourseAccessView, Pager, TermTags],
  template: `
    <h1>Cursos</h1>
    <p class="lead">Cursos, microcursos y diplomados. Cada ficha te lleva al aula virtual o te explica cómo ingresar.</p>

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
        <label for="poblacion">Dirigido a</label>
        <select id="poblacion" name="poblacion" [(ngModel)]="filters.populationId">
          <option value="">Todas las personas</option>
          @for (population of options('POPULATION'); track population.id) {
            <option [value]="population.id">{{ population.name }}</option>
          }
        </select>
      </div>
      <div class="field">
        <label for="tipo">Tipo</label>
        <select id="tipo" name="tipo" [(ngModel)]="filters.type">
          <option value="">Todos</option>
          @for (type of catalogs()?.courseTypes; track type) {
            <option [value]="type">{{ type | label }}</option>
          }
        </select>
      </div>
      <div class="field">
        <label for="modalidad">Modalidad</label>
        <select id="modalidad" name="modalidad" [(ngModel)]="filters.modality">
          <option value="">Todas</option>
          @for (modality of catalogs()?.courseModalities; track modality) {
            <option [value]="modality">{{ modality | label }}</option>
          }
        </select>
      </div>
      <div class="filter-actions">
        <button type="submit">Buscar</button>
        <button type="button" class="secondary" [class.beacon]="result()?.total === 0" (click)="clear()">Limpiar</button>
      </div>
    </form>

    @if (error()) {
      <p class="notice error" role="alert">{{ error() }}</p>
    } @else if (result(); as page) {
      <p class="meta" aria-live="polite">{{ page.total }} {{ page.total === 1 ? 'curso' : 'cursos' }}</p>

      @if (page.total === 0) {
        <div class="empty">
          <p><strong>No hay cursos con esos criterios.</strong></p>
          <p>Prueba con otro tema o modalidad, o quita los filtros con el botón «Limpiar».</p>
        </div>
      } @else {
        <ul class="cards">
          @for (course of page.items; track course.id) {
            <li class="card">
              <h2><a [routerLink]="['/cursos', course.id]">{{ course.title }}</a></h2>
              <p class="meta">
                {{ course.type | label }} · {{ course.modality | label }}
                @if (course.duration) {
                  · {{ course.duration }}
                }
                @if (course.startDate) {
                  · Inicia {{ course.startDate }}
                }
              </p>
              <p>{{ course.summary }}</p>
              <app-term-tags [terms]="course.terms" />
              <!-- La instruccion de acceso se lee en la ficha del curso; la tarjeta solo ofrece el aula. -->
              @if (course.access.kind !== 'INSTRUCTIONS') {
                <app-course-access [access]="course.access" [courseTitle]="course.title" />
              }
            </li>
          }
        </ul>
        <app-pager [page]="page" />
      }
    } @else {
      <p class="loading" role="status">Cargando cursos…</p>
    }
  `,
})
export class CourseCatalog {
  private readonly api = inject(Api);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly tasks = inject(PendingTasks);

  protected readonly catalogs = signal<Catalogs | null>(null);
  protected readonly result = signal<Page<PublicCourse> | null>(null);
  protected readonly error = signal('');
  protected filters = { q: '', themeId: '', populationId: '', type: '', modality: '' };

  constructor() {
    this.tasks.run(async () => this.catalogs.set(await this.api.catalogs().catch(() => null)));

    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      this.filters = {
        q: params.get('q') ?? '',
        themeId: params.get('tema') ?? '',
        populationId: params.get('poblacion') ?? '',
        type: params.get('tipo') ?? '',
        modality: params.get('modalidad') ?? '',
      };
      this.tasks.run(() => this.load(Number(params.get('pagina')) || 1));
    });
  }

  protected options(type: 'THEME' | 'POPULATION') {
    return termsOfType(this.catalogs()?.terms ?? [], type);
  }

  private async load(page: number): Promise<void> {
    try {
      this.result.set(
        await this.api.publicCourses({
          q: this.filters.q,
          themeId: this.filters.themeId,
          populationId: this.filters.populationId,
          type: this.filters.type,
          modality: this.filters.modality,
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
        poblacion: this.filters.populationId || null,
        tipo: this.filters.type || null,
        modalidad: this.filters.modality || null,
        pagina: null,
      },
    });
  }

  protected clear(): void {
    void this.router.navigate([], { queryParams: {} });
  }
}
