import { isPlatformServer } from '@angular/common';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable, InjectionToken, makeStateKey, PLATFORM_ID, TransferState } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  AuditRecord,
  AvailableTransition,
  Catalogs,
  CourseDetail,
  CourseInput,
  CourseSummary,
  GuideAnswer,
  GuideMode,
  InitiativeDetail,
  InitiativeInput,
  InitiativeSummary,
  IntegrationLogRecord,
  NotificationRecord,
  Page,
  Profile,
  ProfileInput,
  PublicCourse,
  PublicInitiative,
  PublicResource,
  PublicResourceSummary,
  PublishableEntity,
  QueueItem,
  ReconciliationSummary,
  RelatedContent,
  ResourceDetail,
  ResourceInput,
  ResourceSummary,
  ReviewEntry,
  RoleSummary,
  SearchHit,
  SessionUser,
  TaxonomyType,
  TermAdmin,
  UserStatus,
  UserSummary,
} from './models';

const DEFAULT_API_URL = 'http://localhost:3001';
const API_URL_KEY = makeStateKey<string>('apiBaseUrl');

/**
 * URL de la API. En el servidor sale de la variable de entorno API_BASE_URL y viaja al navegador
 * dentro de la pagina renderizada, para que ambos lados usen la misma sin recompilar.
 */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => {
    const state = inject(TransferState);
    if (isPlatformServer(inject(PLATFORM_ID))) {
      // `process` solo existe en el servidor Node; se lee asi para no depender de sus tipos en el navegador.
      const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
      const url = (env['API_BASE_URL'] ?? DEFAULT_API_URL).replace(/\/+$/, '');
      state.set(API_URL_KEY, url);
      return url;
    }
    return state.get(API_URL_KEY, DEFAULT_API_URL);
  },
});

type Query = Record<string, string | number | null | undefined>;

/** Mensaje para mostrar al usuario a partir de un error de la API. */
export function errorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) return 'No fue posible conectar con el servidor. Intenta de nuevo en un momento.';
    if (error.status === 413) return 'El archivo supera el tamaño máximo permitido.';
    const message = error.error?.message;
    if (Array.isArray(message)) return message.join(' ');
    if (typeof message === 'string') return message;
  }
  return 'Ocurrió un error inesperado.';
}

/** Cliente de la API del backend: un metodo por operacion, sin logica de presentacion. */
@Injectable({ providedIn: 'root' })
export class Api {
  private readonly http = inject(HttpClient);
  readonly base = inject(API_BASE_URL);

