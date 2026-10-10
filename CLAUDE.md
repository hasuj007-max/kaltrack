# KalTrack

Contador de calorías, peso, medidas y pesas. Es la app personal del usuario, instalada en su iPhone (PWA). Habla en español sencillo y usa kg/cm. Al explicar algo, usa términos simples y un ejemplo con números.

## Archivos
- `index.html`: toda la app (~3,200 líneas, 205 KB). **No lo leas completo.** Busca la sección con `grep -n "/\* =\+ " index.html`. Las secciones son DATOS, GUARDADO COMPACTO, ESTADO, INICIO, COMIDA, EJERCICIO, PESO, GRÁFICAS, PROGRESO, BALANCE DEL DÍA, MEDIDAS, FUERZA, AJUSTES, RESPALDO, ONBOARDING, NUBE y RENDER GLOBAL. Lee solo ese rango. El `<script type="module">` del final solo hace la conexión con Firebase y expone `window.Nube`.
- `sw.js` (caché `kaltrack-v4`), `manifest.webmanifest`, los íconos y `ex/` (fotos de ejercicios de free-exercise-db, dominio público).
- `firebase.json`, `firestore.rules` y `.firebaserc` (proyecto `kaltrack-app`).
- `.claude/agents/coach-kaltrack.md`: el subagente coach. Analiza un respaldo con `.claude/coach/analizar.mjs`.
- `.claude/sim/`: el simulador de 3 años de uso (datos de prueba).
- `respaldos/`: respaldos reales del usuario. Están ignorados por git y Firebase, y nunca se suben ni se copian a otro lado.

## Publicar (solo cuando el usuario diga "publícalo", cada vez)
1. `firebase deploy --only hosting --project kaltrack-app` publica la app real en https://kaltrack-app.firebaseapp.com.
2. `git push origin main` sube a github.com/hasuj007-max/kaltrack (público a propósito). Su GitHub Pages solo muestra el aviso "KalTrack se mudó": con `OLD_HOST` ahí no se carga Firebase.
3. Verifica dos cosas:
   - `curl -s "https://kaltrack-app.firebaseapp.com/?cb=$RANDOM" | grep -c "<algo nuevo>"` encuentra el cambio.
   - `/.git/HEAD` y `/.claude/agents/coach-kaltrack.md` dan 404. `**/.*` NO excluye el contenido de las carpetas ocultas, por eso existen las reglas `**/.*/**`, `.git/**` y `.claude/**`.
- El iPhone toma el cambio al cerrar la app por completo y abrirla con internet. El SW es "red primero", y el HTML y `sw.js` van con no-cache.
- iOS solo toma un ícono nuevo si se vuelve a agregar la app a Inicio.

## Probar
- Usa `preview_start "contador-calorias"` (puerto 8742). Si el servidor se apaga, el SW sirve la copia vieja y parece que el cambio no se aplicó.
- **Nunca inicies sesión real de Google**, ni en el preview ni en el simulador, y nunca escribas credenciales. Sin sesión, la nube no corre.
- Datos de prueba: en el preview carga `/.claude/sim/sim3y.js` con un `<script>` y luego corre `SIM3Y(FOODS, LIB_BY, dkey(today()))`. Devuelve `{DB}`: asígnalo a `DB` y llama `migrate()`, `save()` y `renderAll()`. Solo en el preview sin sesión.
- Para el coach, `node .claude/sim/run3y.js <scratchpad>/sim.json` genera un respaldo simulado.
- Simulador iOS: iPhone 17 Pro, `AF6EF2A3-7FD6-48FA-8FD3-B19235F97A6A`.
  - Para instalar la app: Safari → `http://localhost:8742` → ••• → Compartir → Ver más → Agregar a Inicio.
  - Para recargar la app instalada: `xcrun simctl terminate <udid> com.apple.webapp`.
- El viewport del preview es más corto que el real. Para tocar la barra de abajo usa clicks por JS.

## Datos (localStorage `kaltrack_v1`)
- La estructura de `DB`:
  ```
  DB = {goals:{cal,p,c,f,burn}, profile:{weight,target,age,height,sex,act,goalType,steps,sleepH},
        logs:{'AAAA-MM-DD':{foods:[], ex:[]}}, weights:[{d,kg}], measures:[{d,leg,bic,chest,waist}],
        lifts:[{id,ex,d,sets:[{kg,reps}]}], customFoods, customEx, liftEx, favs, recents, celebratedDays, exAdd, onboarded}
  ```
- Cada comida es `{n,e,portion,qty,meal,fid,kcal,p,c,f,grams,unit}`. `qty` es un múltiplo de la porción y `grams` solo existe si se capturó en gramos.
- Se guarda compacto con `packDB`/`unpackDB`, porque Safari limita localStorage a ~2.6 M caracteres cuando hay emoji (3 años de uso ocupan 0.87 M). `save()` tiene try/catch con alerta y banner. En memoria y en el respaldo exportado los datos van completos.
- Reasigna `DB.goals` siempre con `Object.assign({}, DB.goals, …)`. Si no, se pierde `burn`.
- Todo texto que escribe el usuario pasa por `esc()`.

