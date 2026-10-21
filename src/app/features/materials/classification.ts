import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Api, errorMessage } from '../../core/api';
import { Material, MaterialOrigin, MaterialsOverview } from '../../core/models';
import { Icon } from '../../shared/icon';
import { confidenceLevel, materialIcon, moodleKind, ORIGIN_ICON, ORIGIN_LABEL } from './material-ui';

type Filter = 'PROPOSED' | 'APPROVED' | 'REJECTED' | 'ALL';
type Busy = '' | 'import' | 'classify' | 'approve' | 'reset' | 'review';

interface Step {
  n: number;
  label: string;
  detail: string;
  state: 'done' | 'current' | 'todo';
}

/**
 * Clasificación del material de Moodle (Documento de Tecnología, semana 9, sección 2.1): leer el
 * aula, aplicar reglas, pedir la propuesta a la IA, revisarla y dejarla buscable.
 */
@Component({
  selector: 'app-classification',
  imports: [FormsModule, RouterLink, Icon],
  template: `
    <section class="cls">
      <header class="head">
        <p class="eyebrow">Clasificación del material · Moodle</p>
        <h1>{{ data()?.course?.name ?? 'Fundamentos de Ingeniería Biomédica' }}</h1>
        <p class="lead">
          Así llega el aula desde Moodle y así la organiza la plataforma: reglas para lo evidente, IA para el resto y una
          persona que aprueba cada propuesta.
        </p>
        <p class="todo-note">Pendiente: leer el aula desde el Moodle institucional (hoy es una copia del curso 6975)</p>
        <p class="todo-note">Pendiente: extraer el texto de los archivos (hoy la IA clasifica por nombre, sección y formato)</p>
      </header>

      <!-- Los cinco pasos del Documento de Tecnología, con el que está en curso resaltado. -->
      <ol class="steps" aria-label="Pasos de la clasificación">
        @for (step of steps(); track step.n) {
          <li [attr.data-state]="step.state" [attr.aria-current]="step.state === 'current' ? 'step' : null">
            <span class="dot">
              @if (step.state === 'done') {
                <app-icon name="check" />
              } @else {
                {{ step.n }}
              }
            </span>
            <span class="step-text">
              <strong>{{ step.label }}</strong>
              <small>{{ step.detail }}</small>
            </span>
          </li>
        }
      </ol>

      @if (error()) {
        <p class="notice error" role="alert">{{ error() }}</p>
      }
      @if (message()) {
        <p class="notice ok" role="status">{{ message() }}</p>
      }

      @if (data(); as d) {
        <dl class="stats">
          <div><dt>Elementos en el aula</dt><dd>{{ d.stats.total }}</dd></div>
          <div><dt>Secciones en Moodle</dt><dd>{{ d.sections }}</dd></div>
          <div><dt>Con tema asignado</dt><dd>{{ withTheme() }}</dd></div>
          <div><dt>Por revisar</dt><dd>{{ d.stats.proposed }}</dd></div>
          <div><dt>Aprobados</dt><dd>{{ d.stats.approved }}</dd></div>
          <div class="accent">
            <dt>La IA acertó</dt>
            <dd>
              @if (d.stats.reviewed > 0) {
                {{ d.stats.unchanged }}<small> de {{ d.stats.reviewed }}</small>
              } @else {
                —
              }
            </dd>
          </div>
        </dl>

        <div class="actions-bar">
          @if (d.stats.total === 0) {
            <button type="button" (click)="run('import')" [disabled]="!!busy()">
              <app-icon name="download" />Leer el aula de Moodle
            </button>
          }
          @if (d.stats.pending > 0) {
            <button type="button" class="ai" (click)="run('classify')" [disabled]="!!busy()">
              <app-icon name="sparkles" />{{ busy() === 'classify' ? 'Clasificando…' : 'Clasificar con IA' }}
            </button>
          }
          @if (d.stats.confident > 0) {
            <button type="button" (click)="run('approve')" [disabled]="!!busy()">
              <app-icon name="check" />Aceptar las de confianza alta ({{ d.stats.confident }})
            </button>
          }
          @if (d.stats.approved > 0) {
            <a class="button secondary" routerLink="/material"><app-icon name="folder-search" />Ver como estudiante</a>
          }
          @if (d.stats.total > 0) {
            <button type="button" class="secondary ghost" (click)="run('reset')" [disabled]="!!busy()">
              <app-icon name="rotate-ccw" />Reiniciar demostración
            </button>
          }
        </div>

        @if (busy() === 'classify') {
          <div class="working" role="status">
            <svg class="pulse" viewBox="0 0 120 24" aria-hidden="true"><path d="M0 12h34l6-9 8 18 7-15 5 6h60" /></svg>
            <p>
              <strong>La IA está leyendo los {{ d.stats.pending }} elementos del aula.</strong>
              Elige tema, tipo y unidad de listas cerradas; tarda cerca de medio minuto.
            </p>
          </div>
        }

        @if (d.stats.total > 0) {
          <div class="view-tabs" role="tablist" aria-label="Vista">
            <button type="button" role="tab" [attr.aria-selected]="view() === 'review'" (click)="view.set('review')">
              <app-icon name="list-checks" />Revisión
            </button>
            <button type="button" role="tab" [attr.aria-selected]="view() === 'compare'" (click)="view.set('compare')">
              <app-icon name="layers" />Antes y después
            </button>
          </div>
        }

        @if (view() === 'review' && d.stats.total > 0) {
          <div class="filters-row" role="group" aria-label="Filtrar por estado">
            @for (option of filters(); track option.value) {
              <button
                type="button"
                class="chip"
                [class.on]="filter() === option.value"
                [attr.aria-pressed]="filter() === option.value"
                (click)="filter.set(option.value)"
              >
                {{ option.label }} <span class="count">{{ option.count }}</span>
              </button>
            }
            <span class="legend" aria-label="Quién propuso cada dato">
              <span><app-icon name="ruler" />Regla</span>
              <span><app-icon name="sparkles" />IA</span>
              <span><app-icon name="user-check" />Persona</span>
            </span>
          </div>

          @if (sections().length === 0) {
            <div class="empty">
              <p><strong>Nada en este filtro.</strong></p>
              <p>Cambia el filtro para ver el resto del material.</p>
            </div>
          }

          @for (section of sections(); track section.number) {
            <section class="moodle-section">
              <h2>
                <span class="sec-n">Sección {{ section.number }}</span>
                «{{ section.name }}»
              </h2>
              <ul class="rows">
                @for (m of section.items; track m.id; let i = $index) {
                  <li class="row" [attr.data-status]="m.status" [class.scanning]="busy() === 'classify' && m.status === 'PENDING'" [style.--i]="i">
                    <div class="before">
                      <span class="kind" aria-hidden="true"><app-icon [name]="moodleIcon(m)" /></span>
                      <div>
                        <p class="name">{{ m.name }}</p>
                        <p class="meta">{{ kind(m) }}</p>
                      </div>
                    </div>

                    <app-icon class="arrow" name="arrow-right" />

                    <div class="after">
                      @if (m.status === 'PENDING') {
                        <p class="meta">Sin clasificar: en Moodle solo tiene nombre y sección.</p>
                      } @else {
                        <div class="facets">
                          <span class="facet">
                            <small>Tema</small>{{ m.theme?.name ?? 'General del curso' }}
                            @if (m.origins.theme; as o) {
                              <span class="origin" [attr.data-origin]="o" [title]="'Lo propuso: ' + originLabel(o)">
                                <app-icon [name]="originIcon(o)" /><span class="visually-hidden">({{ originLabel(o) }})</span>
                              </span>
                            }
                          </span>
                          <span class="facet">
                            <small>Tipo</small>{{ m.materialType ?? '—' }}
                            @if (m.origins.type; as o) {
                              <span class="origin" [attr.data-origin]="o" [title]="'Lo propuso: ' + originLabel(o)">
                                <app-icon [name]="originIcon(o)" /><span class="visually-hidden">({{ originLabel(o) }})</span>
                              </span>
                            }
                          </span>
                          <span class="facet">
                            <small>Unidad</small>{{ m.unit ? m.unit.number + ' · ' + m.unit.name : '—' }}
                            @if (m.origins.unit; as o) {
                              <span class="origin" [attr.data-origin]="o" [title]="'Lo propuso: ' + originLabel(o)">
                                <app-icon [name]="originIcon(o)" /><span class="visually-hidden">({{ originLabel(o) }})</span>
                              </span>
                            }
                          </span>
                        </div>
                        @if (m.keywords.length > 0) {
                          <ul class="keywords" aria-label="Palabras clave">
                            @for (k of m.keywords; track k) {
                              <li>{{ k }}</li>
                            }
                          </ul>
                        }
                        @if (m.status === 'PROPOSED') {
                          <div class="confidence" [attr.data-level]="level(m.confidence)">
                            <span class="bar" aria-hidden="true"><span [style.width.%]="(m.confidence ?? 0) * 100"></span></span>
                            Confianza {{ level(m.confidence) }} ({{ percent(m.confidence) }})
                          </div>
                        }
                        @if (m.rationale) {
                          <p class="reason">{{ m.rationale }}</p>
                        }
                      }
                    </div>

                    <div class="decide">
                      @switch (m.status) {
                        @case ('PROPOSED') {
                          <button type="button" class="ok" (click)="decide(m, 'approve')" [disabled]="!!busy()">
                            <app-icon name="check" />Aceptar
                          </button>
                          <button type="button" class="secondary" (click)="edit(m)" [disabled]="!!busy()">
                            <app-icon name="pencil" />Corregir
                          </button>
                          <button type="button" class="secondary ghost" (click)="decide(m, 'reject')" [disabled]="!!busy()">
                            <app-icon name="x" />Rechazar
                          </button>
                        }
                        @case ('APPROVED') {
                          <span class="badge approved"><app-icon name="check" />Aprobado</span>
                        }
                        @case ('REJECTED') {
                          <span class="badge rejected"><app-icon name="x" />Rechazado</span>
                        }
                      }
                    </div>

                    @if (editing() === m.id) {
                      <form class="editor" (ngSubmit)="saveEdit(m)">
                        <label>
                          <span>Tema</span>
                          <select name="theme" [(ngModel)]="draft.themeId">
                            <option [ngValue]="null">General del curso</option>
                            @for (group of themeGroups(); track group.label) {
                              <optgroup [label]="group.label">
                                @for (t of group.options; track t.id) {
                                  <option [ngValue]="t.id">{{ t.name }}</option>
                                }
                              </optgroup>
                            }
                          </select>
                        </label>
                        <label>
                          <span>Tipo de material</span>
                          <select name="type" [(ngModel)]="draft.materialType">
                            @for (t of d.vocabulary.types; track t) {
                              <option [ngValue]="t">{{ t }}</option>
                            }
                          </select>
                        </label>
                        <label>
                          <span>Unidad</span>
                          <select name="unit" [(ngModel)]="draft.unitNumber">
                            <option [ngValue]="null">Sin unidad</option>
                            @for (u of d.units; track u.number) {
                              <option [ngValue]="u.number">{{ u.number }} · {{ u.name }}</option>
                            }
                          </select>
                        </label>
                        <label class="wide">
                          <span>Palabras clave, separadas por comas</span>
                          <input type="text" name="keywords" [(ngModel)]="draft.keywords" />
                        </label>
                        <div class="editor-actions">
                          <button type="submit" [disabled]="!!busy()"><app-icon name="check" />Guardar y aprobar</button>
                          <button type="button" class="secondary" (click)="editing.set(null)">Cancelar</button>
                        </div>
                      </form>
                    }
                  </li>
                }
              </ul>
            </section>
          }
        }

        @if (view() === 'compare' && d.stats.total > 0) {
          <div class="compare">
            <section class="col before-col">
              <h2><app-icon name="layers" />Así está en Moodle</h2>
              <p class="meta">{{ d.sections }} secciones, en el orden y con los nombres del aula.</p>
              @for (section of moodleOrder(); track section.number) {
                <div class="tree">
                  <p class="tree-head">{{ section.name }}</p>
                  <ul>
                    @for (m of section.items; track m.id) {
                      <li><app-icon [name]="moodleIcon(m)" />{{ m.name }}</li>
                    }
                  </ul>
                </div>
              }
            </section>
            <section class="col after-col">
              <h2><app-icon name="sparkles" />Así queda organizado</h2>
              <p class="meta">Por unidad y por tema, con el tipo de cada material. No cambia nada en Moodle.</p>
              @if (organized().length === 0) {
                <div class="empty"><p>Clasifica el aula para ver cómo queda.</p></div>
              }
              @for (unit of organized(); track unit.key) {
                <div class="tree unit">
                  <p class="tree-head">{{ unit.label }}</p>
                  @for (theme of unit.themes; track theme.name) {
                    <p class="theme-head"><app-icon name="tag" />{{ theme.name }}</p>
                    <ul>
                      @for (m of theme.items; track m.id) {
                        <li [attr.data-status]="m.status">
                          <app-icon [name]="moodleIcon(m)" />{{ m.name }}
                          <span class="type">{{ m.materialType }}</span>
                        </li>
                      }
                    </ul>
                  }
                </div>
              }
            </section>
          </div>
        }
      } @else if (!error()) {
        <p class="loading" role="status">Cargando el aula…</p>
      }
    </section>
  `,
  styles: `
    :host {
      display: block;
    }

    .head {
      margin-bottom: 24px;

      h1 {
        margin: 0 0 8px;
      }

      .lead {
        margin: 0;
      }
    }

    .todo-note {
      margin: 4px 0 0;
      color: #dc2626;
      font-size: 0.7rem;
      font-weight: 700;
    }

    /* ------------------------------------------------------------------ Pasos */
    .steps {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 8px;
      margin: 0 0 24px;
      padding: 0;
      list-style: none;
      counter-reset: step;

      li {
        position: relative;
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 14px;
        border: 1.5px solid var(--uc-borde);
        border-radius: var(--uc-radio);
        background-color: var(--uc-superficie);
        color: var(--uc-texto-suave);
      }

      li[data-state='done'] {
        border-color: var(--uc-menta-borde);
        background-color: var(--uc-menta-suave);
        color: var(--uc-verde-principal);

        .dot {
          background-color: var(--uc-esmeralda);
          color: #ffffff;
        }
      }

      li[data-state='current'] {
        border-color: var(--uc-dorado-firme);
        background-color: var(--uc-dorado-suave);
        color: var(--uc-texto);

        .dot {
          background-color: var(--uc-dorado-vivo);
          color: var(--uc-verde-oscuro);
        }
      }
    }

    .dot {
      flex: none;
      display: grid;
      place-items: center;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      background-color: var(--uc-superficie-alt);
      font-weight: 800;

      .icon {
        width: 16px;
        height: 16px;
        stroke-width: 3;
      }
    }

    .step-text {
      display: grid;
      line-height: 1.2;

      strong {
        font-size: 0.9rem;
      }

      small {
        font-size: 0.75rem;
      }
    }

    /* -------------------------------------------------------------- Indicadores */
    .stats {
      display: grid;
      grid-template-columns: repeat(6, minmax(0, 1fr));
      gap: 10px;
      margin: 0 0 20px;

      div {
        padding: 14px 16px;
        border-radius: var(--uc-radio);
        background-color: var(--uc-superficie-alt);
      }

      dt {
        font-size: 0.78rem;
        font-weight: 600;
        color: var(--uc-texto-suave);
      }

      dd {
        margin: 2px 0 0;
        font-family: var(--uc-fuente-titulos);
        font-size: 1.75rem;
        font-weight: 800;
        color: var(--uc-verde-principal);

        small {
          font-size: 0.9rem;
          font-weight: 600;
        }
      }

      .accent {
        background-color: var(--uc-verde-principal);

        dt {
          color: var(--uc-menta-tint);
        }

        dd {
          color: var(--uc-dorado-vivo);
        }
      }
    }

    .actions-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 20px;

      button,
      .button {
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }

      .ai {
        --btn-fondo: var(--uc-verde-principal);
        --btn-borde: var(--uc-verde-principal);
        box-shadow: inset 0 -3px 0 var(--uc-dorado-vivo);

        .icon {
          color: var(--uc-dorado-vivo);
        }
      }

      .ghost {
        margin-left: auto;
      }
    }

    .working {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 20px;
      padding: 16px 20px;
      border: 1.5px solid var(--uc-dorado-firme);
      border-radius: var(--uc-radio);
      background-color: var(--uc-dorado-suave);

      p {
        margin: 0;
      }
    }

    .pulse {
      flex: none;
      width: 96px;
      height: 22px;

      path {
        fill: none;
        stroke: var(--uc-esmeralda);
        stroke-width: 2;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
    }

    /* ------------------------------------------------------------------ Vistas */
    .view-tabs {
      display: flex;
      gap: 4px;
      margin-bottom: 16px;
      border-bottom: 1px solid var(--uc-borde);

      button {
        --btn-fondo: transparent;
        --btn-texto: var(--uc-texto-suave);
        --btn-borde: transparent;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        margin-bottom: -1px;
        border-radius: var(--uc-radio) var(--uc-radio) 0 0;
        box-shadow: none;

        &:hover {
          --btn-fondo: var(--uc-menta-suave);
          --btn-texto: var(--uc-verde-principal);
          --btn-borde: transparent;
        }

        &[aria-selected='true'] {
          --btn-fondo: var(--uc-superficie);
          --btn-texto: var(--uc-verde-principal);
          --btn-borde: var(--uc-borde);
          border-bottom-color: var(--uc-superficie);
          box-shadow: inset 0 3px 0 var(--uc-dorado-firme);
        }
      }
    }

    .filters-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
    }

    .chip {
      --btn-fondo: var(--uc-superficie);
      --btn-texto: var(--uc-texto);
      --btn-borde: var(--uc-borde-firme);
      min-height: 40px;
      padding: 6px 16px;
      font-weight: 600;

      .count {
        margin-left: 4px;
        padding: 1px 8px;
        border-radius: var(--uc-radio-pill);
        background-color: var(--uc-superficie-alt);
        font-size: 0.8rem;
      }

      &.on {
        --btn-fondo: var(--uc-verde-principal);
        --btn-texto: #ffffff;
        --btn-borde: var(--uc-verde-principal);

        .count {
          background-color: var(--uc-dorado-vivo);
          color: var(--uc-verde-oscuro);
        }
      }
    }

    .legend {
      display: inline-flex;
      gap: 14px;
      margin-left: auto;
      font-size: 0.8rem;
      color: var(--uc-texto-suave);

      span {
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
    }

    /* ------------------------------------------------------------------- Filas */
    .moodle-section {
      margin-bottom: 24px;

      h2 {
        display: flex;
        align-items: baseline;
        gap: 10px;
        margin: 0 0 10px;
        font-size: 1.05rem;
        color: var(--uc-texto);
      }
    }

    .sec-n {
      padding: 2px 10px;
      border-radius: var(--uc-radio-pill);
      background-color: var(--uc-superficie-alt);
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--uc-texto-suave);
    }

    .rows {
      display: grid;
      gap: 10px;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .row {
      position: relative;
      display: grid;
      grid-template-columns: minmax(0, 0.9fr) auto minmax(0, 1.5fr) auto;
      align-items: start;
      gap: 14px;
      padding: 16px;
      overflow: hidden;
      border: 1.5px solid var(--uc-borde);
      border-radius: var(--uc-radio-lg);
      background-color: var(--uc-superficie);
      transition: border-color var(--uc-mov-medio) var(--uc-curva);

      &[data-status='APPROVED'] {
        border-color: var(--uc-exito-borde);
        background-color: color-mix(in srgb, var(--uc-exito-suave) 60%, var(--uc-superficie));
      }

      &[data-status='REJECTED'] {
        opacity: 0.7;
      }
    }

    .before {
      display: flex;
      gap: 12px;

      p {
        margin: 0;
      }
    }

    .kind {
      flex: none;
      display: grid;
      place-items: center;
      width: 40px;
      height: 40px;
      border-radius: var(--uc-radio);
      background-color: var(--uc-superficie-alt);
      color: var(--uc-texto-suave);
    }

    .name {
      font-weight: 700;
      color: var(--uc-texto);
    }

    .meta {
      margin: 0;
      font-size: 0.85rem;
      color: var(--uc-texto-suave);
    }

    .arrow {
      margin-top: 10px;
      color: var(--uc-dorado-firme);
    }

    .facets {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .facet {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 6px 4px 12px;
      border-radius: var(--uc-radio-pill);
      background-color: var(--uc-menta-suave);
      color: var(--uc-verde-principal);
      font-size: 0.875rem;
      font-weight: 700;

      small {
        font-size: 0.68rem;
        font-weight: 700;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: var(--uc-texto-suave);
      }
    }

    .origin {
      display: inline-grid;
      place-items: center;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background-color: var(--uc-superficie);

      .icon {
        width: 13px;
        height: 13px;
      }

      &[data-origin='ia'] {
        color: var(--uc-dorado-texto);
        background-color: var(--uc-dorado-suave);
      }

      &[data-origin='persona'] {
        color: #ffffff;
        background-color: var(--uc-esmeralda);
      }
    }

    .keywords {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin: 8px 0 0;
      padding: 0;
      list-style: none;

      li {
        padding: 1px 8px;
        border: 1px solid var(--uc-borde);
        border-radius: var(--uc-radio-pill);
        font-size: 0.78rem;
        color: var(--uc-texto-suave);

        &::before {
          content: '#';
          color: var(--uc-dorado-firme);
        }
      }
    }

    .confidence {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 8px;
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--uc-texto-suave);

      .bar {
        width: 90px;
        height: 6px;
        overflow: hidden;
        border-radius: 3px;
        background-color: var(--uc-superficie-alt);

        span {
          display: block;
          height: 100%;
          border-radius: inherit;
          background-color: var(--uc-esmeralda);
        }
      }

      &[data-level='media'] .bar span {
        background-color: var(--uc-dorado-firme);
      }

      &[data-level='baja'] .bar span {
        background-color: var(--uc-peligro);
      }
    }

    .reason {
      margin: 6px 0 0;
      font-size: 0.82rem;
      font-style: italic;
      color: var(--uc-texto-suave);
    }

    .decide {
      display: grid;
      gap: 6px;
      justify-items: stretch;

      button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        min-height: 38px;
        padding: 6px 14px;
        font-size: 0.875rem;
      }
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: var(--uc-radio-pill);
      font-size: 0.85rem;
      font-weight: 700;

      &.approved {
        background-color: var(--uc-exito-suave);
        color: var(--uc-exito-texto);
      }

      &.rejected {
        background-color: var(--uc-peligro-suave);
        color: var(--uc-peligro-texto);
      }
    }

    .editor {
      grid-column: 1 / -1;
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
      padding: 16px;
      border-radius: var(--uc-radio);
      background-color: var(--uc-superficie-alt);

      label {
        display: grid;
        gap: 4px;
        font-size: 0.85rem;
        font-weight: 700;
      }

      .wide {
        grid-column: 1 / -1;
      }
    }

    .editor-actions {
      grid-column: 1 / -1;
      display: flex;
      gap: 8px;
    }

    /* ----------------------------------------------------------- Antes y después */
    .compare {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }

    .col {
      padding: 20px;
      border-radius: var(--uc-radio-lg);

      h2 {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 0 0 4px;
        font-size: 1.15rem;
      }

      > .meta {
        margin-bottom: 14px;
      }
    }

    .before-col {
      background-color: var(--uc-superficie-alt);

      .tree-head {
        color: var(--uc-texto-suave);
      }
    }

    .after-col {
      border: 1.5px solid var(--uc-menta-borde);
      background:
        radial-gradient(circle at 100% 0, var(--uc-menta-tint), transparent 40%),
        var(--uc-superficie);

      h2 .icon {
        color: var(--uc-dorado-firme);
      }
    }

    .tree {
      margin-bottom: 12px;

      ul {
        display: grid;
        gap: 2px;
        margin: 4px 0 0;
        padding: 0 0 0 10px;
        border-left: 2px solid var(--uc-borde);
        list-style: none;
      }

      li {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 3px 0;
        font-size: 0.875rem;

        .icon {
          flex: none;
          color: var(--uc-texto-suave);
        }

        &[data-status='PROPOSED'] {
          color: var(--uc-texto-suave);
        }
      }

      .type {
        margin-left: auto;
        padding: 0 8px;
        border-radius: var(--uc-radio-pill);
        background-color: var(--uc-superficie-alt);
        font-size: 0.72rem;
        font-weight: 700;
        white-space: nowrap;
        color: var(--uc-texto-suave);
      }
    }

    .tree-head {
      margin: 0;
      font-weight: 800;
    }

    .unit {
      padding: 12px 14px;
      border-radius: var(--uc-radio);
      background-color: var(--uc-superficie);
      box-shadow: inset 0 0 0 1px var(--uc-borde);

      .tree-head {
        color: var(--uc-verde-principal);
      }

      ul {
        border-left-color: var(--uc-menta-borde);
      }
    }

    .theme-head {
      display: flex;
      align-items: center;
      gap: 6px;
      margin: 8px 0 0;
      font-size: 0.85rem;
      font-weight: 700;
      color: var(--uc-esmeralda);

      .icon {
        color: var(--uc-dorado-firme);
      }
    }

    @media (max-width: 1023.98px) {
      .steps {
        grid-template-columns: 1fr;
      }

      .stats {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }

      .row {
        grid-template-columns: 1fr;
      }

      .arrow {
        display: none;
      }

      .decide {
        display: flex;
        flex-wrap: wrap;
      }

      .compare,
      .editor {
        grid-template-columns: 1fr;
      }

      .legend,
      .actions-bar .ghost {
        margin-left: 0;
      }
    }

    @media (max-width: 479.98px) {
      .stats {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    /* --------------------------------------------------------------- Movimiento */
    @media (prefers-reduced-motion: no-preference) {
      .row {
        animation: rise var(--uc-mov-lento) var(--uc-curva) both;
        animation-delay: calc(var(--i, 0) * 40ms);
      }

      .steps li[data-state='current'] .dot {
        animation: beat 1.6s ease-in-out infinite;
      }

      /* Mientras la IA trabaja, una luz recorre cada elemento por turnos. */
      .row.scanning::after {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(100deg, transparent 20%, rgba(250, 204, 21, 0.28) 50%, transparent 80%);
        transform: translateX(-100%);
        animation: scan 1.8s ease-in-out infinite;
        animation-delay: calc(var(--i, 0) * 120ms);
        pointer-events: none;
      }

      .pulse path {
        stroke-dasharray: 150;
        animation: trace 1.4s linear infinite;
      }

      .facet,
      .badge {
        animation: pop var(--uc-mov-lento) var(--uc-curva-rebote) both;
      }
    }

    @keyframes rise {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: none; }
    }

    @keyframes beat {
      0%, 100% { transform: scale(1); }
      20% { transform: scale(1.15); }
      40% { transform: scale(0.95); }
    }

    @keyframes scan {
      to { transform: translateX(100%); }
    }

    @keyframes trace {
      from { stroke-dashoffset: 150; }
      to { stroke-dashoffset: -150; }
    }

    @keyframes pop {
      from { opacity: 0; transform: scale(0.85); }
      to { opacity: 1; transform: none; }
    }
  `,
})
export class Classification implements OnInit {
  private readonly api = inject(Api);

