import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Api, errorMessage } from '../../core/api';
import { Catalogs, ResourceDetail, ResourceInput, TaxonomyType, VersionInfo } from '../../core/models';
import { EditorialPanel } from '../../shared/editorial-panel';
import { FileSizePipe, LabelPipe } from '../../shared/labels';
import { TermPicker } from '../../shared/taxonomy';

const EDITABLE_STATES = ['DRAFT', 'RETURNED'];
const TERM_TYPES: TaxonomyType[] = ['RESOURCE_TYPE', 'THEME', 'TERRITORY', 'POPULATION', 'TAG'];

/**
 * Ficha de un recurso y sus versiones (RF-05). Cada archivo que se carga es una version nueva:
 * las anteriores se conservan y se pueden descargar. Para enviarlo a revision necesita al menos una.
 */
@Component({
  selector: 'app-resource-form',
  imports: [FormsModule, RouterLink, DatePipe, LabelPipe, FileSizePipe, EditorialPanel, TermPicker],
  template: `
    <p><a routerLink="/mis-recursos">← Mis recursos</a></p>
    <h1>{{ id() ? 'Editar recurso' : 'Nuevo recurso' }}</h1>

    @if (!editable()) {
      <p class="notice">Este recurso está en «{{ state() | label }}» y no se puede editar.</p>
    }

    @if (catalogs(); as options) {
      <form (ngSubmit)="save()">
        <fieldset [disabled]="!editable() || busy()" style="border: 0; padding: 0; max-width: none">
          <div class="field">
            <label for="title">Título</label>
            <input id="title" name="title" type="text" required minlength="3" maxlength="255" [(ngModel)]="model.title" />
          </div>
          <div class="field">
            <label for="description">Descripción</label>
            <textarea id="description" name="description" rows="4" required [(ngModel)]="model.description"></textarea>
          </div>
          <div class="field">
            <label for="license">Licencia</label>
            <input id="license" name="license" type="text" required maxlength="120" list="licencias" [(ngModel)]="model.license" aria-describedby="license-hint" />
            <datalist id="licencias">
              <option value="CC BY 4.0"></option>
              <option value="CC BY-SA 4.0"></option>
              <option value="CC BY-NC 4.0"></option>
              <option value="CC BY-NC-SA 4.0"></option>
              <option value="Todos los derechos reservados"></option>
            </datalist>
            <p id="license-hint" class="hint">Bajo qué condiciones otras personas pueden usar el recurso.</p>
          </div>
          <div class="field">
            <label for="visibility">Acceso</label>
            <select id="visibility" name="visibility" [(ngModel)]="model.visibility" aria-describedby="visibility-hint">
              @for (visibility of options.visibilities; track visibility) {
                <option [value]="visibility">{{ visibility | label }}</option>
              }
            </select>
            <p id="visibility-hint" class="hint">
              Un recurso de acceso con sesión aparece en el catálogo, pero solo lo descargan quienes ingresan.
            </p>
          </div>

          <h2>Clasificación</h2>
          <app-term-picker [terms]="options.terms" [types]="termTypes" [(selected)]="model.termIds" />

          <div class="actions">
            <button type="submit">{{ busy() ? 'Guardando…' : id() ? 'Guardar cambios' : 'Crear y continuar con el archivo' }}</button>
          </div>
        </fieldset>
      </form>

      @if (id()) {
        <section aria-labelledby="files-title">
          <h2 id="files-title">Archivo y versiones</h2>
          @if (editable()) {
            <div class="field">
              <label for="file">Cargar una versión nueva</label>
              <input id="file" type="file" [accept]="accept(options)" (change)="pick($event)" aria-describedby="file-hint" />
              <p id="file-hint" class="hint">
                Formatos: {{ options.resourceFormats.join(', ') }}. Tamaño máximo: {{ options.maxUploadBytes | fileSize }}.
              </p>
            </div>
            <button type="button" [disabled]="!file() || busy()" (click)="upload()">
              {{ busy() ? 'Cargando…' : 'Cargar versión' }}
            </button>
          }

          @if (versions().length === 0) {
            <p class="meta">Todavía no hay archivos. Carga al menos uno para poder enviarlo a revisión.</p>
          } @else {
            <div class="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Versión</th>
                    <th scope="col">Archivo</th>
                    <th scope="col">Tamaño</th>
                    <th scope="col">Cargado por</th>
                    <th scope="col">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  @for (version of versions(); track version.id) {
                    <tr>
                      <td>v{{ version.versionNumber }}</td>
                      <td><a [href]="downloadUrl(version)" download>{{ version.originalFilename }}</a></td>
                      <td>{{ version.sizeBytes | fileSize }}</td>
                      <td>{{ version.uploadedBy }}</td>
                      <td>{{ version.createdAt | date: 'dd/MM/yyyy HH:mm' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </section>
      }
    } @else if (!error()) {
      <p>Cargando…</p>
    }

    @if (notice()) {
      <p class="notice ok" role="status">{{ notice() }}</p>
    }
    @if (error()) {
      <p class="notice error" role="alert">{{ error() }}</p>
    }

    @if (id(); as resourceId) {
      <app-editorial-panel entityType="resources" [entityId]="resourceId" [state]="state()" (changed)="state.set($event)" />
    }
  `,
})
export class ResourceForm implements OnInit {
  private readonly api = inject(Api);
  private readonly router = inject(Router);

