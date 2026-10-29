# oe-module-dsbi: Dashboards y Asistente de turnos

Módulo propio de OpenEMR con dos pantallas de demostración:

| Pantalla | Qué muestra |
|---|---|
| **Tableros** (*Dashboards*) | Tablero de turnos y agendas: indicadores, turnos por mes según resultado, ocupación, carga diaria, demanda por día y horario, agendas de los próximos 7 días. Gráficos con ECharts. |
| **Asistente de turnos** (*Booking Assistant*) | Maqueta de un agente que da turnos por un chat estilo WhatsApp: paciente por DNI, especialidad, profesional, día y horario en los próximos 60 días, confirmación y cancelación. |

**Las dos son demos:** todos los datos se inventan en el navegador. No leen ni escriben
la base de datos, no crean tablas y recargar la página vuelve a empezar.

Probado en la imagen oficial `openemr/openemr:8.4.0` con el módulo montado `:ro`: instalación,
habilitación, SQL (dos corridas, sin duplicados), menú en castellano y en inglés, y las dos
pantallas de punta a punta, sin errores de PHP ni de consola.

## Qué toca y qué no

- **No modifica ningún archivo de OpenEMR.** Todo vive en esta carpeta.
- **Menú:** una sola entrada, **DatasetBI**, con **Tableros** y **Asistente de turnos**
  adentro, para no alargar la barra del menú. Se agrega por evento (`MenuEvent::MENU_UPDATE`)
  mientras el módulo está habilitado y aparece en cualquier menú, también en un menú propio
  como `clinica.json`, justo después de *Calendario* (o al final si el menú no lo tiene). No
  hace falta editar el menú. El nombre "DatasetBI" se cambia sin tocar código, en
  **Administración → Idioma → Definiciones** (constante `DatasetBI{{Menu}}`).
- **Números y fechas:** con el idioma *Spanish (Latin American)* se formatean como en
  Argentina (`3.960`, `81,4 %`).
- **Permiso:** el mismo que el calendario (`patients` / `appt`), en el menú y en cada pantalla.
- **ECharts 5.6.0** viene adentro (`public/vendor/echarts/`, licencia Apache 2.0 en esa
  carpeta). No depende de `public/assets` ni de `config.yaml`.
- **Diseño:** no depende de ningún tema. Cada pantalla define su paleta al principio de su CSS
  (`--dash-*` en `public/dashboards/dsbi_dashboards.css`, `--tur-*` en
  `public/turnos/dsbi_turnos.css`), así que se puede ajustar a otro tema cambiando esos valores.
  Si el tema publica variables `--dsbi-*`, las toma de ahí.
- **Textos:** en inglés en el código y traducidos por OpenEMR con `xl()`. Cada texto lleva un
  contexto (`'Provider{{Booking assistant}}'`, `'Schedule{{Dashboards}}'`), así nunca choca con
  la traducción estándar de la misma palabra (por ejemplo, *Profesional* y no *Proveedor*).
  El castellano está en `sql/traducciones_dsbi.sql`.

## Estructura

```
oe-module-dsbi/
├── info.txt                  nombre que muestra el Module Manager
├── openemr.bootstrap.php     agrega la entrada DatasetBI al menú
├── public/
│   ├── i18n.php              locale de la sesión para fechas y números
│   ├── dashboards/           index.php, strings.php, JS y CSS
│   ├── turnos/               index.php, strings.php, JS y CSS
│   └── vendor/echarts/       echarts.min.js 5.6.0 + LICENSE y NOTICE
└── sql/
    └── traducciones_dsbi.sql textos en castellano (Spanish (Latin American))
```

## Instalación en el repo de la clínica (`openemr-oficial`)

Sigue el procedimiento del repo: montaje por Docker, SQL corrido a mano, fila en
`OVERRIDES.md`. Antes de empezar: **backup de la base**.

### 1. Copiar la carpeta

Copiar `oe-module-dsbi/` a una carpeta propia del repo, fuera de `openemr-master/` (que está
ignorada por git), por ejemplo:

```
openemr-oficial/modulos/oe-module-dsbi/
```

y el SQL junto a los demás scripts:

```
openemr-oficial/overrides/sql/traducciones_dsbi.sql
```

### 2. Montaje en local

En `openemr-master/docker/production/docker-compose-local.yml`, dentro de `volumes:` del
servicio de OpenEMR:

```yaml
      # módulo DSBI: Dashboards y Asistente de turnos (carpeta entera, solo lectura)
      - ../../../modulos/oe-module-dsbi:/var/www/localhost/htdocs/openemr/interface/modules/custom_modules/oe-module-dsbi:ro
```

