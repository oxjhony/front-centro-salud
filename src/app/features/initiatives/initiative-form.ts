import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Api, errorMessage } from '../../core/api';
import { Catalogs, InitiativeInput, RelatedContent, TaxonomyType } from '../../core/models';
import { EditorialPanel } from '../../shared/editorial-panel';
import { LabelPipe } from '../../shared/labels';
import { RelatedPicker, TermPicker } from '../../shared/taxonomy';

/** Estados en los que el autor todavia puede editar; en los demas el formulario es de solo lectura. */
const EDITABLE_STATES = ['DRAFT', 'RETURNED'];
const TERM_TYPES: TaxonomyType[] = ['THEME', 'TERRITORY', 'POPULATION', 'TAG'];

/** Crear y editar el borrador de una iniciativa (H-07, H-08), adjuntarle recursos y enviarla a revision (H-10). */
@Component({
  selector: 'app-initiative-form',
  imports: [FormsModule, RouterLink, LabelPipe, EditorialPanel, TermPicker, RelatedPicker],
  template: `
    <p><a routerLink="/mis-iniciativas">← Mis iniciativas</a></p>
    <h1>{{ id() ? 'Editar iniciativa' : 'Nueva iniciativa' }}</h1>

    @if (!editable()) {
      <p class="notice">Esta iniciativa está en «{{ state() | label }}» y no se puede editar.</p>
    }

    @if (catalogs(); as options) {
      <form (ngSubmit)="save()">
        <fieldset [disabled]="!editable() || busy()" style="border: 0; padding: 0; max-width: none">
          <div class="field">
            <label for="title">Título</label>
            <input id="title" name="title" type="text" required minlength="3" maxlength="255" [(ngModel)]="model.title" />
          </div>
          <div class="field">
            <label for="summary">Resumen</label>
            <textarea id="summary" name="summary" rows="5" required [(ngModel)]="model.summary"></textarea>
          </div>
          <div class="field">
            <label for="type">Tipo de iniciativa</label>
            <select id="type" name="type" required [(ngModel)]="model.type">
              @for (type of options.initiativeTypes; track type) {
                <option [value]="type">{{ type | label }}</option>
              }
            </select>
          </div>
          <div class="field">
            <label for="startDate">Fecha de inicio</label>
            <input id="startDate" name="startDate" type="date" [(ngModel)]="model.startDate" />
          </div>
          <div class="field">
            <label for="endDate">Fecha de cierre</label>
            <input id="endDate" name="endDate" type="date" [(ngModel)]="model.endDate" />
          </div>

          <h2>Clasificación</h2>
          <app-term-picker [terms]="options.terms" [types]="termTypes" [(selected)]="model.termIds" />

          <div class="field">
            <label for="results">Resultados</label>
            <textarea id="results" name="results" rows="3" [(ngModel)]="model.results"></textarea>
          </div>

          <app-related-picker
            legend="Recursos y productos asociados"
            empty="Todavía no hay recursos tuyos ni publicados para asociar. Créalos en «Mis recursos»."
            [options]="resources()"
            [(selected)]="model.resourceIds"
          />

          <div class="actions">
            <button type="submit">{{ busy() ? 'Guardando…' : 'Guardar borrador' }}</button>
          </div>
        </fieldset>
      </form>
    } @else if (!error()) {
      <p>Cargando…</p>
    }

    @if (saved()) {
      <p class="notice ok" role="status">Borrador guardado.</p>
    }
    @if (error()) {
      <p class="notice error" role="alert">{{ error() }}</p>
    }

    @if (id(); as initiativeId) {
      <app-editorial-panel entityType="initiatives" [entityId]="initiativeId" [state]="state()" (changed)="state.set($event)" />
    }
  `,
})
export class InitiativeForm implements OnInit {
  private readonly api = inject(Api);
  private readonly router = inject(Router);

  /** Parametro `:id` de la ruta; ausente al crear. */
  readonly id = input<string>();

  protected readonly termTypes = TERM_TYPES;
  protected readonly catalogs = signal<Catalogs | null>(null);
  protected readonly resources = signal<RelatedContent[]>([]);
  protected readonly state = signal('DRAFT');
  protected readonly editable = computed(() => EDITABLE_STATES.includes(this.state()));
  protected readonly busy = signal(false);
  protected readonly saved = signal(false);
  protected readonly error = signal('');

  protected model: InitiativeInput = {
    title: '',
    summary: '',
    type: 'PROJECT',
    startDate: null,
    endDate: null,
    results: null,
    termIds: [],
    resourceIds: [],
  };

  async ngOnInit(): Promise<void> {
    try {
      const id = this.id();
      const [catalogs, linkable] = await Promise.all([this.api.catalogs(), this.api.linkableResources()]);
      let resources = linkable;
      if (id) {
        const detail = await this.api.initiative(id);
        this.model = {
          title: detail.title,
          summary: detail.summary,
          type: detail.type,
          startDate: detail.startDate,
          endDate: detail.endDate,
          results: detail.results,
          termIds: detail.terms.map((term) => term.id),
          resourceIds: detail.resources.map((resource) => resource.id),
        };
        // Un recurso ya asociado se sigue mostrando aunque ya no sea asociable.
        resources = [...linkable, ...detail.resources.filter((r) => !linkable.some((l) => l.id === r.id))];
        this.state.set(detail.state);
      }
      this.resources.set(resources);
      this.catalogs.set(catalogs);
    } catch (error) {
      this.error.set(errorMessage(error));
    }
  }

  protected async save(): Promise<void> {
    this.busy.set(true);
    this.saved.set(false);
    this.error.set('');
    // Los campos de fecha vacios llegan como cadena vacia; la API espera null.
    const input: InitiativeInput = {
      ...this.model,
      startDate: this.model.startDate || null,
      endDate: this.model.endDate || null,
      results: this.model.results || null,
    };
    try {
      const id = this.id();
      if (id) {
        await this.api.updateInitiative(id, input);
        this.saved.set(true);
      } else {
        const created = await this.api.createInitiative(input);
        await this.router.navigate(['/mis-iniciativas', created.id]);
      }
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }
}