  protected readonly data = signal<MaterialsOverview | null>(null);
  protected readonly busy = signal<Busy>('');
  protected readonly error = signal('');
  protected readonly message = signal('');
  protected readonly view = signal<'review' | 'compare'>('review');
  protected readonly filter = signal<Filter>('ALL');
  protected readonly editing = signal<string | null>(null);
  protected draft = { themeId: null as string | null, materialType: null as string | null, unitNumber: null as number | null, keywords: '' };

  protected readonly withTheme = computed(() => this.data()?.materials.filter((m) => m.theme).length ?? 0);

  protected readonly steps = computed<Step[]>(() => {
    const s = this.data()?.stats;
    const read = (s?.total ?? 0) > 0;
    const classified = read && s!.pending === 0;
    const reviewed = classified && s!.proposed === 0;
    const searchable = (s?.approved ?? 0) > 0;
    const state = (done: boolean, current: boolean): Step['state'] => (done ? 'done' : current ? 'current' : 'todo');
    return [
      { n: 1, label: 'Leer Moodle', detail: read ? `${s!.total} elementos` : 'Solo lectura', state: state(read, !read) },
      { n: 2, label: 'Reglas', detail: 'Lo evidente: foro, tarea…', state: state(classified, read && !classified) },
      { n: 3, label: 'IA', detail: 'Tema, tipo y unidad', state: state(classified, read && !classified) },
      {
        n: 4,
        label: 'Revisión humana',
        detail: classified ? `${s!.proposed} por revisar` : 'Acepta o corrige',
        state: state(reviewed, classified && !reviewed),
      },
      {
        n: 5,
        label: 'Búsqueda',
        detail: searchable ? `${s!.approved} buscables` : 'Por tema y unidad',
        state: state(reviewed && searchable, false),
      },
    ];
  });

