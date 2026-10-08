import { afterNextRender, Component, computed, DestroyRef, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Icon } from './icon';
import { PATHS } from './paths';

/** Cada cuanto avanza sola la diapositiva. */
const SLIDE_MS = 7000;

/**
 * Carrusel de bienvenida a todo el ancho: el portal y sus tres caminos, y la accion principal,
 * buscar. Vive fuera de las rutas, asi que no se reinicia al pasar de una pagina publica a otra.
 */
@Component({
  selector: 'app-hero-slider',
  imports: [RouterLink, FormsModule, Icon],
  template: `
    <section class="hero on-dark" aria-roledescription="carrusel" aria-label="Destacados del portal">
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
                @if (main()) {
                  <h1>Centro Virtual de <em>Salud Pública</em></h1>
                } @else {
                  <h2 class="hero-title">Centro Virtual de <em>Salud Pública</em></h2>
                }
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
            <label for="hero-q">¿Qué estás buscando?</label>
            <div class="search-hero-box">
              <app-icon name="search" />
              <input id="hero-q" name="q" type="search" placeholder="Ej.: vacunación" [(ngModel)]="query" />
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
  `,
})
export class HeroSlider {
  private readonly router = inject(Router);

  /** En la portada el titular de la primera diapositiva es el h1 de la pagina; en las demas, no. */
  readonly main = input(false);

  protected readonly paths = PATHS;
  protected readonly slideCount = PATHS.length + 1;
  protected readonly dots = Array.from({ length: this.slideCount }, (_, index) => index);
  protected readonly slide = signal(0);
  protected readonly paused = signal(false);
  /** Avanza solo; el boton de pausa (WCAG 2.2.2) es lo unico que lo detiene. */
  protected readonly playing = computed(() => !this.paused());
  protected readonly suggestions = ['Vacunación', 'Salud mental', 'Riosucio'];
  protected query = '';

  private timer?: ReturnType<typeof setInterval>;

  constructor() {
    // Avanza solo, y solo en el navegador. Con «reducir movimiento» las diapositivas cambian sin deslizarse.
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

  protected search(): void {
    void this.router.navigate(['/buscar'], { queryParams: { q: this.query.trim() || null } });
  }
}
