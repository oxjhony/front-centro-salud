# Centro Virtual de Salud Pública — Frontend

Portal web del Centro Virtual de Salud Pública, plataforma de articulación y gestión del conocimiento
para la Universidad de Caldas.

Proyecto Integrador II · Ingeniería de Sistemas · agosto–diciembre 2026

| | |
|---|---|
| **Backend** | [back-centro-salud](https://github.com/oxjhony/back-centro-salud) |
| **Equipo** | Juan Pablo Pulgarín ([@JuanIIDX](https://github.com/JuanIIDX)) · Jhony Alejandro Pérez ([@Oxjhony](https://github.com/Oxjhony)) |
| **Empresa aliada** | Universidad de Caldas |

---

## Qué resuelve

La Universidad presenta dispersión de experiencias, productos y recursos de salud pública entre
proyectos, grupos, cursos y territorios, lo que reduce la visibilidad del trabajo y dificulta
encontrar evidencia y oportunidades formativas.

Este portal es la cara visible de la solución: permite descubrir iniciativas y recursos, encontrar
oferta formativa, participar en consultas y administrar el flujo editorial.

---

## Stack

| Aspecto | Tecnología |
|---|---|
| Framework | Angular 21 · TypeScript |
| Renderizado | SSR — el proyecto se sirve como aplicación de servidor |
| Estilos | SCSS |
| Pruebas | Vitest · Playwright para recorridos críticos |

> **El renderizado en servidor está activo** (`outputMode: "server"` en `angular.json`). No es un sitio
> estático: se despliega como servidor Node. Se conserva así porque el objetivo del proyecto es
> *visibilizar* el trabajo en salud pública, y el renderizado en servidor mejora la indexación y la
> primera carga en conexiones limitadas.

---

## Requisitos previos

- Node.js 22 o superior
- El backend corriendo en `http://localhost:3000`

---

## Instalación

```bash
git clone https://github.com/oxjhony/front-centro-salud.git
cd front-centro-salud
npm install
```

### Variables de entorno

| Variable | Descripción | Ejemplo |
|---|---|---|
| `API_BASE_URL` | URL de la API | `http://localhost:3000` |
| `PORT` | Puerto del servidor SSR | `4000` |

---

## Ejecución

```bash
npm start                      # servidor de desarrollo en http://localhost:4200
npm run build                  # compilación de producción
npm run serve:ssr:centro-salud # servidor SSR sobre el build
npm run watch                  # compilación continua
```

---

## Pruebas

```bash
npm test                # unitarias con Vitest
npx playwright test     # recorridos críticos de extremo a extremo
```

Los cinco recorridos prioritarios deben tener prueba automatizada antes del cierre del proyecto:

| # | Recorrido |
|---|---|
| R1 | Descubrir conocimiento |
| R2 | Publicar una iniciativa |
| R3 | Encontrar formación |
| R4 | Participar en una consulta |
| R5 | Administrar el centro |

---

## Lineamientos de interfaz

No son preferencias de estilo: son requisitos verificables de la especificación.

- **Móvil primero.** Usable desde 360 px de ancho. Máximo dos niveles principales de menú.
- **Accesibilidad WCAG 2.2 nivel AA** en las vistas del MVP.
- **Navegación completa por teclado**, con foco visible y no oculto.
- **El color nunca es el único portador de información**: estados, errores y prioridades necesitan
  además texto o forma.
- **Estados explícitos** para borrador, en revisión, publicado, archivado y rechazado.
- **Formularios** con guardado de borrador, mensajes de error asociados al campo y confirmación antes
  de acciones críticas.
- **Estados vacíos comprensibles**: cuando no hay resultados, explicar por qué y qué hacer, nunca
  dejar la página en blanco.
- **Multimedia** con texto alternativo, subtítulos o transcripciones.
- **Lenguaje ciudadano.** Evitar tecnicismos o explicarlos cuando sean indispensables.

> La conformidad de accesibilidad **no se demuestra con una puntuación automática**. Requiere además
> verificación manual de teclado, foco, formularios y contraste, y pruebas con lector de pantalla en
> los recorridos críticos.

---

## Estructura

```
src/
├── app/
│   ├── core/       # servicios transversales, interceptores, guardas
│   ├── shared/     # componentes reutilizables
│   └── features/   # módulos por dominio
├── main.ts         # arranque del cliente
├── main.server.ts  # arranque del servidor
└── server.ts       # servidor Express para SSR
```

---

## Flujo de trabajo

Ramas cortas y solicitudes de cambio con revisión por pares.

```
main                 # siempre desplegable
└── tipo/H-nn-descripcion-corta
```

| Prefijo | Para |
|---|---|
| `feat/` | Funcionalidad nueva |
| `fix/` | Corrección |
| `chore/` | Configuración, dependencias, herramientas |
| `docs/` | Documentación |

Ejemplo: `feat/H-15-ficha-publica-iniciativa`

### Commits

```
tipo(alcance): descripción en imperativo

feat(buscador): agregar filtro por territorio
fix(a11y): corregir orden de foco en el formulario de iniciativa
```

### Solicitudes de cambio

Siendo un equipo de dos, **quien escribe no revisa**: toda rama se integra mediante solicitud de cambio
revisada por el otro integrante.

Una solicitud se puede integrar cuando:

- [ ] Está vinculada a una historia del backlog (`Closes #nn`)
- [ ] Las pruebas pasan
- [ ] Se verificó navegación por teclado y foco visible
- [ ] Se verificó en 360 px de ancho
- [ ] Los estados vacíos y de error están resueltos
- [ ] La revisó el otro integrante

---

## Documentación del proyecto

| Documento | Dónde |
|---|---|
| Especificación Ejecutable v1 | `Entregables/Semana-02/` |
| Product Backlog | `Entregables/Semana-02/` |
| Playbook de orquestación de IA | `Entregables/Semana-04/` |

La Especificación Ejecutable es la fuente de verdad del proyecto.