  protected readonly filters = computed(() => {
    const s = this.data()?.stats;
    return [
      { value: 'ALL' as Filter, label: 'Todos', count: s?.total ?? 0 },
      { value: 'PROPOSED' as Filter, label: 'Por revisar', count: s?.proposed ?? 0 },
      { value: 'APPROVED' as Filter, label: 'Aprobados', count: s?.approved ?? 0 },
      { value: 'REJECTED' as Filter, label: 'Rechazados', count: s?.rejected ?? 0 },
    ];
  });

  /** Las filas se agrupan como en el aula: por sección de Moodle, con su nombre original. */
  protected readonly sections = computed(() => {
    const filter = this.filter();
    const items = (this.data()?.materials ?? []).filter((m) => filter === 'ALL' || m.status === filter);
    return groupBySection(items);
  });

  protected readonly moodleOrder = computed(() => groupBySection(this.data()?.materials ?? []));

  /** Después: unidad → tema → material. Lo rechazado no aparece. */
  protected readonly organized = computed(() => {
    const units = new Map<string, { key: string; label: string; order: number; themes: Map<string, Material[]> }>();
    for (const m of this.data()?.materials ?? []) {
      if (m.status !== 'APPROVED' && m.status !== 'PROPOSED') continue;
      const key = m.unit ? String(m.unit.number) : 'none';
      const unit = units.get(key) ?? {
        key,
        label: m.unit ? `Unidad ${m.unit.number} · ${m.unit.name}` : 'Sin unidad',
        order: m.unit?.number ?? 99,
        themes: new Map<string, Material[]>(),
      };
      const theme = m.theme?.name ?? 'General del curso';
      unit.themes.set(theme, [...(unit.themes.get(theme) ?? []), m]);
      units.set(key, unit);
    }
    return [...units.values()]
      .sort((a, b) => a.order - b.order)
      .map((u) => ({ key: u.key, label: u.label, themes: [...u.themes].map(([name, items]) => ({ name, items })) }));
  });

