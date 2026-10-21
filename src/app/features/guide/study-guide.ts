import { Component, computed, ElementRef, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Api, errorMessage } from '../../core/api';
import { AuthService } from '../../core/auth';
import { GuideAnswer, GuideMode, GuideSource } from '../../core/models';
import { Icon } from '../../shared/icon';
import { LabelPipe } from '../../shared/labels';

interface ModeOption {
  value: GuideMode;
  label: string;
  icon: string;
  placeholder: string;
  starters: string[];
}

const MODES: ModeOption[] = [
  {
    value: 'ask',
    label: 'Preguntar',
    icon: 'message-circle-question',
    placeholder: 'Escribe tu pregunta, por ejemplo: ¿cómo se previene el dengue?',
    starters: ['¿Cómo se previene el dengue?', '¿Por qué es importante el lavado de manos?', '¿Qué es la vigilancia comunitaria en salud?'],
  },
  {
    value: 'explain',
    label: 'Explícame',
    icon: 'file-text',
    placeholder: 'Escribe el tema que quieres entender mejor',
    starters: ['Calidad del agua de consumo', 'Atención primaria en salud', 'Salud mental comunitaria'],
  },
  {
    value: 'quiz',
    label: 'Ponme a prueba',
    icon: 'list-checks',
    placeholder: 'Escribe el tema sobre el que quieres practicar',
    starters: ['Dengue', 'Lavado de manos', 'Vigilancia epidemiológica'],
  },
];

interface Message {
  id: number;
  from: 'student' | 'guide';
  mode: GuideMode;
  text: string;
  answer?: GuideAnswer;
  failed?: boolean;
}

const SOURCE_ROUTES: Record<GuideSource['type'], string> = {
  resources: '/recursos',
  initiatives: '/iniciativas',
  courses: '/cursos',
};

/**
 * Guia de estudio con IA (Especificacion v1.1, seccion 11). Responde solo con el material
 * publicado y siempre muestra de donde sale cada respuesta.
 */