Recrear el contenedor (con `-p openemr-nuevo`, si no, Docker arma otro proyecto con otra base):

```powershell
docker compose -p openemr-nuevo -f docker-compose-local.yml up -d
```

### 3. Habilitar el módulo

En OpenEMR: **Administración → Módulos → Administrar módulos**. En 8.4.0 el módulo aparece
solo en *Custom Module Listings* como *DSBI Dashboards and Booking Assistant*, estado
**Registrado**: botón **Instalar** y después **Habilitar**. (Si en otra versión aparece sin
registrar, primero **Register**.)

Esto escribe una fila en la tabla `modules`; no crea tablas. Las entradas del menú aparecen al
volver a iniciar sesión.

### 4. Traducciones

```powershell
docker exec -i openemr-nuevo-openemr-1 sh -c 'mariadb -h mysql -u root -p"$MYSQL_ROOT_PASS" openemr' < overrides/sql/traducciones_dsbi.sql
```

El script es idempotente: solo inserta lo que falta y no pisa traducciones ya corregidas.
Si después se corrige algún texto en **Administración → Idioma → Definiciones**, entra en
`lang_custom.sql` con `scripts/exportar-traducciones.ps1`, como el resto.

### 5. Verificar

Cerrar sesión y volver a entrar: después de *Calendario* aparece **DatasetBI**, con
**Tableros** y **Asistente de turnos** adentro. Abrir las dos y revisar `docker logs --since 10m openemr-nuevo-openemr-1`.

### 6. Anotar en `OVERRIDES.md`

Fila sugerida (es un módulo propio: no reemplaza nada, `check-upgrade.ps1` lo ve como PROPIO):

| Archivo | Ruta en OpenEMR | Cambio | Qué hace |
|---|---|---|---|
| `modulos/oe-module-dsbi/` | `interface/modules/custom_modules/oe-module-dsbi/` | Carpeta nueva (módulo propio, montaje `:ro`) | Tableros y Asistente de turnos (demos, sin base). Menú por evento, se habilita en Administrar módulos. |

Y en la sección de SQL: `overrides/sql/traducciones_dsbi.sql`, textos en castellano del módulo.

### Commit sugerido (reglas del repo: en `main`, en castellano, archivos por ruta)

```powershell
git add modulos/oe-module-dsbi overrides/sql/traducciones_dsbi.sql openemr-master/docker/production/docker-compose-local.yml OVERRIDES.md
git diff --cached
git commit -m "Agrega el módulo DSBI con Tableros y Asistente de turnos (demos sin base)"
```

## Despliegue en el servidor

1. Bundle de `main`, copiarlo y `git pull --ff-only ~/openemr-main.bundle main` (paso a paso
   habitual del repo), con backup de la base antes.
2. Agregar **a mano** el montaje en `~/openemr/docker-compose.yml` (el del servidor usa rutas
   `./`):
   ```yaml
         - ./modulos/oe-module-dsbi:/var/www/localhost/htdocs/openemr/interface/modules/custom_modules/oe-module-dsbi:ro
   ```
   y recrear: `docker compose up -d`.
3. Habilitar el módulo en **Administrar módulos** (Instalar → Habilitar).
4. Correr el SQL en `openemr-db`:
   ```sh
   docker exec -i openemr-db sh -c 'mariadb -u root -p"$MYSQL_ROOT_PASSWORD" openemr' < overrides/sql/traducciones_dsbi.sql
   ```
5. Verificar en el sitio y en `docker logs --since 10m openemr-app`.

## Quitarlo

1. **Administrar módulos** → *Disable* (las entradas del menú desaparecen al volver a entrar).
2. Sacar el montaje del compose y recrear el contenedor.
3. Las traducciones pueden quedar: no afectan nada. Para borrarlas, eliminar de
   `lang_definitions` / `lang_constants` las constantes que terminan en `{{Booking assistant}}`
   y `{{Dashboards}}`.

Si se saca el montaje sin deshabilitar antes, OpenEMR no encuentra el bootstrap y deshabilita
el módulo solo, sin romper el resto.

## Agregar o cambiar un texto

1. Escribirlo en inglés en `index.php` (`$tt('...')` / `$ta('...')`) o en el JS (`xl('...')`).
2. Agregarlo en el `strings.php` de esa pantalla con su contexto:
   `'New text' => xl('New text{{Booking assistant}}'),`.
3. Agregar su fila en castellano a `sql/traducciones_dsbi.sql` (en las dos listas) y volver a
   correr el script.

Los saltos de línea dentro de un texto van como `{br}`, porque `xl()` los convierte en espacios.
