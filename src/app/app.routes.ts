import { Routes } from '@angular/router';
import { requirePermission, requireSession } from './core/auth';
import { ADMIN_PERMISSIONS, Permission } from './core/models';

const SITE = 'Centro Virtual de Salud Pública';

export const routes: Routes = [
  // --- Portal publico: sin sesion
  { path: '', title: SITE, loadComponent: () => import('./features/home/home').then((m) => m.Home) },
  {
    path: 'buscar',
    title: `Buscar · ${SITE}`,
    loadComponent: () => import('./features/search/search-page').then((m) => m.SearchPage),
  },
  {
    path: 'iniciativas',
    title: `Iniciativas · ${SITE}`,
    loadComponent: () => import('./features/initiatives/initiative-list').then((m) => m.InitiativeList),
  },
  {
    path: 'iniciativas/:id',
    title: `Iniciativa · ${SITE}`,
    loadComponent: () => import('./features/initiatives/initiative-detail').then((m) => m.InitiativeDetailPage),
  },
  {
    path: 'recursos',
    title: `Recursos · ${SITE}`,
    loadComponent: () => import('./features/resources/resource-list').then((m) => m.ResourceList),
  },
  {
    path: 'recursos/:id',
    title: `Recurso · ${SITE}`,
    loadComponent: () => import('./features/resources/resource-detail').then((m) => m.ResourceDetailPage),
  },
  {
    path: 'cursos',
    title: `Cursos · ${SITE}`,
    loadComponent: () => import('./features/courses/course-catalog').then((m) => m.CourseCatalog),
  },
  {
    path: 'cursos/:id',
    title: `Curso · ${SITE}`,
    loadComponent: () => import('./features/courses/course-detail').then((m) => m.CourseDetailPage),
  },
  {
    path: 'quienes-somos',
    title: `Quiénes somos · ${SITE}`,
    loadComponent: () => import('./features/about/about').then((m) => m.About),
  },
  {
    path: 'nuestro-equipo',
    title: `Nuestro equipo · ${SITE}`,
    loadComponent: () => import('./features/about/team').then((m) => m.Team),
  },
  {
    path: 'ingresar',
    title: `Ingresar · ${SITE}`,
    loadComponent: () => import('./features/auth/login').then((m) => m.Login),
  },

  // --- Cualquier persona con sesion (area personal, como el tablero de Moodle)
  {
    path: 'mi-area',
    title: `Mi área · ${SITE}`,
    canActivate: [requireSession()],
    loadComponent: () => import('./features/account/dashboard').then((m) => m.Dashboard),
  },
  {
    path: 'mi-perfil',
    title: `Mi perfil · ${SITE}`,
    canActivate: [requireSession()],
    loadComponent: () => import('./features/account/profile').then((m) => m.ProfilePage),
  },
  {
    path: 'notificaciones',
    title: `Notificaciones · ${SITE}`,
    canActivate: [requireSession()],
    loadComponent: () => import('./features/account/notifications').then((m) => m.NotificationsPage),
  },

  // --- Estudiante
  {
    path: 'guia-ia',
    title: `Guía de estudio con IA · ${SITE}`,
    canActivate: [requirePermission(Permission.StudyGuide)],
    loadComponent: () => import('./features/guide/study-guide').then((m) => m.StudyGuide),
  },

  // --- Autor
  {
    path: 'mis-iniciativas',
    title: `Mis iniciativas · ${SITE}`,
    canActivate: [requirePermission(Permission.InitiativeManage)],
    loadComponent: () => import('./features/initiatives/my-initiatives').then((m) => m.MyInitiatives),
  },
  {
    path: 'mis-iniciativas/nueva',
    title: `Nueva iniciativa · ${SITE}`,
    canActivate: [requirePermission(Permission.InitiativeManage)],
    loadComponent: () => import('./features/initiatives/initiative-form').then((m) => m.InitiativeForm),
  },
  {
    path: 'mis-iniciativas/:id',
    title: `Editar iniciativa · ${SITE}`,
    canActivate: [requirePermission(Permission.InitiativeManage)],
    loadComponent: () => import('./features/initiatives/initiative-form').then((m) => m.InitiativeForm),
  },
  {
    path: 'mis-recursos',
    title: `Mis recursos · ${SITE}`,
    canActivate: [requirePermission(Permission.ResourceManage)],
    loadComponent: () => import('./features/resources/my-resources').then((m) => m.MyResources),
  },
  {
    path: 'mis-recursos/nuevo',
    title: `Nuevo recurso · ${SITE}`,
    canActivate: [requirePermission(Permission.ResourceManage)],
    loadComponent: () => import('./features/resources/resource-form').then((m) => m.ResourceForm),
  },
  {
    path: 'mis-recursos/:id',
    title: `Editar recurso · ${SITE}`,
    canActivate: [requirePermission(Permission.ResourceManage)],
    loadComponent: () => import('./features/resources/resource-form').then((m) => m.ResourceForm),
  },

  // --- Gestor academico
  {
    path: 'mis-cursos',
    title: `Mis cursos · ${SITE}`,
    canActivate: [requirePermission(Permission.CourseManage)],
    loadComponent: () => import('./features/courses/my-courses').then((m) => m.MyCourses),
  },
  {
    path: 'mis-cursos/nuevo',
    title: `Nueva ficha de curso · ${SITE}`,
    canActivate: [requirePermission(Permission.CourseManage)],
    loadComponent: () => import('./features/courses/course-form').then((m) => m.CourseForm),
  },
  {
    path: 'mis-cursos/:id',
    title: `Editar ficha de curso · ${SITE}`,
    canActivate: [requirePermission(Permission.CourseManage)],
    loadComponent: () => import('./features/courses/course-form').then((m) => m.CourseForm),
  },

  // --- Revisor
  {
    path: 'revision',
    title: `Bandeja de revisión · ${SITE}`,
    canActivate: [requirePermission(Permission.ContentReview)],
    loadComponent: () => import('./features/review/review-queue').then((m) => m.ReviewQueue),
  },
  {
    path: 'revision/:entityType/:id',
    title: `Revisar contenido · ${SITE}`,
    canActivate: [requirePermission(Permission.ContentReview)],
    loadComponent: () => import('./features/review/review-detail').then((m) => m.ReviewDetail),
  },

  // --- Administracion
  {
    path: 'administracion',
    title: `Administración · ${SITE}`,
    canActivate: [requirePermission(...ADMIN_PERMISSIONS)],
    loadComponent: () => import('./features/admin/admin').then((m) => m.Admin),
  },

  { path: '**', title: `Página no encontrada · ${SITE}`, loadComponent: () => import('./features/home/not-found').then((m) => m.NotFound) },
];
