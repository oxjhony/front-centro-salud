import { breadcrumbsFor } from './breadcrumbs';

const labels = (url: string) => breadcrumbsFor(url).map((crumb) => crumb.label);

describe('breadcrumbsFor: dónde está la persona', () => {
  it('la portada no tiene migas', () => {
    expect(breadcrumbsFor('/')).toEqual([]);
    expect(breadcrumbsFor('/?q=salud')).toEqual([]);
  });

  it('un listado público cuelga del inicio y es la página actual', () => {
    expect(breadcrumbsFor('/cursos?tema=t1&pagina=2')).toEqual([
      { label: 'Inicio', link: '/' },
      { label: 'Cursos', link: null },
    ]);
  });

  it('una ficha enlaza de vuelta a su listado', () => {
    expect(breadcrumbsFor('/recursos/abc')).toEqual([
      { label: 'Inicio', link: '/' },
      { label: 'Recursos', link: '/recursos' },
      { label: 'Ficha del recurso', link: null },
    ]);
  });

  it('las vistas de gestión cuelgan de «Mi área»', () => {
    expect(labels('/mis-iniciativas')).toEqual(['Inicio', 'Mi área', 'Mis iniciativas']);
    expect(labels('/mis-iniciativas/nueva')).toEqual(['Inicio', 'Mi área', 'Mis iniciativas', 'Nueva iniciativa']);
    expect(labels('/mis-cursos/c-7')).toEqual(['Inicio', 'Mi área', 'Mis cursos', 'Editar ficha de curso']);
    expect(labels('/revision/resources/r-1')).toEqual(['Inicio', 'Mi área', 'Revisión', 'Revisar contenido']);
  });

  it('«Mi área» no se repite a sí misma', () => {
    expect(labels('/mi-area')).toEqual(['Inicio', 'Mi área']);
  });

  it('una ruta desconocida lo dice', () => {
    expect(labels('/no-existe')).toEqual(['Inicio', 'Página no encontrada']);
  });
});
