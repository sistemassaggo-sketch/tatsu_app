---
description: "Use when creating variables, functions, files, folders, pages, and project structure in a Next.js app. Enforces Spanish, descriptive names and standard Next.js conventions."
applyTo: ["**/*.ts","**/*.tsx","**/*.js","**/*.jsx","app/**","pages/**","components/**","src/**"]
---
# Convenciones de nomenclatura y estructura para Next.js

- Nombra todas las variables, funciones, constantes, hooks, componentes, páginas y archivos en español y con nombres autoexplicativos.
- Usa nombres breves pero claros; prioriza el significado por encima de la longitud.
- Evita abreviaturas ambiguas o nombres genéricos como `datos`, `item`, `valor`, `helper`.
- Usa nombres descriptivos según el dominio del proyecto y la responsabilidad real de cada elemento.

## Convenciones por tipo de elemento

### Archivos y carpetas
- Usa nombres en español y descriptivos.
- Para carpetas y archivos complejos, usa kebab-case: `configuracion-usuario`, `pagina-inicio`, `lista-productos`.
- Para componentes React, usa PascalCase: `VistaPerfilUsuario`, `FormularioInicioSesion`.
- Para variables, funciones y hooks, usa camelCase: `nombreUsuario`, `obtenerProductos`, `usarSesion`.
- Para constantes globales o configuraciones, usa mayúsculas con guion bajo: `API_BASE_URL`.

### Estructura recomendada en Next.js
- Mantén la estructura orientada a estándares de Next.js:
  - `app/` para App Router
  - `components/` para componentes reutilizables
  - `lib/` para utilidades y helpers de negocio
  - `services/` para integración con APIs o servicios
  - `hooks/` para hooks personalizados
  - `types/` para tipos TypeScript
  - `utils/` para funciones auxiliares
  - `styles/` para estilos globales o módulos
  - `public/` para assets estáticos
  - `context/` para contextos de estado
  - `constants/` para valores constantes
- Dentro de `app/`, usa rutas por dominio y objetivo: `app/inicio/page.tsx`, `app/perfil/editar/page.tsx`.
- Mantén nombres semánticos y evita carpetas genéricas como `misc`, `temp`, `nuevo`, `prueba1`.
- En App Router, usa `page.tsx`, `layout.tsx`, `loading.tsx`, `not-found.tsx` y `route.ts` cuando correspondan.
- Si el proyecto usa Pages Router, mantén `pages/` con rutas claras y descriptivas en español.

## Reglas de estilo

- Escribe nombres consistentes a lo largo del proyecto; si un recurso se llama `usuarios`, no se debe cambiar a `user` o `clients` en otra parte.
- No mezcles idiomas dentro de una misma capa del proyecto.
- Usa español como idioma base para conceptos del negocio, módulos, páginas y componentes.
- Usa nombres que expliquen la responsabilidad: `servicioAutenticacion`, `validacionFormulario`, `listaProductosActivos`.
- Para props, estados y parámetros, usa nombres que describan el dato y su función: `usuarioActivo`, `listaProductos`, `esFormularioValido`.
- Para archivos de servicio o lógica de negocio, usa nombres basados en la acción o el dominio: `servicio-autenticacion.ts`, `validacion-formulario.ts`.
- Para componentes visuales, usa nombres que indiquen lo que representan: `TarjetaResumen`, `CabeceraDashboard`, `MenuConfiguracion`.
- use the colors for the app it must be #EA5C25 as principal, now use #176B87 when a user focus on the page this is a event and use #000000 and #FFFFFF for backgrounds shadows and little style modifications

## Prohibiciones

- No crees archivos o carpetas con nombres vagos o genéricos.
- No mezcles español e inglés en la misma estructura, a menos que sea un nombre externo obligatorio por una librería, framework o servicio.
- No uses acrónimos innecesarios si hay un nombre más claro en español.
- No dejes nombres de prueba o temporales en producción: `temp`, `tmp`, `prueba`, `nuevo`, `example`.

## Resultado esperado

Cuando vayas a crear o modificar archivos, carpetas, variables, funciones o páginas, prioriza nombres claros, autoexplicativos y alineados con el estándar de Next.js en español.