  private get<T>(path: string, query: Query = {}): Promise<T> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== null && value !== undefined && value !== '') params = params.set(key, value);
    }
    return firstValueFrom(this.http.get<T>(this.base + path, { params }));
  }

  private post<T>(path: string, body: unknown = {}): Promise<T> {
    return firstValueFrom(this.http.post<T>(this.base + path, body));
  }

  private put<T>(path: string, body: unknown): Promise<T> {
    return firstValueFrom(this.http.put<T>(this.base + path, body));
  }

  private delete<T>(path: string): Promise<T> {
    return firstValueFrom(this.http.delete<T>(this.base + path));
  }

  // --- Sesion y cuenta
  me = () => this.get<{ user: SessionUser | null }>('/auth/me').then((r) => r.user);
  login = (email: string, password: string) =>
    this.post<{ user: SessionUser }>('/auth/login', { email, password }).then((r) => r.user);
  logout = () => this.post<void>('/auth/logout');
  profile = () => this.get<Profile>('/me/profile');
  updateProfile = (input: ProfileInput) => this.put<Profile>('/me/profile', input);
  clearOptionalData = () => this.delete<Profile>('/me/profile/optional-data');
  notifications = () => this.get<{ items: NotificationRecord[]; unread: number }>('/me/notifications');
  markNotificationRead = (id: string) => this.post<void>(`/me/notifications/${id}/read`);
  markAllNotificationsRead = () => this.post<void>('/me/notifications/read-all');

  // --- Guia de estudio con IA
  askGuide = (question: string, mode: GuideMode) => this.post<GuideAnswer>('/study-guide/ask', { question, mode });

  // --- Portal publico
  catalogs = () => this.get<Catalogs>('/catalogs');
  search = (query: Query) => this.get<Page<SearchHit>>('/public/search', query);
  publicInitiatives = (query: Query) => this.get<Page<InitiativeSummary>>('/public/initiatives', query);
  publicInitiative = (id: string) => this.get<PublicInitiative>(`/public/initiatives/${id}`);
  publicResources = (query: Query) => this.get<Page<PublicResourceSummary>>('/public/resources', query);
  publicResource = (id: string) => this.get<PublicResource>(`/public/resources/${id}`);
  publicCourses = (query: Query) => this.get<Page<PublicCourse>>('/public/courses', query);
  publicCourse = (id: string) => this.get<PublicCourse>(`/public/courses/${id}`);

  /** Las descargas son enlaces directos: el navegador envia la cookie de sesion si la hay. */
  publicDownloadUrl = (id: string) => `${this.base}/public/resources/${id}/download`;
  versionDownloadUrl = (id: string, versionId: string) => `${this.base}/resources/${id}/versions/${versionId}/download`;

  // --- Iniciativas (autor)
  myInitiatives = () => this.get<InitiativeSummary[]>('/initiatives/mine');
  initiative = (id: string) => this.get<InitiativeDetail>(`/initiatives/${id}`);
  createInitiative = (input: InitiativeInput) => this.post<{ id: string }>('/initiatives', input);
  updateInitiative = (id: string, input: InitiativeInput) => this.put<void>(`/initiatives/${id}`, input);

  // --- Recursos (autor y gestor academico)
  myResources = () => this.get<ResourceSummary[]>('/resources/mine');
  linkableResources = () => this.get<RelatedContent[]>('/resources/linkable');
  resource = (id: string) => this.get<ResourceDetail>(`/resources/${id}`);
  createResource = (input: ResourceInput) => this.post<{ id: string }>('/resources', input);
  updateResource = (id: string, input: ResourceInput) => this.put<void>(`/resources/${id}`, input);
  uploadVersion = (id: string, file: File) => {
    const form = new FormData();
    form.append('file', file, file.name);
    return this.post<ResourceDetail>(`/resources/${id}/versions`, form);
  };

  // --- Cursos (gestor academico)
  myCourses = () => this.get<CourseSummary[]>('/courses/mine');
  course = (id: string) => this.get<CourseDetail>(`/courses/${id}`);
  createCourse = (input: CourseInput) => this.post<CourseDetail>('/courses', input);
  updateCourse = (id: string, input: CourseInput) => this.put<CourseDetail>(`/courses/${id}`, input);
  verifyCourseLink = (id: string) => this.post<CourseDetail>(`/courses/${id}/verify-link`);

  // --- Flujo editorial
  reviewQueue = () => this.get<QueueItem[]>('/editorial/queue');
  transitions = (entity: PublishableEntity, id: string) =>
    this.get<AvailableTransition[]>(`/editorial/${entity}/${id}/transitions`);
  history = (entity: PublishableEntity, id: string) => this.get<ReviewEntry[]>(`/editorial/${entity}/${id}/history`);
  transition = (entity: PublishableEntity, id: string, to: string, comment?: string) =>
    this.post<{ state: string }>(`/editorial/${entity}/${id}/transitions`, { to, comment: comment || undefined });

  // --- Administracion
  users = () => this.get<UserSummary[]>('/admin/users');
  roles = () => this.get<RoleSummary[]>('/admin/roles');
  assignRoles = (userId: string, roles: string[]) => this.put<void>(`/admin/users/${userId}/roles`, { roles });
  setUserStatus = (userId: string, status: UserStatus) => this.put<void>(`/admin/users/${userId}/status`, { status });
  taxonomy = (type?: TaxonomyType) => this.get<TermAdmin[]>('/admin/taxonomy', { type });
  createTerm = (input: { type: TaxonomyType; name: string; parentId: string | null }) =>
    this.post<TermAdmin>('/admin/taxonomy', input);
  updateTerm = (id: string, input: { name: string; parentId: string | null; active: boolean }) =>
    this.put<TermAdmin>(`/admin/taxonomy/${id}`, input);
  deleteTerm = (id: string) => this.delete<void>(`/admin/taxonomy/${id}`);
  audits = (query: Query = {}) => this.get<Page<AuditRecord>>('/admin/audits', query);
  integrationLogs = (query: Query = {}) => this.get<Page<IntegrationLogRecord>>('/admin/integration-logs', query);
  reconcileMoodle = () => this.post<ReconciliationSummary>('/admin/moodle/reconcile');
}
