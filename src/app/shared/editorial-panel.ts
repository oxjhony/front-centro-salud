import { DatePipe } from '@angular/common';
import { Component, effect, inject, input, output, PendingTasks, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Api, errorMessage } from '../core/api';
import { AvailableTransition, PublishableEntity, ReviewEntry } from '../core/models';
import { actionLabel, LabelPipe } from './labels';

/**
 * Estado editorial de un contenido: en que estado esta, que puede hacer con el la persona que lo
 * mira y que ha pasado antes. Sirve igual para iniciativas, recursos y cursos, y para autores y revisores:
 * las acciones disponibles las decide la API segun los permisos y la tabla de transiciones.
 */
@Component({
  selector: 'app-editorial-panel',
  imports: [FormsModule, DatePipe, LabelPipe],
  template: `
    <section aria-labelledby="editorial-title">
      <h2 id="editorial-title">Estado editorial</h2>
      <p>
        Estado actual: <span class="state" [attr.data-state]="state()">{{ state() | label }}</span>
      </p>

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

  constructor() {
    // Se recarga al cambiar de contenido o de estado: las acciones dependen de ambos.
    effect(() => {
      const [entityType, id, state] = [this.entityType(), this.entityId(), this.state()];
      this.tasks.run(() => this.load(entityType, id, state));
    });
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
