import { Component, computed, input, model } from '@angular/core';
import { RelatedContent, TaxonomyType, Term, TermRef } from '../core/models';
import { LabelPipe, taxonomyLabel } from './labels';

/** Terminos de un tipo, cada padre seguido de sus hijos, para mostrar la jerarquia. */
export function termsOfType(terms: Term[], type: TaxonomyType): (Term & { depth: number })[] {
  const ofType = terms.filter((term) => term.type === type);
  const ids = new Set(ofType.map((term) => term.id));
  const children = (parentId: string | null) =>
    ofType.filter((term) => (parentId ? term.parentId === parentId : !term.parentId || !ids.has(term.parentId)));
  const walk = (parentId: string | null, depth: number): (Term & { depth: number })[] =>
    children(parentId).flatMap((term) => [{ ...term, depth }, ...walk(term.id, depth + 1)]);
  return walk(null, 0);
}

function toggle(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
}

/**
 * Clasificacion de un contenido con la taxonomia: un grupo de casillas por tipo de termino.
 * Los municipios aparecen debajo de su departamento.
 */
@Component({
  selector: 'app-term-picker',
  template: `
    <div class="term-groups">
      @for (group of groups(); track group.type) {
        <fieldset>
          <legend>{{ group.label }}</legend>
          @for (term of group.terms; track term.id) {
            <label [class.child]="term.depth > 0">
              <input type="checkbox" [checked]="selected().includes(term.id)" (change)="selected.set(toggle(selected(), term.id))" />
              {{ term.name }}
            </label>
          } @empty {
            <p class="meta">No hay términos de este tipo.</p>
          }
        </fieldset>
      }
    </div>
  `,
})
export class TermPicker {
  readonly terms = input.required<Term[]>();
  readonly types = input.required<TaxonomyType[]>();
  readonly selected = model.required<string[]>();

  protected readonly toggle = toggle;
  protected readonly groups = computed(() =>
    this.types().map((type) => ({ type, label: taxonomyLabel(type), terms: termsOfType(this.terms(), type) })),
  );
}

/** Lista de casillas para asociar otros contenidos (recursos, iniciativas). */
@Component({
  selector: 'app-related-picker',
  imports: [LabelPipe],
  template: `
    <fieldset>
      <legend>{{ legend() }}</legend>
      @if (options().length === 0) {
        <p class="meta">{{ empty() }}</p>
      }
      <ul class="related-list">
        @for (option of options(); track option.id) {
          <li>
            <label style="font-weight: 400">
              <input type="checkbox" [checked]="selected().includes(option.id)" (change)="selected.set(toggle(selected(), option.id))" />
              {{ option.title }}
              @if (option.state !== 'PUBLISHED') {
                <span class="meta">({{ option.state | label }})</span>
              }
            </label>
          </li>
        }
      </ul>
    </fieldset>
  `,
})
export class RelatedPicker {
  readonly legend = input.required<string>();
  readonly empty = input('No hay contenidos para asociar.');
  readonly options = input.required<RelatedContent[]>();
  readonly selected = model.required<string[]>();

  protected readonly toggle = toggle;
}

/** Terminos de un contenido como etiquetas. */
@Component({
  selector: 'app-term-tags',
  template: `
    @if (terms().length) {
      <ul class="tags" aria-label="Clasificación">
        @for (term of terms(); track term.id) {
          <li>{{ term.name }}</li>
        }
      </ul>
    }
  `,
})
export class TermTags {
  readonly terms = input.required<TermRef[]>();
}

/** Nombres de los terminos de un tipo, separados por comas. */
export function namesOf(terms: TermRef[], type?: TaxonomyType): string {
  return terms
    .filter((term) => !type || term.type === type)
    .map((term) => term.name)
    .join(', ');
}