  protected readonly themeGroups = computed(() => {
    const themes = this.data()?.vocabulary.themes ?? [];
    const parents = new Set(themes.map((t) => t.parent).filter(Boolean) as string[]);
    const groups = new Map<string, { id: string; name: string }[]>();
    for (const t of themes) {
      if (parents.has(t.name) && !t.parent) continue;
      const label = t.parent ?? 'Salud pública';
      groups.set(label, [...(groups.get(label) ?? []), { id: t.id, name: t.name }]);
    }
    return [...groups].map(([label, options]) => ({ label, options }));
  });

  async ngOnInit(): Promise<void> {
    try {
      const data = await this.api.materialsOverview();
      this.data.set(data.stats.total === 0 ? await this.api.importMaterials() : data);
    } catch (error) {
      this.error.set(errorMessage(error));
    }
  }

  protected moodleIcon(m: Material): string {
    return materialIcon(m);
  }

  protected kind(m: Material): string {
    return moodleKind(m);
  }

  protected originIcon(o: MaterialOrigin): string {
    return ORIGIN_ICON[o];
  }

  protected originLabel(o: MaterialOrigin): string {
    return ORIGIN_LABEL[o];
  }

  protected level(value: number | null): string {
    return confidenceLevel(value);
  }

  protected percent(value: number | null): string {
    return `${Math.round((value ?? 0) * 100)} %`;
  }

