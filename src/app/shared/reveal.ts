import { afterNextRender, Component, computed, DestroyRef, Directive, ElementRef, inject, input, signal } from '@angular/core';

/**
 * Marca un bloque para que su texto aparezca al entrar en pantalla. Sin JavaScript (o sin
 * IntersectionObserver) el bloque no se oculta nunca: la animacion es un extra, no una condicion.
 */
@Directive({
  selector: '[appReveal]',
  host: { '[class.reveal]': 'armed()', '[class.visible]': 'visible()' },
})
export class Reveal {
  protected readonly armed = signal(false);
  protected readonly visible = signal(false);

  constructor() {
    const element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      if (!('IntersectionObserver' in window)) return;

      this.armed.set(true);
      const observer = new IntersectionObserver(
        (entries) => {
          if (!entries.some((entry) => entry.isIntersecting)) return;
          this.visible.set(true);
          observer.disconnect();
        },
        { threshold: 0.15 },
      );
      observer.observe(element);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }
}

/**
 * Texto que aparece palabra por palabra dentro de un bloque `appReveal`. El lector de pantalla
 * recibe la frase entera; las palabras sueltas son solo para la vista.
 */
@Component({
  selector: 'app-reveal-text',
  template: `<span class="visually-hidden">{{ text() }}</span
    ><span aria-hidden="true"
      >@for (word of words(); track $index) {<span class="word" [style.--i]="$index">{{ word }}</span
        >&ngsp;}</span
    >`,
})
export class RevealText {
  readonly text = input.required<string>();

  protected readonly words = computed(() => this.text().split(/\s+/).filter(Boolean));
}