@Component({
  selector: 'app-study-guide',
  imports: [FormsModule, RouterLink, Icon, LabelPipe],
  template: `
    <section class="guide">
      <header class="guide-head">
        <span class="orb" aria-hidden="true">
          <span class="ring"></span><span class="ring"></span>
          <app-icon name="sparkles" />
        </span>
        <div>
          <p class="eyebrow">Guía de estudio con IA</p>
          <h1>¿Qué quieres aprender hoy{{ firstName() ? ', ' + firstName() : '' }}?</h1>
          <p class="lead">Respuestas construidas solo con el material publicado en el portal, siempre con su fuente.</p>
        </div>
      </header>

      <fieldset class="modes">
        <legend class="visually-hidden">Cómo quieres estudiar</legend>
        @for (option of modes; track option.value) {
          <label class="mode" [class.selected]="mode() === option.value">
            <input type="radio" name="mode" [value]="option.value" [checked]="mode() === option.value" (change)="mode.set(option.value)" />
            <app-icon [name]="option.icon" />
            <span>{{ option.label }}</span>
          </label>
        }
      </fieldset>

      <div class="chat" #log role="log" aria-live="polite" aria-label="Conversación con la guía">
        @if (messages().length === 0) {
          <div class="welcome">
            <p class="welcome-title">Empieza por un tema del curso</p>
            <div class="starters">
              @for (starter of current().starters; track starter) {
                <button type="button" class="starter" (click)="send(starter)" [disabled]="busy()">
                  {{ starter }}<app-icon name="arrow-right" />
                </button>
              }
            </div>
          </div>
        }

        @for (message of messages(); track message.id) {
          @if (message.from === 'student') {
            <div class="msg msg-student">
              <span class="msg-mode">{{ modeLabel(message.mode) }}</span>
              <p>{{ message.text }}</p>
            </div>
          } @else {
            <article class="msg msg-guide" [class.failed]="message.failed">
              <span class="avatar" aria-hidden="true"><app-icon name="sparkles" /></span>
              <div class="msg-body">
                <p class="answer">{{ message.text }}</p>
                @if (message.answer; as answer) {
                  @if (answer.sources.length > 0) {
                    <p class="origin" [class.generated]="answer.generated">
                      {{ answer.generated ? 'Redactada con IA a partir del material' : 'Extractos del material publicado' }}
                    </p>
                    <h2 class="visually-hidden">Fuentes</h2>
                    <ol class="sources">
                      @for (source of answer.sources; track source.id; let i = $index) {
                        <li>
                          <a [routerLink]="[route(source), source.id]">
                            <span class="source-n">{{ i + 1 }}</span>
                            <span class="source-text">
                              <span class="source-type">{{ source.type | label }}</span>
                              <strong>{{ source.title }}</strong>
                            </span>
                            <app-icon name="arrow-up-right" />
                          </a>
                        </li>
                      }
                    </ol>
                  }
                }
              </div>
            </article>
          }
        }

        @if (busy()) {
          <div class="msg msg-guide thinking">
            <span class="avatar" aria-hidden="true"><app-icon name="sparkles" /></span>
            <div class="msg-body">
              <svg class="pulse" viewBox="0 0 120 24" aria-hidden="true">
                <path d="M0 12h34l6-9 8 18 7-15 5 6h60" />
              </svg>
              <p class="meta">Revisando el material…</p>
            </div>
          </div>
        }
      </div>

      <form class="composer" (ngSubmit)="send()">
        <label class="visually-hidden" for="guide-question">Tu mensaje para la guía</label>
        <textarea
          id="guide-question"
          name="question"
          rows="2"
          maxlength="500"
          [placeholder]="current().placeholder"
          [(ngModel)]="question"
          (keydown.enter)="onEnter($event)"
          [disabled]="busy()"
        ></textarea>
        <div class="composer-actions">
          @if (messages().length > 0) {
            <button type="button" class="secondary icon-only" (click)="reset()" [disabled]="busy()" title="Nueva conversación">
              <app-icon name="rotate-ccw" /><span class="visually-hidden">Nueva conversación</span>
            </button>
          }
          <button type="submit" class="send" [disabled]="busy() || question.trim().length < 3">
            <span>Enviar</span><app-icon name="send" />
          </button>
        </div>
      </form>
      <p class="meta fine">La guía solo usa material publicado y revisado en el portal. Comprueba cada respuesta en su fuente.</p>
    </section>
  `,
  styles: `
    :host {
      display: block;
    }

    .guide {
      max-width: 880px;
      margin: 0 auto;
    }

    /* --------------------------------------------------------------- Encabezado */
    .guide-head {
      display: flex;
      align-items: center;
      gap: 24px;
      margin-bottom: 28px;

      h1 {
        margin: 0 0 8px;
      }

      .lead {
        margin: 0;
      }
    }

    .orb {
      position: relative;
      flex: 0 0 auto;
      display: grid;
      place-items: center;
      width: 84px;
      height: 84px;
      border-radius: 50%;
      background: radial-gradient(circle at 30% 30%, var(--uc-esmeralda), var(--uc-verde-oscuro));
      color: var(--uc-dorado-vivo);

      .icon {
        width: 38px;
        height: 38px;
      }

      .ring {
        position: absolute;
        inset: 0;
        border: 2px solid var(--uc-dorado-vivo);
        border-radius: 50%;
        opacity: 0;
      }
    }

    /* ------------------------------------------------------------------- Modos */
    .modes {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin: 0 0 20px;
      padding: 0;
      border: 0;
    }

    .mode {
      position: relative;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      min-height: 44px;
      padding: 10px 20px;
      border: 1.5px solid var(--uc-borde-firme);
      border-radius: var(--uc-radio-pill);
      color: var(--uc-texto);
      font-weight: 600;
      cursor: pointer;
      transition:
        background-color var(--uc-mov-medio) var(--uc-curva),
        border-color var(--uc-mov-medio) var(--uc-curva),
        color var(--uc-mov-medio) var(--uc-curva);

      input {
        position: absolute;
        opacity: 0;
        pointer-events: none;
      }

      &:hover {
        border-color: var(--uc-esmeralda);
        background-color: var(--uc-menta-suave);
      }

      &:has(input:focus-visible) {
        outline: 3px solid var(--uc-foco);
        outline-offset: 2px;
      }

      &.selected {
        border-color: var(--uc-verde-principal);
        background-color: var(--uc-verde-principal);
        color: #ffffff;
        box-shadow: inset 0 -3px 0 var(--uc-dorado-vivo);
      }
    }

    /* ------------------------------------------------------------ Conversación */
    .chat {
      display: flex;
      flex-direction: column;
      gap: 18px;
      min-height: 320px;
      max-height: min(62vh, 640px);
      overflow-y: auto;
      padding: 24px;
      border-radius: var(--uc-radio-xl) var(--uc-radio-xl) 0 0;
      background:
        radial-gradient(circle at 100% 0, var(--uc-menta-tint), transparent 42%),
        var(--uc-superficie-alt);
      scroll-behavior: smooth;
    }

    .welcome {
      margin: auto 0;
      text-align: center;
    }

    .welcome-title {
      margin: 0 0 16px;
      font-family: var(--uc-fuente-titulos);
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--uc-verde-principal);
    }

    .starters {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 10px;
    }

    .starter {
      --btn-fondo: var(--uc-superficie);
      --btn-texto: var(--uc-verde-principal);
      --btn-borde: var(--uc-menta-borde);
      font-weight: 600;

      &:hover {
        --btn-fondo: var(--uc-menta-suave);
        --btn-texto: var(--uc-verde-principal);
        --btn-borde: var(--uc-esmeralda);
      }
    }

    .msg {
      max-width: 88%;

      p {
        margin: 0;
      }
    }

    .msg-student {
      align-self: flex-end;
      padding: 12px 18px;
      border-radius: var(--uc-radio-lg) var(--uc-radio-lg) var(--uc-radio-sm) var(--uc-radio-lg);
      background-color: var(--uc-verde-principal);
      color: #ffffff;
    }

    .msg-mode {
      display: block;
      margin-bottom: 2px;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: var(--uc-dorado-vivo);
    }

    .msg-guide {
      align-self: flex-start;
      display: flex;
      gap: 12px;
      align-items: flex-start;
    }

    .avatar {
      flex: 0 0 auto;
      display: grid;
      place-items: center;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background-color: var(--uc-verde-principal);
      color: var(--uc-dorado-vivo);
    }

    .msg-body {
      padding: 14px 18px;
      border: 1px solid var(--uc-borde);
      border-radius: var(--uc-radio-sm) var(--uc-radio-lg) var(--uc-radio-lg) var(--uc-radio-lg);
      background-color: var(--uc-superficie);
    }

    .failed .msg-body {
      border-color: var(--uc-peligro-borde);
      background-color: var(--uc-peligro-suave);
      color: var(--uc-peligro-texto);
    }

    .answer {
      line-height: 1.6;
    }

    .origin {
      display: inline-flex;
      margin-top: 12px !important;
      padding: 3px 12px;
      border-radius: var(--uc-radio-pill);
      background-color: var(--uc-menta-suave);
      color: var(--uc-verde-principal);
      font-size: 0.8rem;
      font-weight: 700;

      &.generated {
        background-color: var(--uc-dorado-suave);
        color: var(--uc-dorado-texto);
      }
    }

    .sources {
      display: grid;
      gap: 8px;
      margin: 12px 0 0;
      padding: 0;
      list-style: none;

      a {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 14px;
        border: 1px solid var(--uc-borde);
        border-radius: var(--uc-radio);
        color: var(--uc-texto);
        text-decoration: none;
        transition:
          border-color var(--uc-mov-medio) var(--uc-curva),
          transform var(--uc-mov-medio) var(--uc-curva);

        &:hover {
          border-color: var(--uc-esmeralda);
          transform: translateX(3px);
        }

        > .icon {
          margin-left: auto;
          color: var(--uc-esmeralda);
        }
      }
    }

    .source-n {
      flex: 0 0 auto;
      display: grid;
      place-items: center;
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background-color: var(--uc-dorado-suave);
      color: var(--uc-dorado-texto);
      font-size: 0.8rem;
      font-weight: 800;
    }

    .source-text {
      display: grid;
    }

    .source-type {
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--uc-texto-suave);
    }

    .thinking .msg-body {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .pulse {
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

    /* --------------------------------------------------------------- Redactar */
    .composer {
      display: flex;
      gap: 12px;
      align-items: flex-end;
      padding: 16px;
      border: 1.5px solid var(--uc-borde);
      border-top: 0;
      border-radius: 0 0 var(--uc-radio-xl) var(--uc-radio-xl);
      background-color: var(--uc-superficie);

      textarea {
        flex: 1 1 auto;
        min-height: 52px;
        max-height: 160px;
        resize: vertical;
        border-radius: var(--uc-radio-lg);
      }
    }

    .composer-actions {
      display: flex;
      gap: 8px;
    }

    .icon-only {
      padding: 10px 13px;
    }

    .fine {
      margin: 12px 0 0;
      font-size: 0.85rem;
      text-align: center;
    }

    @media (max-width: 600px) {
      .guide-head {
        align-items: flex-start;
        gap: 16px;
      }

      .orb {
        width: 60px;
        height: 60px;

        .icon {
          width: 28px;
          height: 28px;
        }
      }

      .chat {
        padding: 16px;
      }

      .msg {
        max-width: 100%;
      }

      .composer {
        flex-direction: column;
        align-items: stretch;

        .composer-actions {
          justify-content: flex-end;
        }
      }
    }

    /* --------------------------------------------------------------- Movimiento */
    @media (prefers-reduced-motion: no-preference) {
      .orb .ring {
        animation: ring 3.2s var(--uc-curva) infinite;
      }

      .orb .ring + .ring {
        animation-delay: 1.6s;
      }

      .orb > .icon {
        animation: glow 3.2s ease-in-out infinite;
      }

      .msg {
        animation: rise var(--uc-mov-lento) var(--uc-curva) both;
      }

      .sources li {
        animation: rise var(--uc-mov-lento) var(--uc-curva) both;
      }

      .sources li:nth-child(2) { animation-delay: 80ms; }
      .sources li:nth-child(3) { animation-delay: 160ms; }
      .sources li:nth-child(4) { animation-delay: 240ms; }

      .pulse path {
        stroke-dasharray: 150;
        animation: trace 1.4s linear infinite;
      }

      .thinking .avatar {
        animation: beat 1.4s ease-in-out infinite;
      }
    }

    @keyframes ring {
      0% { transform: scale(0.9); opacity: 0.7; }
      100% { transform: scale(1.55); opacity: 0; }
    }

    @keyframes glow {
      0%, 100% { transform: scale(1) rotate(0); }
      50% { transform: scale(1.12) rotate(8deg); }
    }

    @keyframes rise {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: none; }
    }

    @keyframes trace {
      from { stroke-dashoffset: 150; }
      to { stroke-dashoffset: -150; }
    }

    @keyframes beat {
      0%, 100% { transform: scale(1); }
      20% { transform: scale(1.12); }
      40% { transform: scale(0.97); }
    }
  `,
})
export class StudyGuide {
  private readonly api = inject(Api);
  private readonly auth = inject(AuthService);
  private readonly log = viewChild.required<ElementRef<HTMLElement>>('log');