  protected async run(action: 'import' | 'classify' | 'approve' | 'reset'): Promise<void> {
    if (action === 'reset' && !confirm('¿Volver a dejar el aula como llegó de Moodle? Se borran las clasificaciones.')) return;
    this.busy.set(action);
    this.error.set('');
    this.message.set('');
    try {
      const calls = {
        import: () => this.api.importMaterials(),
        classify: () => this.api.classifyMaterials(),
        approve: () => this.api.approveConfidentMaterials(),
        reset: () => this.api.resetMaterials(),
      };
      const before = this.data()?.stats;
      const data = await calls[action]();
      this.data.set(data);
      this.editing.set(null);
      if (action === 'classify') {
        this.filter.set('PROPOSED');
        this.message.set(
          data.usedAi
            ? `La IA propuso la clasificación de ${data.stats.proposed} elementos y ${data.units.length} unidades. Revísala antes de publicarla.`
            : 'No hay un modelo de lenguaje configurado: solo se aplicaron las reglas.',
        );
      } else if (action === 'approve') {
        this.message.set(`Se aceptaron ${data.stats.approved - (before?.approved ?? 0)} propuestas de confianza alta.`);
      } else if (action === 'reset') {
        this.filter.set('ALL');
        this.message.set('El aula volvió a quedar como llegó de Moodle.');
      }
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.busy.set('');
    }
  }

