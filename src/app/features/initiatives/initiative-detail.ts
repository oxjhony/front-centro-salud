import { Component, inject, input, OnInit, PendingTasks, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Api } from '../../core/api';
import { PublicInitiative, TaxonomyType } from '../../core/models';
import { LabelPipe } from '../../shared/labels';
import { namesOf } from '../../shared/taxonomy';

/** Ficha publica de una iniciativa (H-15), con sus recursos y cursos publicados. */
@Component({
  selector: 'app-initiative-detail',
  imports: [RouterLink, LabelPipe],
  template: `
    <p><a routerLink="/iniciativas">← Todas las iniciativas</a></p>

    @if (initiative(); as item) {
      <article>
        <h1>{{ item.title }}</h1>
        <p class="meta">{{ item.type | label }}</p>
        <p>{{ item.summary }}</p>

        <dl class="details">
          @for (group of groups; track group.type) {
            @if (names(item, group.type); as text) {
              <dt>{{ group.label }}</dt>
              <dd>{{ text }}</dd>
            }
          }
          @if (item.startDate) {
            <dt>Inicio</dt>
            <dd>{{ item.startDate }}</dd>
          }
          @if (item.endDate) {
            <dt>Cierre</dt>
            <dd>{{ item.endDate }}</dd>
          }
          @if (item.authors.length) {
            <dt>Responsables</dt>
            <dd>{{ item.authors.join(', ') }}</dd>
          }
        </dl>

        @if (item.results) {
          <h2>Resultados</h2>
          <p>{{ item.results }}</p>
        }

        @if (item.resources.length) {
          <h2>Recursos y productos</h2>
          <ul class="related-list">
            @for (resource of item.resources; track resource.id) {
              <li><a [routerLink]="['/recursos', resource.id]">{{ resource.title }}</a></li>
            }
          </ul>
        }

        @if (item.courses.length) {
          <h2>Formación relacionada</h2>
          <ul class="related-list">
            @for (course of item.courses; track course.id) {
              <li><a [routerLink]="['/cursos', course.id]">{{ course.title }}</a></li>
            }
          </ul>
        }
      </article>
    } @else if (missing()) {
      <h1>Iniciativa no disponible</h1>
      <p>Esta iniciativa no existe o todavía no está publicada.</p>
    } @else {
      <p>Cargando…</p>
    }
  `,
})
export class InitiativeDetailPage implements OnInit {
  private readonly api = inject(Api);
  private readonly tasks = inject(PendingTasks);

  /** Parametro `:id` de la ruta. */
  readonly id = input.required<string>();

  protected readonly initiative = signal<PublicInitiative | null>(null);
  protected readonly missing = signal(false);
  protected readonly groups: { type: TaxonomyType; label: string }[] = [
    { type: 'THEME', label: 'Temas' },
    { type: 'TERRITORY', label: 'Territorios' },
    { type: 'POPULATION', label: 'Poblaciones' },
    { type: 'TAG', label: 'Etiquetas' },
  ];

  ngOnInit(): void {
    this.tasks.run(async () => {
      try {
        this.initiative.set(await this.api.publicInitiative(this.id()));
      } catch {
        this.missing.set(true);
      }
    });
  }

  protected names(item: PublicInitiative, type: TaxonomyType): string {
    return namesOf(item.terms, type);
  }
}
