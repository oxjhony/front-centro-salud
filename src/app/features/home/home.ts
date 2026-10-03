import { DatePipe } from '@angular/common';
import { Component, inject, PendingTasks, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Api } from '../../core/api';
import { SearchHit, SearchableType } from '../../core/models';
import { Icon } from '../../shared/icon';
import { LabelPipe } from '../../shared/labels';

const DETAIL_ROUTE: Record<SearchableType, string> = { initiatives: '/iniciativas', resources: '/recursos', courses: '/cursos' };

/** Los tres caminos del portal, en el orden en que se presentan. */
const PATHS = [
  {
    route: '/iniciativas',
    icon: 'lightbulb',
    title: 'Iniciativas',
    text: 'Proyectos, programas y experiencias de salud pública, con sus territorios y resultados.',
    keys: 'Vigilancia epidemiológica · Promoción y prevención · Territorios de Caldas',
    action: 'Explorar iniciativas',
  },
  {
    route: '/recursos',
    icon: 'book-open',
    title: 'Recursos',
    text: 'Guías, informes y conjuntos de datos revisados por el Centro, con su licencia y su historial de versiones.',
    keys: 'Guías · Conjuntos de datos · Acceso abierto',
    action: 'Consultar el repositorio',
  },
  {
    route: '/cursos',
    icon: 'graduation-cap',
    title: 'Cursos',
    text: 'Cursos, microcursos y diplomados. Cada ficha te lleva al aula virtual o te explica cómo ingresar.',
    keys: 'Diplomados · Cursos virtuales · Aulas Moodle verificadas',
    action: 'Ver el catálogo',
  },
];

@Component({
  selector: 'app-home',
  imports: [RouterLink, FormsModule, DatePipe, LabelPipe, Icon],
  template: `
    <!-- Bienvenida: que es el portal y la accion principal, buscar -->
    <section class="hero" aria-labelledby="hero-title">
      <div class="hero-text">
        <p class="eyebrow">Universidad de Caldas · Facultad de Ciencias para la Salud</p>
        <h1 id="hero-title">Centro Virtual de <em>Salud Pública</em></h1>
        <p class="lead">
          Un solo lugar para encontrar las experiencias, los recursos y la oferta de formación en salud pública de la
          Universidad de Caldas y sus territorios.
        </p>

        <form class="search-hero" role="search" (ngSubmit)="search()">
          <label for="home-q">¿Qué estás buscando?</label>
          <div class="search-hero-box">
            <app-icon name="search" />
            <input id="home-q" name="q" type="search" placeholder="Ej.: vacunación" [(ngModel)]="query" />
            <button type="submit">Buscar</button>
          </div>
        </form>

        <p class="suggestions">
          <span>Prueba con:</span>
          @for (suggestion of suggestions; track suggestion) {
            <a routerLink="/buscar" [queryParams]="{ q: suggestion }">{{ suggestion }}</a>
          }
        </p>
      </div>
      <div class="hero-marks" aria-hidden="true"><span></span><span></span><span></span></div>
    </section>

    <!-- Los tres caminos del portal, en orden -->
    <section class="split" aria-labelledby="paths-title">
      <header class="section-head">
        <p class="eyebrow">Por dónde empezar</p>
        <h2 id="paths-title">Tres caminos para explorar</h2>
        <p>Cada uno reúne un tipo de contenido. Puedes pasar de uno a otro cuando quieras desde el menú.</p>
      </header>

      <div>
        <ol class="index-list">
          @for (path of paths; track path.route; let index = $index) {
            <li>
              <a class="index-row" [routerLink]="path.route">
                <span class="index-num" aria-hidden="true">0{{ index + 1 }}</span>
                <span>
                  <h3><app-icon [name]="path.icon" />{{ path.title }}</h3>
                  <p>{{ path.text }}</p>
                  <p class="index-keys">{{ path.keys }}</p>
                </span>
                <span class="index-go">{{ path.action }}<app-icon name="arrow-right" /></span>
              </a>
            </li>
          }
        </ol>

        <a class="aula" href="https://virtual.ucaldas.edu.co" target="_blank" rel="noopener">
          <app-icon name="monitor-play" />
          <span><strong>¿Ya estás inscrito en un curso?</strong> Entra directo a tu aula en UCaldas Virtual.</span>
          <span>Ir al aula virtual<span class="visually-hidden"> (se abre en otra pestaña)</span><app-icon name="arrow-up-right" /></span>
        </a>
      </div>
    </section>

    @if (recent().length) {
      <section aria-labelledby="recent-title">
        <header class="section-head">
          <p class="eyebrow">Novedades</p>
          <h2 id="recent-title">Publicado recientemente</h2>
        </header>
        <ul class="cards">
          @for (hit of recent(); track hit.type + hit.id) {
            <li class="card">
              <p class="meta">{{ hit.type | label }} · {{ hit.publishedAt | date: 'dd/MM/yyyy' }}</p>
              <h3><a [routerLink]="[route(hit), hit.id]">{{ hit.title }}</a></h3>
              <p>{{ hit.excerpt }}</p>
            </li>
          }
        </ul>
      </section>
    }

    <!-- Compromisos del Centro -->
    <section class="pillars on-dark" aria-labelledby="pillars-title">
      <h2 id="pillars-title">Cómo trabajamos</h2>
      <div>
        <app-icon name="mountain" />
        <h3>Compromiso territorial</h3>
        <p>Articulación permanente con los municipios de Caldas para atender necesidades reales de salud comunitaria.</p>
      </div>
      <div>
        <app-icon name="shield-check" />
        <h3>Rigor académico</h3>
        <p>Contenidos revisados y validados por el equipo docente de la Facultad de Ciencias para la Salud.</p>
      </div>
      <div>
        <app-icon name="book-open-check" />
        <h3>Acceso abierto</h3>
        <p>Apropiación social del conocimiento para transformar la calidad de vida de las poblaciones.</p>
      </div>
    </section>
  `,
})
export class Home {
  private readonly api = inject(Api);
  private readonly router = inject(Router);

  protected readonly paths = PATHS;
  protected readonly suggestions = ['Vacunación', 'Salud mental', 'Riosucio'];

  protected query = '';
  protected readonly recent = signal<SearchHit[]>([]);

  constructor() {
    // Lo ultimo publicado, de cualquier tipo: la busqueda sin texto ordena por fecha de publicacion.
    inject(PendingTasks).run(async () => {
      try {
        this.recent.set((await this.api.search({ pageSize: 3 })).items);
      } catch {
        this.recent.set([]);
      }
    });
  }

  protected route(hit: SearchHit): string {
    return DETAIL_ROUTE[hit.type];
  }

  protected search(): void {
    void this.router.navigate(['/buscar'], { queryParams: { q: this.query.trim() || null } });
  }
}
