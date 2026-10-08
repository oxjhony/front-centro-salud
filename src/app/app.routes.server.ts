import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * El portal publico se renderiza en el servidor en cada peticion: su contenido cambia cuando se
 * publica algo, y debe ser visible para buscadores y conexiones lentas. Las vistas con sesion se
 * renderizan en el navegador, que es donde vive la cookie.
 */
export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Server },
  { path: 'buscar', renderMode: RenderMode.Server },
  { path: 'iniciativas', renderMode: RenderMode.Server },
  { path: 'iniciativas/:id', renderMode: RenderMode.Server },
  { path: 'recursos', renderMode: RenderMode.Server },
  { path: 'recursos/:id', renderMode: RenderMode.Server },
  { path: 'cursos', renderMode: RenderMode.Server },
  { path: 'cursos/:id', renderMode: RenderMode.Server },
  { path: 'quienes-somos', renderMode: RenderMode.Server },
  { path: 'nuestro-equipo', renderMode: RenderMode.Server },
  { path: '**', renderMode: RenderMode.Client },
];