## Catálogo de alimentos
- Los ids son posicionales (`b{cat}_{idx}`). **Agrega solo al final de su categoría**, o crea una categoría nueva al final. Nunca insertes ni reordenes en RAW: el orden visible lo da `FOODS.sort`.
- El usuario pesa todo **crudo**:
  - Las carnes, aves y pescados cocidos están ocultos (`RAW_TWIN` cocido→crudo, `f.hidden`), pero siguen en FOODS para los registros viejos.
  - `migrate()` pasa los favoritos a su versión cruda.
- Valores: USDA SR Legacy por 100 g. El API DEMO_KEY topa a 30 consultas por hora; usa el CSV oficial. Valida con Atwater (4/4/9, ±15%).
- La búsqueda es por inicio de palabra sobre `f.words` (nombre + grupo + `ALIAS` de carnicería).

## Nube (Firebase con login de Google)
- La app debe abrirse en **kaltrack-app.firebaseapp.com**, que es igual al `authDomain`. El login usa popup y la redirección solo como respaldo. El SW no toca otros dominios ni `/__/`.
- Firestore guarda todo como `{u, datos}` en dos lugares:
  - `usuarios/{uid}`: perfil, metas, pesajes, medidas, favoritos y alimentos propios.
  - `usuarios/{uid}/meses/{AAAA-MM}`: comida, ejercicio y pesas.
  - Reglas: solo el dueño accede y `datos` pesa menos de 1 MB.
- La lógica vive en el script clásico (`cloudParts`, `pendingParts`, `mergeFromCloud`, `syncMeta` en `kaltrack_sync`). `mergeFromCloud` reemplaza o une registro por registro. Candados:
  - Lee toda la nube antes de subir.
  - Un teléfono vacío no sobrescribe la nube, salvo con Borrar todo (`permitirVacio`).
  - Cerrar sesión borra el teléfono solo si ya subió todo.
- Trampa de la pantalla negra (oct-2026): la marca `pushing` la libera solo quien la creó. En código async con "marca de ocupado", prueba también el camino que termina sin ningún `await`.

## iPhone / CSS
- En la PWA instalada de iOS 26, html y body miden la pantalla menos la barra de estado (812 de 874). `100dvh` y `position:fixed` no lo arreglan. Lo arregla un JS: si `screen.height - innerHeight` está entre 0 y 100, pone `#app.style.height = screen.height`.
- Los campos van a 16px (si no, iOS hace zoom al tocar), con `touch-action:manipulation`.
- Para un gesto horizontal dentro de algo con scroll usa `touch-action:pan-y` + `setPointerCapture`. Sin eso funciona en escritorio y falla en el iPhone.
- En SVG no uses `var()` dentro de atributos: va en `style`. Los gauges están rotados 135°, así que el degradado va de .85 a .15.

## Fuerza
- El 1RM se estima con Epley. Récord = un 1RM mejor que todos los anteriores.
- En peso corporal, el campo kg es peso extra. La carga es `bodyOn(fecha) × bwf` + el extra:

  | Ejercicio | bwf |
  |---|---|
  | Lagartijas | .64 |
  | Dominadas y fondos | .95 |
  | Fondos en banco | .6 |
  | Piernas colgado | .34 |
- La gráfica tiene tres líneas: puntos por día, tendencia (promedio de los últimos 6 registros) y récord acumulado. Cada línea se apaga tocando su etiqueta (`kaltrack_lineas`). Rangos: 3M, 6M, 1A y Todo.
- `liftStatus` da récord, estancado (3+ registros y 14+ días sin récord) o "a X% del récord".
- `LIB` = [nombre, grupo, equipo, foto, bwf]. Un ejercicio nuevo lleva su foto en `ex/` y en `EX_IMGS` de `sw.js`.

## Decisiones del usuario (no las reviertas sin que lo pida)
- Nada de fibra, azúcar, sodio ni grasa saturada: los quitó porque "no me agradó".
- Garmin se retiró en oct-2026. Si lo vuelve a pedir: el API oficial es solo para empresas, y la vía no oficial con GitHub Actions llegaba 2–6 h tarde.
- El ejercicio va en su propio círculo, al lado del de calorías y no concéntrico.
- El ejercicio no suma a "restantes" (`exAdd` apagado por defecto). El "Balance del día" no cambia la meta.
- Medidas: una por músculo (pierna, bíceps, pecho, cintura), cada semana. Pecho y pierna son neutros. El bíceps solo cuenta como "bueno" al subir si el objetivo es subir.
- Lenguaje en Fuerza: "registro" (no "sesión"), peso×reps, y en mancuernas el peso de una.
- Peso: la línea de tendencia es una regresión local de 21 días (`weightTrend`) y el ritmo es una regresión de 4 semanas (`weightPace`).
- Las fechas llevan año cuando no son del año actual.

## Pendiente
- Registro de agua.
