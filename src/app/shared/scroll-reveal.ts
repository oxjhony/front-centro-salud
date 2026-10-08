import { afterNextRender, DestroyRef, Directive, ElementRef, inject } from '@angular/core';

/**
 * Lo que aparece al llegar a el: los bloques de primer nivel de cada pagina (secciones, titulos,
 * formularios, tablas) y los elementos de las cuadriculas de tarjetas, que entran en cadena.
 */
const TARGETS = 'main > * > *, .cards > li, .index-list > li, .pillars > div';

/** Lo que ya trae su propia animacion de aparicion (`appReveal`): no se anima dos veces. */
const SKIP = '[appreveal], .reveal';

/** Lo que tarda en terminar la transicion mas el turno de espera; despues el elemento recupera sus estilos. */
const SETTLE_MS = 1500;

/**
 * Al bajar el desplazamiento, cada bloque de la pagina sube y aparece al entrar en pantalla.
 * Se pone sobre el `<main>`: mira lo que ya esta y lo que llega despues (listas que cargan,
 * paginas nuevas del enrutador). Con «reducir movimiento» no oculta nada, y sin JavaScript
 * tampoco: la animacion es un extra, no una condicion para leer el contenido.
 */
@Directive({ selector: '[appScrollReveal]' })
export class ScrollReveal {
  constructor() {
    const root = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      const seen = new WeakSet<Element>();
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            observer.unobserve(entry.target);
            this.show(entry.target);
          }
        },
        // Un poco antes del borde inferior: el bloque ya empieza a subir cuando se asoma.
        { rootMargin: '0px 0px -6% 0px' },
      );

      const scan = () => {
        for (const element of root.querySelectorAll(TARGETS)) {
          if (seen.has(element) || element.closest(SKIP)) continue;
          seen.add(element);
          this.arm(element);
          observer.observe(element);
        }
      };

      // Solo cambios de estructura: poner o quitar clases aqui no dispara el vigilante.
      const mutations = new MutationObserver(scan);
      mutations.observe(root, { childList: true, subtree: true });
      scan();

      destroyRef.onDestroy(() => {
        observer.disconnect();
        mutations.disconnect();
      });
    });
  }

  /** Lo deja oculto y le asigna su turno entre sus hermanos (hasta 5, para que la cadena no se alargue). */
  private arm(element: Element): void {
    const index = element.parentElement ? Array.prototype.indexOf.call(element.parentElement.children, element) : 0;
    (element as HTMLElement).style.setProperty('--sr-i', String(Math.min(index, 5)));
    element.classList.add('sr');
  }

  private show(element: Element): void {
    element.classList.replace('sr', 'sr-in');
    // Terminada la entrada, el elemento vuelve a sus propios estilos (y a las transiciones de su hover).
    setTimeout(() => element.classList.remove('sr-in'), SETTLE_MS);
  }
}
