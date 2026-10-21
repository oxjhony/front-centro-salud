import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Api, errorMessage } from '../../core/api';
import { Material, MaterialSearch } from '../../core/models';
import { Icon } from '../../shared/icon';
import { materialIcon } from './material-ui';

interface Filters {
  q: string;
  theme: string | null;
  type: string | null;
  unit: number | null;
}

const EXAMPLES = ['presentaciones de la unidad 2 sobre sistema nervioso', 'huesos', 'electrocardiograma', 'lavado de manos'];

/**
 * Material de los cursos para el estudiante (paso 5 del Documento de Tecnología). Busca por tema,
 * tipo y unidad lo que en Moodle está repartido por secciones con nombres como «Topic 3».
 */
@Component({
  selector: 'app-material-search',
  imports: [FormsModule, Icon],
  template: `
    <section class="ms">
      <header class="head">
        <p class="eyebrow">Estudio</p>
        <h1>Material de tus cursos</h1>
        <p class="lead">
          Busca presentaciones, lecturas y actividades por tema, tipo o unidad. Cada resultado abre el archivo en Moodle.
        </p>
        @if (result(); as r) {
          <p class="course"><app-icon name="graduation-cap" />{{ r.course.name }}</p>
        }
      </header>

      <form class="search" role="search" (ngSubmit)="submit()">
        <label class="visually-hidden" for="material-q">Buscar material</label>
        <app-icon name="search" />
        <input id="material-q" name="q" [(ngModel)]="text" placeholder="Ej.: presentaciones de la unidad 2 sobre sistema nervioso" />
        <button type="submit">Buscar</button>
      </form>
      <p class="examples">
        Prueba con:
        @for (example of examples; track example) {
          <button type="button" class="chip" (click)="text = example; submit()">{{ example }}</button>
        }
      </p>

      @if (error()) {
        <p class="notice error" role="alert">{{ error() }}</p>
      }

      @if (result(); as r) {
        @if (r.available === 0) {
          <!-- Sin material aprobado no hay nada que buscar: se explica por qué y qué falta. -->
          <div class="not-yet">
            <span class="not-yet-icon" aria-hidden="true"><app-icon name="layers" /></span>
            <div>
              <h2>El material de este curso todavía no está organizado</h2>
              <p>
                Aquí verás el material del aula de Moodle agrupado por unidad, tema y tipo, con enlace directo a cada archivo.
                Antes, el gestor académico tiene que hacer dos cosas en la pestaña <strong>Clasificación</strong>:
              </p>
              <ol>
                <li><strong>Clasificar con IA</strong>: la IA propone tema, tipo y unidad para cada elemento del aula.</li>
                <li><strong>Aprobar</strong> la propuesta: lo aprobado aparece aquí, listo para buscar.</li>
              </ol>
            </div>
          </div>
        } @else {
        @if (understood(); as u) {
          <p class="understood" role="status">
            <app-icon name="sparkles" /><span>Entendí:</span>
            @if (u.type) {
              <span class="pill">Tipo: {{ u.type }}</span>
            }
            @if (u.unit) {
              <span class="pill">Unidad {{ u.unit }}</span>
            }
            @if (u.text) {
              <span class="pill text">«{{ u.text }}»</span>
            }
            <span class="found">{{ r.items.length }} {{ r.items.length === 1 ? 'resultado' : 'resultados' }}</span>
          </p>
        }

        <div class="layout">
          <aside class="facets" aria-label="Filtros">
            @if (r.facets.units.length > 0) {
            <fieldset>
              <legend>Unidad</legend>
              @for (f of r.facets.units; track f.value) {
                <button type="button" class="facet" [class.on]="effective().unit === f.value" [attr.aria-pressed]="effective().unit === f.value" (click)="toggle('unit', f.value)">
                  <span class="facet-label"><strong>{{ f.value }}</strong> {{ f.label }}</span><span class="n">{{ f.count }}</span>
                </button>
              }
            </fieldset>
            }
            @if (r.facets.types.length > 0) {
            <fieldset>
              <legend>Tipo</legend>
              @for (f of r.facets.types; track f.value) {
                <button type="button" class="facet" [class.on]="effective().type === f.value" [attr.aria-pressed]="effective().type === f.value" (click)="toggle('type', f.value)">
                  <span class="facet-label">{{ f.label }}</span><span class="n">{{ f.count }}</span>
                </button>
              }
            </fieldset>
            }
            @if (r.facets.themes.length > 0) {
            <fieldset>
              <legend>Tema</legend>
              @for (f of r.facets.themes; track f.value) {
                <button type="button" class="facet" [class.on]="filters().theme === f.value" [attr.aria-pressed]="filters().theme === f.value" (click)="toggle('theme', f.value)">
                  <span class="facet-label">{{ f.label }}</span><span class="n">{{ f.count }}</span>
                </button>
              }
            </fieldset>
            }
          </aside>

          <div class="results" aria-live="polite">
            @if (r.items.length === 0) {
              <div class="empty">
                <p><strong>No encontré material con esa búsqueda.</strong></p>
                <p>Prueba con otras palabras o quita algún filtro.</p>
              </div>
            }
            @for (unit of grouped(); track unit.label) {
              <section class="unit">
                <h2>{{ unit.label }}</h2>
                <ul class="cards-list">
                  @for (m of unit.items; track m.id; let i = $index) {
                    <li class="item" [style.--i]="i">
                      <span class="icon-box" aria-hidden="true"><app-icon [name]="icon(m)" /></span>
                      <div class="body">
                        <p class="title">{{ m.name }}</p>
                        <p class="chips">
                          <span class="type">{{ m.materialType }}</span>
                          @if (m.theme) {
                            <span class="theme"><app-icon name="tag" />{{ m.theme.name }}</span>
                          }
                        </p>
                        <p class="was">Antes en Moodle: sección «{{ m.sectionName }}»</p>
                      </div>
                      <a class="open" [href]="m.url" target="_blank" rel="noopener">
                        Abrir en Moodle<span class="visually-hidden"> (se abre en otra pestaña)</span><app-icon name="arrow-up-right" />
                      </a>
                    </li>
                  }
                </ul>
              </section>
            }
          </div>
        </div>
        }
      } @else if (!error()) {
        <p class="loading" role="status">Cargando el material…</p>
      }
    </section>
  `,
  styles: `
    :host {
      display: block;
    }

    .head {
      margin-bottom: 20px;

      h1 {
        margin: 0 0 8px;
      }

      .lead {
        margin: 0;
      }
    }

    .course {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin: 14px 0 0;
      padding: 6px 14px;
      border-radius: var(--uc-radio-pill);
      background-color: var(--uc-menta-suave);
      color: var(--uc-verde-principal);
      font-weight: 700;
    }

    .search {
      display: flex;
      align-items: center;
      gap: 10px;
      max-width: 760px;
      padding: 6px 6px 6px 18px;
      border: 1.5px solid var(--uc-borde-firme);
      border-radius: var(--uc-radio-pill);
      background-color: var(--uc-superficie);

      &:focus-within {
        border-color: var(--uc-esmeralda);
        box-shadow: 0 0 0 3px var(--uc-menta-tint);
      }

      > .icon {
        flex: none;
        color: var(--uc-texto-suave);
      }

      input {
        flex: 1 1 auto;
        min-width: 0;
        border: 0;
        background: transparent;
        box-shadow: none;
        outline: none;
      }
    }

    .examples {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      margin: 12px 0 20px;
      font-size: 0.9rem;
      color: var(--uc-texto-suave);
    }

    .chip {
      --btn-fondo: var(--uc-superficie);
      --btn-texto: var(--uc-verde-principal);
      --btn-borde: var(--uc-menta-borde);
      min-height: 36px;
      padding: 4px 14px;
      font-size: 0.85rem;
      font-weight: 600;
    }

    .understood {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      margin: 0 0 18px;
      padding: 10px 16px;
      border-radius: var(--uc-radio);
      background-color: var(--uc-dorado-suave);
      color: var(--uc-texto);
      font-weight: 600;

      > .icon {
        color: var(--uc-dorado-firme);
      }
    }

    .pill {
      padding: 2px 12px;
      border-radius: var(--uc-radio-pill);
      background-color: var(--uc-verde-principal);
      color: #ffffff;
      font-size: 0.85rem;

      &.text {
        background-color: var(--uc-superficie);
        color: var(--uc-verde-principal);
        box-shadow: inset 0 0 0 1px var(--uc-menta-borde);
      }
    }

    .found {
      margin-left: auto;
      font-size: 0.85rem;
      color: var(--uc-texto-suave);
    }

    .not-yet {
      display: flex;
      gap: 20px;
      padding: 28px;
      border: 1.5px dashed var(--uc-menta-borde);
      border-radius: var(--uc-radio-lg);
      background-color: var(--uc-superficie-alt);

      h2 {
        margin: 0 0 8px;
        font-size: 1.3rem;
      }

      p {
        margin: 0 0 10px;
        max-width: 70ch;
      }

      ol {
        margin: 0;
        padding-left: 20px;

        li + li {
          margin-top: 4px;
        }
      }
    }

    .not-yet-icon {
      flex: none;
      display: grid;
      place-items: center;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background-color: var(--uc-menta-tint);
      color: var(--uc-esmeralda);

      .icon {
        width: 28px;
        height: 28px;
      }
    }

    .layout {
      display: grid;
      grid-template-columns: 260px minmax(0, 1fr);
      gap: 24px;
      align-items: start;
    }

    .facets {
      position: sticky;
      top: calc(var(--uc-alto-cabecera) + 16px);
      display: grid;
      gap: 16px;

      fieldset {
        display: grid;
        gap: 4px;
        margin: 0;
        padding: 0;
        border: 0;
      }

      legend {
        margin-bottom: 4px;
        font-size: 0.75rem;
        font-weight: 800;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--uc-texto-suave);
      }
    }

    .facet {
      --btn-fondo: transparent;
      --btn-texto: var(--uc-texto);
      --btn-borde: transparent;
      justify-content: space-between;
      gap: 8px;
      width: 100%;
      min-height: 38px;
      padding: 6px 10px;
      border-radius: var(--uc-radio-sm);
      font-size: 0.875rem;
      font-weight: 500;
      text-align: left;
      box-shadow: none;

      &:hover {
        --btn-fondo: var(--uc-menta-suave);
        --btn-texto: var(--uc-verde-principal);
        --btn-borde: transparent;
      }

      .n {
        flex: none;
        min-width: 26px;
        padding: 0 6px;
        border-radius: var(--uc-radio-pill);
        background-color: var(--uc-superficie-alt);
        font-size: 0.75rem;
        font-weight: 700;
        text-align: center;
      }

      &.on {
        --btn-fondo: var(--uc-verde-principal);
        --btn-texto: #ffffff;
        --btn-borde: var(--uc-verde-principal);

        .n {
          background-color: var(--uc-dorado-vivo);
          color: var(--uc-verde-oscuro);
        }
      }
    }

    .unit {
      margin-bottom: 24px;

      h2 {
        margin: 0 0 10px;
        font-size: 1.15rem;
        color: var(--uc-verde-principal);
      }
    }

    .cards-list {
      display: grid;
      gap: 10px;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .item {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px 16px;
      border: 1.5px solid var(--uc-borde);
      border-radius: var(--uc-radio-lg);
      background-color: var(--uc-superficie);
      transition:
        border-color var(--uc-mov-medio) var(--uc-curva),
        transform var(--uc-mov-medio) var(--uc-curva);

      &:hover {
        border-color: var(--uc-esmeralda);
        transform: translateY(-2px);
      }

      p {
        margin: 0;
      }
    }

    .icon-box {
      flex: none;
      display: grid;
      place-items: center;
      width: 46px;
      height: 46px;
      border-radius: var(--uc-radio);
      background-color: var(--uc-menta-suave);
      color: var(--uc-esmeralda);
    }

    .body {
      flex: 1 1 auto;
      min-width: 0;
    }

    .title {
      font-weight: 800;
      color: var(--uc-texto);
    }

    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin: 4px 0 !important;

      span {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 1px 10px;
        border-radius: var(--uc-radio-pill);
        font-size: 0.78rem;
        font-weight: 700;
      }

      .type {
        background-color: var(--uc-dorado-suave);
        color: var(--uc-dorado-texto);
      }

      .theme {
        background-color: var(--uc-menta-suave);
        color: var(--uc-verde-principal);
      }
    }

    .was {
      font-size: 0.8rem;
      color: var(--uc-texto-suave);
    }

    .open {
      flex: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      min-height: 40px;
      padding: 6px 14px;
      border: 1.5px solid var(--uc-esmeralda);
      border-radius: var(--uc-radio-pill);
      color: var(--uc-esmeralda);
      font-size: 0.875rem;
      font-weight: 700;
      text-decoration: none;
      white-space: nowrap;

      &:hover {
        background-color: var(--uc-esmeralda);
        color: #ffffff;
      }
    }

    @media (max-width: 1023.98px) {
      .layout {
        grid-template-columns: 1fr;
      }

      .facets {
        position: static;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      }
    }

    @media (max-width: 599.98px) {
      .item {
        flex-wrap: wrap;
      }

      .open {
        width: 100%;
        justify-content: center;
      }
    }

    @media (prefers-reduced-motion: no-preference) {
      .item {
        animation: rise var(--uc-mov-lento) var(--uc-curva) both;
        animation-delay: calc(var(--i, 0) * 50ms);
      }

      .understood {
        animation: rise var(--uc-mov-medio) var(--uc-curva) both;
      }
    }

    @keyframes rise {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: none; }
    }
  `,
})
export class MaterialSearchPage implements OnInit {
  private readonly api = inject(Api);

