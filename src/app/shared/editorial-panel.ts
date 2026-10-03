import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, input, output, PendingTasks, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Api, errorMessage } from '../core/api';
import { AvailableTransition, PublishableEntity, ReviewEntry } from '../core/models';
import { actionLabel, label, LabelPipe } from './labels';

/** El camino de un contenido hasta publicarse, en orden. */
const ROUTE: { state: string; name: string }[] = [
  { state: 'DRAFT', name: 'Borrador' },
  { state: 'SUBMITTED', name: 'Enviado' },
  { state: 'IN_REVIEW', name: 'En revisión' },
  { state: 'APPROVED', name: 'Aprobado' },
  { state: 'PUBLISHED', name: 'Publicado' },
];

/** Que significa cada estado para quien mira el contenido, y que viene despues. */
const NEXT: Record<string, string> = {
  DRAFT: 'Todavía no se ha enviado. El siguiente paso es enviarlo a revisión.',
  SUBMITTED: 'Está en la fila de revisión, a la espera de que un revisor lo tome.',
  IN_REVIEW: 'Un revisor lo está leyendo. Puede aprobarlo o devolverlo con observaciones.',
  APPROVED: 'La revisión terminó bien. Solo falta publicarlo.',
  PUBLISHED: 'Está publicado: cualquier persona puede verlo en el portal.',
  RETURNED: 'Volvió al autor con observaciones. Hay que corregirlo y enviarlo de nuevo.',
  ARCHIVED: 'Está archivado: no aparece en el portal.',
};

/**
 * Transiciones que solo hacen avanzar el contenido: se senalan como el siguiente paso.
 * Aprobar es un juicio del revisor y no se sugiere.
 */
const FORWARD = ['SUBMITTED', 'IN_REVIEW', 'PUBLISHED'];

/**
 * Estado editorial de un contenido: en que estado esta, que puede hacer con el la persona que lo
 * mira y que ha pasado antes. Sirve igual para iniciativas, recursos y cursos, y para autores y revisores:
 * las acciones disponibles las decide la API segun los permisos y la tabla de transiciones.
 */
@Component({
  selector: 'app-editorial-panel',
  imports: [FormsModule, DatePipe, LabelPipe],
  template: `
    <section class="editorial panel" aria-labelledby="editorial-title">
      <h2 id="editorial-title">Estado editorial</h2>
      <p>
        Estado actual: <span class="state" [attr.data-state]="state()">{{ state() | label }}</span>
      </p>

      <div
        class="route"
        role="img"
        [class.returned]="state() === 'RETURNED'"
        [class.off]="state() === 'ARCHIVED'"
        [attr.aria-label]="routeLabel()"
      >
        @for (step of route; track step.state; let index = $index) {
          <span class="route-step" [class.done]="index < position()" [class.current]="index === position()" aria-hidden="true">
            <span class="route-dot"></span>
            {{ step.name }}
          </span>
        }
      </div>
      @if (next(); as text) {
        <p class="route-hint">{{ text }}</p>
      }

      @if (transitions().length) {
        @if (needsComment()) {
          <div class="field">
            <label for="editorial-comment">Comentario</label>
            <textarea id="editorial-comment" name="comment" rows="3" [(ngModel)]="comment" aria-describedby="editorial-comment-hint"></textarea>
            <p id="editorial-comment-hint" class="hint">Obligatorio para devolver, rechazar o archivar. El autor lo verá en el historial.</p>
          </div>
        }
        <div class="actions">
          @for (transition of transitions(); track transition.to) {
            <button
              type="button"
              [class.secondary]="transition.requiresComment"
              [class.danger]="transition.to === 'ARCHIVED'"
              [class.beacon]="isForward(transition)"
              [disabled]="busy() || (transition.requiresComment && !comment.trim())"
              (click)="apply(transition)"
            >
              {{ action(transition.to, state()) }}
            </button>
          }
        </div>
      } @else if (loaded()) {
        <p class="meta">No tienes acciones disponibles sobre este contenido en su estado actual.</p>
      }

      @if (error()) {
        <p class="notice error" role="alert">{{ error() }}</p>
      }

      @if (history().length) {
        <h3>Historial</h3>
        <ol>
          @for (entry of history(); track entry.createdAt) {
            <li>
              {{ entry.createdAt | date: 'dd/MM/yyyy HH:mm' }} — {{ entry.actorName }}:
              {{ entry.from | label }} → <strong>{{ entry.to | label }}</strong>
              @if (entry.comment) {
                <blockquote>{{ entry.comment }}</blockquote>
              }
            </li>
          }
        </ol>
      }
    </section>
  `,
})
export class EditorialPanel {
  private readonly api = inject(Api);
  private readonly tasks = inject(PendingTasks);

  readonly entityType = input.required<PublishableEntity>();
  readonly entityId = input.required<string>();
  readonly state = input.required<string>();
  /** Emite el nuevo estado despues de una transicion. */
  readonly changed = output<string>();

  protected readonly transitions = signal<AvailableTransition[]>([]);
  protected readonly history = signal<ReviewEntry[]>([]);
  protected readonly loaded = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected comment = '';
  protected readonly action = actionLabel;

  protected readonly route = ROUTE;
  /** Paso actual de la ruta. Devuelto vuelve al primero; archivado queda fuera del camino. */
  protected readonly position = computed(() => {
    const state = this.state();
    return state === 'RETURNED' ? 0 : ROUTE.findIndex((step) => step.state === state);
  });
  protected readonly next = computed(() => NEXT[this.state()] ?? '');
  /** La ruta completa en una frase, para quien no la ve. */
  protected readonly routeLabel = computed(() => {
    const position = this.position();
    const current = label(this.state());
    if (position < 0) return `Ruta de publicación: ${current}, fuera del camino de ${ROUTE.length} pasos.`;
    return `Ruta de publicación: paso ${position + 1} de ${ROUTE.length}, ${current}.`;
  });

  constructor() {
    // Se recarga al cambiar de contenido o de estado: las acciones dependen de ambos.
    effect(() => {
      const [entityType, id, state] = [this.entityType(), this.entityId(), this.state()];
      this.tasks.run(() => this.load(entityType, id, state));
    });
  }

  protected isForward(transition: AvailableTransition): boolean {
    return !transition.requiresComment && FORWARD.includes(transition.to);
  }

  protected needsComment(): boolean {
    return this.transitions().some((transition) => transition.requiresComment);
  }

  private async load(entityType: PublishableEntity, id: string, _state: string): Promise<void> {
    try {
      const [transitions, history] = await Promise.all([
        this.api.transitions(entityType, id),
        this.api.history(entityType, id),
      ]);
      this.transitions.set(transitions);
      this.history.set(history);
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.loaded.set(true);
    }
  }

  protected apply(transition: AvailableTransition): void {
    this.tasks.run(() => this.run(transition));
  }

  private async run(transition: AvailableTransition): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    try {
      const { state } = await this.api.transition(this.entityType(), this.entityId(), transition.to, this.comment.trim());
      this.comment = '';
      this.changed.emit(state);
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }
}