  /** Parametro `:id` de la ruta; ausente al crear. */
  readonly id = input<string>();

  protected readonly termTypes = TERM_TYPES;
  protected readonly catalogs = signal<Catalogs | null>(null);
  protected readonly versions = signal<VersionInfo[]>([]);
  protected readonly state = signal('DRAFT');
  protected readonly editable = computed(() => EDITABLE_STATES.includes(this.state()));
  protected readonly file = signal<File | null>(null);
  protected readonly busy = signal(false);
  protected readonly notice = signal('');
  protected readonly error = signal('');

  protected model: ResourceInput = { title: '', description: '', license: 'CC BY 4.0', visibility: 'PUBLIC', termIds: [] };

  async ngOnInit(): Promise<void> {
    try {
      const id = this.id();
      if (id) this.show(await this.api.resource(id));
      this.catalogs.set(await this.api.catalogs());
    } catch (error) {
      this.error.set(errorMessage(error));
    }
  }

  private show(detail: ResourceDetail): void {
    this.model = {
      title: detail.title,
      description: detail.description,
      license: detail.license,
      visibility: detail.visibility,
      termIds: detail.terms.map((term) => term.id),
    };
    this.versions.set(detail.versions);
    this.state.set(detail.state);
  }

  protected accept(options: Catalogs): string {
    return options.resourceFormats.map((format) => `.${format}`).join(',');
  }

  protected pick(event: Event): void {
    this.file.set((event.target as HTMLInputElement).files?.[0] ?? null);
  }

  protected downloadUrl(version: VersionInfo): string {
    return this.api.versionDownloadUrl(this.id() ?? '', version.id);
  }

  protected async save(): Promise<void> {
    this.busy.set(true);
    this.notice.set('');
    this.error.set('');
    try {
      const id = this.id();
      if (id) {
        await this.api.updateResource(id, this.model);
        this.notice.set('Cambios guardados.');
      } else {
        const created = await this.api.createResource(this.model);
        await this.router.navigate(['/mis-recursos', created.id]);
      }
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  protected async upload(): Promise<void> {
    const id = this.id();
    const file = this.file();
    if (!id || !file) return;
    const max = this.catalogs()?.maxUploadBytes ?? Infinity;
    if (file.size > max) {
      this.error.set('El archivo supera el tamaño máximo permitido.');
      return;
    }
    this.busy.set(true);
    this.notice.set('');
    this.error.set('');
    try {
      this.show(await this.api.uploadVersion(id, file));
      this.file.set(null);
      this.notice.set(`Versión cargada: ${file.name}.`);
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }
}
