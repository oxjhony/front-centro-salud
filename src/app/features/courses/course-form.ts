import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Api, errorMessage } from '../../core/api';
import { Catalogs, CourseDetail, CourseInput, LmsLink, RelatedContent, TaxonomyType } from '../../core/models';
import { EditorialPanel } from '../../shared/editorial-panel';
import { LabelPipe, linkErrorLabel, linkStatusLabel } from '../../shared/labels';
import { RelatedPicker, TermPicker } from '../../shared/taxonomy';

const EDITABLE_STATES = ['DRAFT', 'RETURNED'];
const TERM_TYPES: TaxonomyType[] = ['THEME', 'POPULATION', 'TERRITORY', 'TAG'];

/**
 * Ficha de un curso y su enlace con el aula en Moodle (H-22, H-23, H-25). El gestor escribe el
 * idnumber del curso; al guardar, la plataforma lo verifica contra Moodle y muestra el resultado.
 */
@Component({
  selector: 'app-course-form',
  imports: [FormsModule, RouterLink, DatePipe, LabelPipe, EditorialPanel, TermPicker, RelatedPicker],
  template: `
    <h1>{{ id() ? 'Editar ficha de curso' : 'Nueva ficha de curso' }}</h1>

    @if (!editable()) {
      <p class="notice">Esta ficha está en «{{ state() | label }}» y no se puede editar.</p>
    }

    <div class="editor-layout">
      <div>
    @if (catalogs(); as options) {
      <form class="panel form-panel" (ngSubmit)="save()">
        <fieldset [disabled]="!editable() || busy()" class="plain">
          <p class="hint">Los campos marcados con <span aria-hidden="true">*</span><span class="visually-hidden">asterisco</span> son obligatorios.</p>
          <div class="field">
            <label for="title">Nombre del curso</label>
            <input id="title" name="title" type="text" required minlength="3" maxlength="255" [(ngModel)]="model.title" />
          </div>
          <div class="field">
            <label for="summary">Resumen</label>
            <textarea id="summary" name="summary" rows="4" required [(ngModel)]="model.summary"></textarea>
          </div>
          <div class="field">
            <label for="type">Tipo</label>
            <select id="type" name="type" [(ngModel)]="model.type">
              @for (type of options.courseTypes; track type) {
                <option [value]="type">{{ type | label }}</option>
              }
            </select>
          </div>
          <div class="field">
            <label for="modality">Modalidad</label>
            <select id="modality" name="modality" [(ngModel)]="model.modality">
              @for (modality of options.courseModalities; track modality) {
                <option [value]="modality">{{ modality | label }}</option>
              }
            </select>
          </div>
          <div class="field">
            <label for="duration">Duración</label>
            <input id="duration" name="duration" type="text" maxlength="100" [(ngModel)]="model.duration" />
          </div>
          <div class="field">
            <label for="startDate">Fecha de inicio</label>
            <input id="startDate" name="startDate" type="date" [(ngModel)]="model.startDate" />
          </div>
          <div class="field">
            <label for="endDate">Fecha de cierre</label>
            <input id="endDate" name="endDate" type="date" [(ngModel)]="model.endDate" />
          </div>
          <div class="field">
            <label for="capacity">Cupos</label>
            <input id="capacity" name="capacity" type="number" min="1" [(ngModel)]="model.capacity" />
          </div>
          <div class="field">
            <label for="requirements">Requisitos</label>
            <textarea id="requirements" name="requirements" rows="2" [(ngModel)]="model.requirements"></textarea>
          </div>

          <h2>Clasificación</h2>
          <app-term-picker [terms]="options.terms" [types]="termTypes" [(selected)]="model.termIds" />

          <h2>Acceso al aula</h2>
          <div class="field">
            <label for="moodleExternalId">Número ID del curso en Moodle (idnumber)</label>
            <input id="moodleExternalId" name="moodleExternalId" type="text" maxlength="100" [(ngModel)]="model.moodleExternalId" aria-describedby="moodleExternalId-hint" />
            <p id="moodleExternalId-hint" class="hint">
              Es el campo «Número ID del curso» de la configuración del curso en Moodle. Para cursos del Centro usa la
              forma <code>cvsp-nombre-del-curso</code>. Déjalo vacío si el curso no tiene aula en Moodle.
            </p>
          </div>
          <div class="field">
            <label for="accessInstructions">Instrucción de acceso alternativa</label>
            <textarea id="accessInstructions" name="accessInstructions" rows="3" [(ngModel)]="model.accessInstructions" aria-describedby="accessInstructions-hint"></textarea>
            <p id="accessInstructions-hint" class="hint">
              Se muestra al visitante cuando no hay enlace directo o el enlace falla. Para publicar, la ficha necesita
              un enlace verificado o esta instrucción.
            </p>
          </div>

          <h2>Contenidos relacionados</h2>
          <app-related-picker legend="Iniciativas" empty="No hay iniciativas publicadas para asociar." [options]="initiatives()" [(selected)]="model.initiativeIds" />
          <app-related-picker legend="Recursos del curso" empty="No hay recursos para asociar." [options]="resources()" [(selected)]="model.resourceIds" />

          <div class="actions">
            <button type="submit">{{ busy() ? 'Guardando y verificando…' : 'Guardar borrador' }}</button>
            <a class="button secondary" routerLink="/mis-cursos">Volver a mis cursos</a>
          </div>
        </fieldset>
      </form>
    } @else if (!error()) {
      <p class="loading" role="status">Cargando…</p>
    }

    @if (saved()) {
      <p class="notice ok" role="status">Borrador guardado.</p>
    }
    @if (error()) {
      <p class="notice error" role="alert">{{ error() }}</p>
    }

    @if (link(); as current) {
      <section aria-labelledby="link-title">
        <h2 id="link-title">Enlace con Moodle</h2>
        <p>
          <span class="state" [attr.data-state]="current.status">{{ linkStatus(current.status) }}</span>
        </p>
        @if (current.status === 'VERIFIED') {
          <dl class="details">
            <dt>Enlace al aula</dt>
            <dd><a [href]="current.url" rel="noopener">{{ current.url }}</a></dd>
            <dt>Verificado</dt>
            <dd>{{ current.verifiedAt | date: 'dd/MM/yyyy HH:mm' }}</dd>
          </dl>
        } @else if (current.error) {
          <p class="notice error">{{ linkError(current.error) }}</p>
        }
        @if (current.externalId) {
          <button type="button" class="secondary" [disabled]="busy()" (click)="verify()">Verificar de nuevo con Moodle</button>
        }
      </section>
    }

      </div>

      @if (id(); as courseId) {
        <aside>
          <app-editorial-panel entityType="courses" [entityId]="courseId" [state]="state()" (changed)="state.set($event)" />
        </aside>
      }
    </div>
  `,
})
export class CourseForm implements OnInit {
  private readonly api = inject(Api);
  private readonly router = inject(Router);

