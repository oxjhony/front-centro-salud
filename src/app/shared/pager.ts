import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Page } from '../core/models';

/** Paginacion de un listado publico. La pagina vive en la URL (?pagina=N), como los filtros. */
@Component({
  selector: 'app-pager',
  imports: [RouterLink],
  template: `
    @if (pages() > 1) {
      <nav class="actions" aria-label="Páginas de resultados">
        @if (page().page > 1) {
          <a class="button secondary" [routerLink]="[]" [queryParams]="{ pagina: page().page - 1 }" queryParamsHandling="merge">Anterior</a>
        }
        <span>Página {{ page().page }} de {{ pages() }}</span>
        @if (page().page < pages()) {
          <a class="button secondary" [routerLink]="[]" [queryParams]="{ pagina: page().page + 1 }" queryParamsHandling="merge">Siguiente</a>
        }
      </nav>
    }
  `,
})
export class Pager {
  readonly page = input.required<Page<unknown>>();
  protected readonly pages = computed(() => Math.ceil(this.page().total / this.page().pageSize));
}
