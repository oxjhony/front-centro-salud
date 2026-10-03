import { DatePipe } from '@angular/common';
import { Component, inject, PendingTasks, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Api } from '../../core/api';
import { SearchHit, SearchableType } from '../../core/models';
import { LabelPipe } from '../../shared/labels';

const DETAIL_ROUTE: Record<SearchableType, string> = { initiatives: '/iniciativas', resources: '/recursos', courses: '/cursos' };

@Component({
  selector: 'app-home',
  imports: [RouterLink, FormsModule, DatePipe, LabelPipe],
  template: `
    <!-- Banner de bienvenida institucional (estilo portada UCaldas Virtual) -->
    <section class="uc-hero-portada">
      <div class="hero-badge">
        <i class="fa-solid fa-graduation-cap" aria-hidden="true"></i>
        <span>Universidad de Caldas · Facultad de Ciencias para la Salud</span>
      </div>
      <h1>Centro Virtual de Salud Pública</h1>
      <p class="hero-lead">
        Un solo lugar para encontrar las experiencias, los recursos y la oferta de formación en salud pública de la
        Universidad de Caldas y sus territorios.
      </p>
      <form class="filters" role="search" (ngSubmit)="search()">
        <div class="field">
          <label for="home-q">¿Qué estás buscando?</label>
          <input id="home-q" name="q" type="search" placeholder="Vacunación, salud mental, Riosucio…" [(ngModel)]="query" />
        </div>
        <button type="submit">Buscar</button>
      </form>
      <div class="hero-actions">
        <a routerLink="/iniciativas" class="button">
          <i class="fa-solid fa-lightbulb" aria-hidden="true"></i> Explorar iniciativas
        </a>
        <a routerLink="/recursos" class="button secondary">
          <i class="fa-solid fa-book-open" aria-hidden="true"></i> Repositorio de recursos
        </a>
        <a routerLink="/cursos" class="button secondary">
          <i class="fa-solid fa-graduation-cap" aria-hidden="true"></i> Catálogo de cursos
        </a>
      </div>
    </section>

    @if (recent().length) {
      <section class="uc-seccion-portales" aria-labelledby="recent-title">
        <div class="seccion-encabezado">
          <span class="seccion-sub">Novedades</span>
          <h2 id="recent-title">Publicado recientemente</h2>
        </div>
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

    <!-- Explorador / Portales principales -->
    <section class="uc-seccion-portales">
      <div class="seccion-encabezado">
        <span class="seccion-sub">Acceso rápido</span>
        <h2>Áreas de Exploración</h2>
      </div>

      <ul class="cards">
        <li class="card portal-card">
          <div class="portal-card-header">
            <div class="portal-icon">
              <i class="fa-solid fa-lightbulb" aria-hidden="true"></i>
            </div>
            <span class="portal-tag">Conocimiento territorial</span>
          </div>
          <h2><a routerLink="/iniciativas">Iniciativas</a></h2>
          <p>Proyectos, programas y experiencias de salud pública, con sus territorios y resultados.</p>
          <ul class="tags">
            <li>Vigilancia epidemiológica</li>
            <li>Promoción y prevención</li>
            <li>Territorios de Caldas</li>
          </ul>
          <div class="portal-footer">
            <a routerLink="/iniciativas" class="link-portal">
              Explorar banco de iniciativas <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
            </a>
          </div>
        </li>

        <li class="card portal-card">
          <div class="portal-card-header">
            <div class="portal-icon">
              <i class="fa-solid fa-book-open" aria-hidden="true"></i>
            </div>
            <span class="portal-tag">Repositorio de conocimiento</span>
          </div>
          <h2><a routerLink="/recursos">Recursos</a></h2>
          <p>Guías, informes y conjuntos de datos revisados por el Centro, con su licencia y su historial de versiones.</p>
          <ul class="tags">
            <li>Guías</li>
            <li>Conjuntos de datos</li>
            <li>Acceso abierto</li>
          </ul>
          <div class="portal-footer">
            <a routerLink="/recursos" class="link-portal">
              Consultar el repositorio <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
            </a>
          </div>
        </li>

        <li class="card portal-card">
          <div class="portal-card-header">
            <div class="portal-icon">
              <i class="fa-solid fa-graduation-cap" aria-hidden="true"></i>
            </div>
            <span class="portal-tag">Formación continua</span>
          </div>
          <h2><a routerLink="/cursos">Cursos</a></h2>
          <p>Cursos, microcursos y diplomados. Cada ficha te lleva al aula virtual o te explica cómo ingresar.</p>
          <ul class="tags">
            <li>Diplomados</li>
            <li>Cursos virtuales</li>
            <li>Aulas Moodle verificadas</li>
          </ul>
          <div class="portal-footer">
            <a routerLink="/cursos" class="link-portal">
              Ver catálogo de formación <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
            </a>
          </div>
        </li>

        <li class="card portal-card moodle-card">
          <div class="portal-card-header">
            <div class="portal-icon">
              <i class="fa-solid fa-laptop-medical" aria-hidden="true"></i>
            </div>
            <span class="portal-tag">Campus tecnológico</span>
          </div>
          <h2><a href="https://virtual.ucaldas.edu.co" target="_blank" rel="noopener">Aula Virtual Moodle</a></h2>
          <p>Espacio virtual de aprendizaje de la Universidad de Caldas para estudiantes, docentes y líderes comunitarios.</p>
          <ul class="tags">
            <li>Talleres y foros</li>
            <li>Recursos multimedia</li>
            <li>Evaluación formativa</li>
          </ul>
          <div class="portal-footer">
            <a href="https://virtual.ucaldas.edu.co" target="_blank" rel="noopener" class="link-portal">
              Ir a UCaldas Virtual <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i>
            </a>
          </div>
        </li>
      </ul>
    </section>

    <!-- Pilares de salud pública institucional -->
    <section class="uc-pilares-salud">
      <div class="pilar-item">
        <div class="pilar-icono"><i class="fa-solid fa-people-roof" aria-hidden="true"></i></div>
        <h3>Compromiso Territorial</h3>
        <p>Articulación permanente con los municipios de Caldas para atender necesidades reales de salud comunitaria.</p>
      </div>
      <div class="pilar-item">
        <div class="pilar-icono"><i class="fa-solid fa-shield-halved" aria-hidden="true"></i></div>
        <h3>Rigor Académico</h3>
        <p>Contenidos revisados y validados por el equipo docente de la Facultad de Ciencias para la Salud.</p>
      </div>
      <div class="pilar-item">
        <div class="pilar-icono"><i class="fa-solid fa-book-medical" aria-hidden="true"></i></div>
        <h3>Acceso Abierto</h3>
        <p>Apropiación social del conocimiento para transformar la calidad de vida de las poblaciones.</p>
      </div>
    </section>
  `,
  styles: `
    .uc-hero-portada {
      background: linear-gradient(135deg, #ffffff 0%, #ecfdf5 100%);
      border: 1px solid var(--uc-borde);
      border-radius: var(--uc-radio-lg);
      padding: 36px 32px;
      margin-bottom: 36px;
      box-shadow: var(--uc-sombra-sm);
      position: relative;
      overflow: hidden;

      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 5px;
        background: linear-gradient(90deg, var(--uc-verde-principal), var(--uc-esmeralda), var(--uc-dorado));
      }

      .hero-badge {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 4px 14px;
        background-color: #ffffff;
        border: 1px solid var(--uc-menta-borde);
        border-radius: var(--uc-radio-pill);
        color: var(--uc-verde-principal);
        font-size: 0.8125rem;
        font-weight: 600;
        margin-bottom: 16px;

        i {
          color: var(--uc-esmeralda);
        }
      }

      h1 {
        margin-bottom: 12px;
      }

      .hero-lead {
        font-size: 1.125rem;
        color: var(--uc-texto-suave);
        max-width: 800px;
        line-height: 1.6;
        margin-bottom: 24px;
      }

      .hero-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
      }
    }

    .seccion-encabezado {
      margin-bottom: 16px;

      .seccion-sub {
        font-size: 0.8125rem;
        font-weight: 700;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: var(--uc-esmeralda);
        display: block;
        margin-bottom: 2px;
      }

      h2 {
        margin: 0;
      }
    }

    .portal-card {
      display: flex;
      flex-direction: column;

      .portal-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;

        .portal-icon {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          background-color: var(--uc-menta-suave);
          color: var(--uc-esmeralda);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
        }

        .portal-tag {
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--uc-texto-suave);
        }
      }

      .portal-footer {
        margin-top: auto;
        padding-top: 18px;
        border-top: 1px solid var(--uc-fondo);

        .link-portal {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-weight: 600;
          font-size: 0.9375rem;
          color: var(--uc-esmeralda);

          i {
            transition: transform 0.15s ease;
          }

          &:hover i {
            transform: translateX(4px);
          }
        }
      }
    }

    .uc-pilares-salud {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin-top: 40px;
      padding: 28px 24px;
      background-color: var(--uc-superficie);
      border: 1px solid var(--uc-borde);
      border-radius: var(--uc-radio-lg);
      box-shadow: var(--uc-sombra-sm);

      .pilar-item {
        .pilar-icono {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          background-color: var(--uc-menta-suave);
          color: var(--uc-verde-principal);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.15rem;
          margin-bottom: 12px;
        }

        h3 {
          font-size: 1.05rem;
          margin-bottom: 6px;
        }

        p {
          font-size: 0.875rem;
          color: var(--uc-texto-suave);
          line-height: 1.5;
          margin: 0;
        }
      }
    }

    @media (max-width: 768px) {
      .uc-hero-portada {
        padding: 24px 20px;
      }

      .uc-pilares-salud {
        grid-template-columns: 1fr;
        gap: 24px;
      }
    }
  `,
})
export class Home {
  private readonly api = inject(Api);
  private readonly router = inject(Router);

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