  protected readonly examples = EXAMPLES;
  protected text = '';
  protected readonly filters = signal<Filters>({ q: '', theme: null, type: null, unit: null });
  protected readonly result = signal<MaterialSearch | null>(null);
  protected readonly error = signal('');

  /** Tipo y unidad que se aplican, vengan de los filtros o de lo que se entendió en el texto. */
  protected readonly effective = computed(() => {
    const r = this.result();
    return { type: r?.interpretation.type ?? null, unit: r?.interpretation.unit ?? null };
  });

  protected readonly understood = computed(() => {
    const r = this.result();
    if (!r || !this.filters().q) return null;
    return r.interpretation;
  });

  protected readonly grouped = computed(() => {
    const units = new Map<string, Material[]>();
    for (const m of this.result()?.items ?? []) {
      const label = m.unit ? `Unidad ${m.unit.number} · ${m.unit.name}` : 'Sin unidad';
      units.set(label, [...(units.get(label) ?? []), m]);
    }
    return [...units].map(([label, items]) => ({ label, items }));
  });

  ngOnInit(): void {
    void this.load();
  }

  protected icon(m: Material): string {
    return materialIcon(m);
  }

  protected submit(): void {
    this.filters.set({ q: this.text.trim(), theme: null, type: null, unit: null });
    void this.load();
  }

  /**
   * Al tocar un filtro, lo entendido en el texto pasa a ser filtro explícito: así se puede quitar.
   * El cuadro de búsqueda queda solo con las palabras del tema.
   */
  protected toggle(facet: 'theme' | 'type' | 'unit', value: string | number): void {
    const r = this.result();
    const current = this.filters();
    const next: Filters = {
      q: r?.interpretation.text ?? current.q,
      theme: current.theme,
      type: r?.interpretation.type ?? null,
      unit: r?.interpretation.unit ?? null,
    };
    if (facet === 'theme') next.theme = current.theme === value ? null : (value as string);
    if (facet === 'type') next.type = next.type === value ? null : (value as string);
    if (facet === 'unit') next.unit = next.unit === value ? null : (value as number);
    this.text = next.q;
    this.filters.set(next);
    void this.load();
  }

  private async load(): Promise<void> {
    const f = this.filters();
    this.error.set('');
    try {
      this.result.set(await this.api.searchMaterials({ q: f.q, theme: f.theme, type: f.type, unit: f.unit }));
    } catch (error) {
      this.error.set(errorMessage(error));
    }
  }
}