  /** Parametro `:id` de la ruta; ausente al crear. */
  readonly id = input<string>();

  protected readonly termTypes = TERM_TYPES;
  protected readonly catalogs = signal<Catalogs | null>(null);
  protected readonly initiatives = signal<RelatedContent[]>([]);
  protected readonly resources = signal<RelatedContent[]>([]);
  protected readonly state = signal('DRAFT');
  protected readonly link = signal<LmsLink | null>(null);
  protected readonly editable = computed(() => EDITABLE_STATES.includes(this.state()));
  protected readonly busy = signal(false);
  protected readonly saved = signal(false);
  protected readonly error = signal('');
  protected readonly linkStatus = linkStatusLabel;
  protected readonly linkError = linkErrorLabel;

  protected model: CourseInput = {
    title: '',
    summary: '',
    type: 'COURSE',
    modality: 'VIRTUAL',
    duration: null,
    startDate: null,
    endDate: null,
    capacity: null,
    requirements: null,
    moodleExternalId: null,
    accessInstructions: null,
    termIds: [],
    initiativeIds: [],
    resourceIds: [],
  };

  async ngOnInit(): Promise<void> {
    try {
      const [catalogs, published, linkable] = await Promise.all([
        this.api.catalogs(),
        this.api.publicInitiatives({ pageSize: 50 }),
        this.api.linkableResources(),
      ]);
      let initiatives: RelatedContent[] = published.items.map(({ id, title, state }) => ({ id, title, state }));
      let resources = linkable;
      const id = this.id();
      if (id) {
        const detail = await this.api.course(id);
        this.show(detail);
        // Lo ya asociado se sigue mostrando aunque ya no sea asociable.
        initiatives = [...initiatives, ...detail.initiatives.filter((i) => !initiatives.some((p) => p.id === i.id))];
        resources = [...resources, ...detail.resources.filter((r) => !resources.some((l) => l.id === r.id))];
      }
      this.initiatives.set(initiatives);
      this.resources.set(resources);
      this.catalogs.set(catalogs);
    } catch (error) {
      this.error.set(errorMessage(error));
    }
  }

  private show(detail: CourseDetail): void {
    this.model = {
      title: detail.title,
      summary: detail.summary,
      type: detail.type,
      modality: detail.modality,
      duration: detail.duration,
      startDate: detail.startDate,
      endDate: detail.endDate,
      capacity: detail.capacity,
      requirements: detail.requirements,
      moodleExternalId: detail.link.externalId,
      accessInstructions: detail.accessInstructions,
      termIds: detail.terms.map((term) => term.id),
      initiativeIds: detail.initiatives.map((initiative) => initiative.id),
      resourceIds: detail.resources.map((resource) => resource.id),
    };
    this.state.set(detail.state);
    this.link.set(detail.link);
  }

  protected async save(): Promise<void> {
    this.busy.set(true);
    this.saved.set(false);
    this.error.set('');
    // Los campos vacios llegan como cadena vacia; la API espera null.
    const input: CourseInput = {
      ...this.model,
      duration: this.model.duration || null,
      startDate: this.model.startDate || null,
      endDate: this.model.endDate || null,
      capacity: this.model.capacity || null,
      requirements: this.model.requirements || null,
      moodleExternalId: this.model.moodleExternalId?.trim() || null,
      accessInstructions: this.model.accessInstructions || null,
    };
    try {
      const id = this.id();
      if (id) {
        this.show(await this.api.updateCourse(id, input));
        this.saved.set(true);
      } else {
        const created = await this.api.createCourse(input);
        await this.router.navigate(['/mis-cursos', created.id]);
      }
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  protected async verify(): Promise<void> {
    const id = this.id();
    if (!id) return;
    this.busy.set(true);
    this.error.set('');
    try {
      this.link.set((await this.api.verifyCourseLink(id)).link);
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }
}
