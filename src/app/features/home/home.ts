import { DatePipe } from '@angular/common';
import { afterNextRender, Component, computed, DestroyRef, inject, PendingTasks, signal } from '@angular/core';
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

/** Cada cuanto avanza sola la portada. */
const SLIDE_MS = 7000;

@Component({
  selector: 'app-home',
  imports: [RouterLink, FormsModule, DatePipe, LabelPipe, Icon],
  template: `
    <!-- Bienvenida a todo el ancho: un carrusel con el portal y sus tres caminos, y la accion principal, buscar -->
    <section
      class="hero on-dark"
      aria-roledescription="carrusel"
      aria-label="Destacados del portal"
    >
      <div class="hero-marks" aria-hidden="true"><span></span><span></span><span></span></div>

      <div class="hero-viewport" [attr.aria-live]="playing() ? 'off' : 'polite'">
        <div class="hero-track" [style.transform]="'translateX(-' + slide() * 100 + '%)'">
          <div
            class="hero-slide"
            role="group"
            aria-roledescription="diapositiva"
            [attr.aria-label]="'1 de ' + slideCount"
            [class.active]="slide() === 0"
            [attr.inert]="slide() === 0 ? null : ''"
          >
            <div class="wrap">
              <div class="hero-text">
                <p class="eyebrow">Universidad de Caldas · Facultad de Ciencias para la Salud</p>
                <h1>Centro Virtual de <em>Salud Pública</em></h1>
                <p class="lead">
                  Un solo lugar para encontrar las experiencias, los recursos y la oferta de formación en salud pública de
                  la Universidad de Caldas y sus territorios.
                </p>
                <a class="hero-cta" routerLink="/quienes-somos">Conoce quiénes somos<app-icon name="arrow-right" /></a>
              </div>
            </div>
          </div>

          @for (path of paths; track path.route; let index = $index) {
            <div
              class="hero-slide"
              role="group"
              aria-roledescription="diapositiva"
              [attr.aria-label]="index + 2 + ' de ' + slideCount"
              [class.active]="slide() === index + 1"
              [attr.inert]="slide() === index + 1 ? null : ''"
            >
              <div class="wrap">
                <div class="hero-text">
                  <p class="eyebrow">{{ path.keys }}</p>
                  <h2 class="hero-title"><em>{{ path.title }}</em></h2>
                  <p class="lead">{{ path.text }}</p>
                  <a class="hero-cta" [routerLink]="path.route">{{ path.action }}<app-icon name="arrow-right" /></a>
                </div>
              </div>
            </div>
          }
        </div>
      </div>

      <div class="wrap hero-foot">
        <div>
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

        <div class="hero-controls">
          <button type="button" aria-label="Diapositiva anterior" (click)="go(slide() - 1)"><app-icon name="chevron-left" /></button>
          <ol class="hero-dots">
            @for (dot of dots; track dot) {
              <li>
                <button
                  type="button"
                  [attr.aria-label]="'Ir a la diapositiva ' + (dot + 1)"
                  [attr.aria-current]="slide() === dot ? 'true' : null"
                  (click)="go(dot)"
                ></button>
              </li>
            }
          </ol>
          <button type="button" aria-label="Diapositiva siguiente" (click)="go(slide() + 1)"><app-icon name="chevron-right" /></button>
          <button
            type="button"
            [attr.aria-label]="paused() ? 'Reanudar el carrusel' : 'Pausar el carrusel'"
            (click)="paused.set(!paused())"
          >
            <app-icon [name]="paused() ? 'play' : 'pause'" />
          </button>
        </div>
      </div>
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
    <section class="pillars" aria-labelledby="pillars-title">
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

  /** Carrusel de la portada: la bienvenida y los tres caminos. */
  protected readonly slideCount = PATHS.length + 1;
  protected readonly dots = Array.from({ length: this.slideCount }, (_, index) => index);
  protected readonly slide = signal(0);
  protected readonly paused = signal(false);
  /** Avanza solo; el boton de pausa (WCAG 2.2.2) es lo unico que lo detiene. */
  protected readonly playing = computed(() => !this.paused());
  private timer?: ReturnType<typeof setInterval>;
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

    // El carrusel avanza solo, y solo en el navegador. Con «reducir movimiento» las diapositivas cambian sin deslizarse.
    afterNextRender(() => this.restart());
    inject(DestroyRef).onDestroy(() => clearInterval(this.timer));
  }

  /** Va a una diapositiva (con vuelta al principio y al final) y reinicia la espera. */
  protected go(index: number): void {
    this.slide.set((index + this.slideCount) % this.slideCount);
    this.restart();
  }

  private restart(): void {
    clearInterval(this.timer);
    this.timer = setInterval(() => {
      if (this.playing()) this.slide.update((current) => (current + 1) % this.slideCount);
    }, SLIDE_MS);
  }

  protected route(hit: SearchHit): string {
    return DETAIL_ROUTE[hit.type];
  }

  protected search(): void {
    void this.router.navigate(['/buscar'], { queryParams: { q: this.query.trim() || null } });
  }
}
