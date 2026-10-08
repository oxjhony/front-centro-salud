import { DatePipe } from '@angular/common';
import { Component, inject, PendingTasks, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Api } from '../../core/api';
import { SearchHit, SearchableType } from '../../core/models';
import { Icon } from '../../shared/icon';
import { LabelPipe } from '../../shared/labels';
import { PATHS } from '../../shared/paths';

const DETAIL_ROUTE: Record<SearchableType, string> = { initiatives: '/iniciativas', resources: '/recursos', courses: '/cursos' };

@Component({
  selector: 'app-home',
  imports: [RouterLink, DatePipe, LabelPipe, Icon],
  template: `
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

  protected readonly paths = PATHS;

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
}