  protected edit(m: Material): void {
    this.draft = {
      themeId: m.theme?.id ?? null,
      materialType: m.materialType,
      unitNumber: m.unit?.number ?? null,
      keywords: m.keywords.join(', '),
    };
    this.editing.set(m.id);
  }

  protected async saveEdit(m: Material): Promise<void> {
    const unit = this.data()?.units.find((u) => u.number === this.draft.unitNumber);
    await this.decide(m, 'approve', {
      themeId: this.draft.themeId,
      materialType: this.draft.materialType,
      unitNumber: unit?.number ?? null,
      unitName: unit?.name ?? '',
      keywords: this.draft.keywords.split(',').map((k) => k.trim()).filter(Boolean),
    });
  }

  protected async decide(m: Material, decision: 'approve' | 'reject', corrections = {}): Promise<void> {
    this.busy.set('review');
    this.error.set('');
    this.message.set('');
    try {
      await this.api.reviewMaterial(m.id, { decision, ...corrections });
      this.data.set(await this.api.materialsOverview());
      this.editing.set(null);
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.busy.set('');
    }
  }
}

function groupBySection(items: Material[]) {
  const sections = new Map<number, { number: number; name: string; items: Material[] }>();
  for (const m of items) {
    const section = sections.get(m.section) ?? { number: m.section, name: m.sectionName, items: [] };
    section.items.push(m);
    sections.set(m.section, section);
  }
  return [...sections.values()];
}
