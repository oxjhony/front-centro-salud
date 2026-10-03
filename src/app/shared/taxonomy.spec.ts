import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Term } from '../core/models';
import { TermPicker, termsOfType } from './taxonomy';

const TERMS: Term[] = [
  { id: 'caldas', name: 'Caldas', type: 'TERRITORY', parentId: null, active: true },
  { id: 'manizales', name: 'Manizales', type: 'TERRITORY', parentId: 'caldas', active: true },
  { id: 'aps', name: 'Atención primaria', type: 'THEME', parentId: null, active: true },
  { id: 'riosucio', name: 'Riosucio', type: 'TERRITORY', parentId: 'caldas', active: true },
];

describe('taxonomía', () => {
  it('ordena los términos de un tipo con cada padre seguido de sus hijos', () => {
    expect(termsOfType(TERMS, 'TERRITORY').map((t) => [t.name, t.depth])).toEqual([
      ['Caldas', 0],
      ['Manizales', 1],
      ['Riosucio', 1],
    ]);
  });

  it('un hijo cuyo padre no está en la lista se muestra en la raíz, no desaparece', () => {
    const orphan = [{ ...TERMS[1], parentId: 'inactivo' }];
    expect(termsOfType(orphan, 'TERRITORY').map((t) => t.name)).toEqual(['Manizales']);
  });

  describe('selector de términos', () => {
    @Component({
      imports: [TermPicker],
      template: `<app-term-picker [terms]="terms" [types]="['THEME', 'TERRITORY']" [(selected)]="selected" />`,
    })
    class Host {
      terms = TERMS;
      selected = signal<string[]>(['aps']);
    }

    it('agrupa por tipo con una leyenda, marca lo elegido y actualiza la selección', async () => {
      const fixture = TestBed.createComponent(Host);
      await fixture.whenStable();
      const element = fixture.nativeElement as HTMLElement;

      expect([...element.querySelectorAll('legend')].map((l) => l.textContent?.trim())).toEqual(['Temas', 'Territorios']);
      const boxes = [...element.querySelectorAll('input[type="checkbox"]')] as HTMLInputElement[];
      expect(boxes.map((b) => b.checked)).toEqual([true, false, false, false]);

      boxes[2].click(); // Manizales
      boxes[0].click(); // desmarca Atención primaria
      await fixture.whenStable();

      expect(fixture.componentInstance.selected()).toEqual(['manizales']);
    });
  });
});