  protected readonly modes = MODES;
  protected readonly mode = signal<GuideMode>('ask');
  protected readonly current = computed(() => MODES.find((option) => option.value === this.mode()) ?? MODES[0]);
  protected readonly messages = signal<Message[]>([]);
  protected readonly busy = signal(false);
  protected readonly firstName = computed(() => this.auth.user()?.displayName.split(/\s+/)[0] ?? '');

  protected question = '';
  private nextId = 1;

  protected modeLabel(mode: GuideMode): string {
    return MODES.find((option) => option.value === mode)?.label ?? '';
  }

  protected route(source: GuideSource): string {
    return SOURCE_ROUTES[source.type];
  }

  /** Enter envia; Mayus + Enter hace un salto de linea. */
  protected onEnter(event: Event): void {
    if ((event as KeyboardEvent).shiftKey) return;
    event.preventDefault();
    void this.send();
  }

  protected async send(text = this.question): Promise<void> {
    const question = text.trim();
    if (question.length < 3 || this.busy()) return;

    const mode = this.mode();
    this.question = '';
    this.push({ from: 'student', mode, text: question });
    this.busy.set(true);
    try {
      const answer = await this.api.askGuide(question, mode);
      this.push({ from: 'guide', mode, text: answer.answer, answer });
    } catch (error) {
      this.push({ from: 'guide', mode, text: errorMessage(error), failed: true });
    } finally {
      this.busy.set(false);
      this.scrollToEnd();
    }
  }

  protected reset(): void {
    this.messages.set([]);
    this.question = '';
  }

  private push(message: Omit<Message, 'id'>): void {
    this.messages.update((list) => [...list, { ...message, id: this.nextId++ }]);
    this.scrollToEnd();
  }

  /** La conversacion sigue al ultimo mensaje, como cualquier chat. */
  private scrollToEnd(): void {
    setTimeout(() => {
      const log = this.log().nativeElement;
      log.scrollTop = log.scrollHeight;
    });
  }
}
