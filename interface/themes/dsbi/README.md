# Tema DSBI

Sistema de diseño de DatasetBI para OpenEMR. Se apoya en los mecanismos de
personalización existentes (temas, diseños de pestañas y diseños de login); no
modifica base de datos, lógica de negocio, permisos ni endpoints.

## Activación

En **Administration → Config** (requiere cerrar sesión y volver a entrar):

| Ajuste | Valor | Efecto |
|---|---|---|
| Appearance → General Theme | Dsbi | Colores, tipografía y componentes en todas las pantallas. |
| Appearance → Tabs Layout Theme | Dsbi | Menú lateral plegable y encabezado superior. Con "Full" queda el menú horizontal. |
| Login Page → Login Page Layout | Split, Presentation Panel on Left | Login en dos paneles. |

## Archivos nuevos

| Archivo | Contenido |
|---|---|
| `_tokens.scss` | Design tokens: color, tipografía, espaciado, radios, sombras. Único lugar con valores hexadecimales. |
| `_bootstrap-variables.scss` | Asigna los tokens a las variables de Bootstrap 4, para que los componentes se generen ya con el estilo. |
| `_base.scss` | Fuente DM Sans, variables CSS `--dsbi-*`, foco de teclado, estilos de documento. |
| `_components.scss` | Botones, formularios, tablas, DataTables, paginación, tarjetas, pestañas, modales, alertas, badges, breadcrumbs, estados vacíos y de carga. |
| `_shell.scss` | Layout con menú horizontal: encabezado, menú, búsqueda global, barra de paciente y pestañas. |
| `_topics.scss` | Patrón de secciones y temas para pantallas con mucha información: anatomía de sección, colores por tema clínico e íconos. |
| `_login.scss` | Estilos del login en dos paneles. |
| `_modules.scss` | Ajustes por pantalla, cada uno anclado al selector raíz de esa pantalla. |
| `../oe-styles/style_dsbi.scss` | Punto de entrada del tema general. |
| `../tabs_style_dsbi.scss` | Diseño de pestañas con menú lateral. |
| `interface/main/tabs/js/dsbi_sidebar.js` | Plegado del menú lateral y acordeón de submenús. Solo actúa con el diseño de pestañas Dsbi. |
| `templates/login/layouts/dsbi_split.html.twig` | Diseño de login; reutiliza los parciales originales del formulario. |

## Archivos existentes modificados

| Archivo | Cambio |
|---|---|
| `webpack.themes.js` | Entradas de compilación del tema (4 variantes) y del diseño de pestañas (2). |
| `package.json`, `package-lock.json` | Dependencia `@fontsource-variable/dm-sans`; la fuente se sirve desde `public/assets`, sin CDN. |
| `.stylelintignore` | Excluye estos SCSS, igual que el resto de los temas (la configuración del linter no interpreta Sass). |
| `library/globals.inc.php` | Una línea: registra el diseño de login en la lista de opciones. |
| `interface/main/tabs/main.php` | Una línea: carga `dsbi_sidebar.js`. |
| `templates/interface/main/tabs/menu_json.html.twig` | Expone `menu_id` en el modelo del menú. |
| `templates/interface/main/tabs/menu_template.html.twig` | Agrega `data-menu-id` y `data-menu-target` a cada entrada principal, para poder asignarle un ícono. |

## Imagen del login

El panel izquierdo usa un degradé. Para sumar una foto, guardarla como
`public/images/dsbi/login-hero.jpg` y definir en `_login.scss`:

```scss
$dsbi-login-hero-image: url("../images/dsbi/login-hero.jpg");
```

## Compilar

```bash
cd docker/development-easy
docker compose exec openemr /root/devtools build-themes
```

En Git Bash anteponer `MSYS_NO_PATHCONV=1`; en PowerShell funciona tal cual.

## Reglas

- Colores y tamaños nuevos se agregan en `_tokens.scss`, nunca sueltos en un componente.
- Si Bootstrap tiene una variable para el cambio, va en `_bootstrap-variables.scss`.
- Los ajustes de una pantalla van en `_modules.scss`, anclados a su selector raíz.
- Una pantalla densa se organiza en secciones; solo los temas clínicos (alertas, problemas, medicación, órdenes, mediciones) llevan color, el resto queda neutro.
- Los estados (éxito, advertencia, error) combinan color con otra señal: peso, borde o ícono.
- Cada par de color nuevo debe cumplir WCAG 2.2 AA: 4,5:1 en texto, 3:1 en bordes de campos y foco.
