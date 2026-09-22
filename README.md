# Sala de lámparas

Home 3D isométrico en Three.js. Siete modelos/variantes del proyecto, cámara a primer plano, encendido y temperatura independientes. Estado y silencio guardados por navegador mediante localStorage. No tiene backend, pagos ni servicios externos.

## Abrir

```sh
npm install
npm run dev -- --port 5173
```

http://127.0.0.1:5173/

```sh
npm test
npm run build
npm run preview
```

`dist/` es la salida estática publicable. GitHub Actions publica automáticamente `main` en https://tataportal.github.io/web-lamparas/ después de ejecutar las pruebas y compilar.

## Interacción

- Seleccionar una lámpara desde el modelo o su punto de interacción. Todos los puntos admiten teclado.
- Elegir cálida / neutra / fría enciende la lámpara y guarda ambas preferencias.
- Anterior / siguiente, flechas del teclado o una lámpara visible permiten saltar directamente entre modelos sin volver a la sala.
- Flecha o Escape vuelven a la sala y conservan la iluminación.
- El botón Sonido activa/silencia el foley y recuerda la preferencia.
- Movimiento reducido respeta la preferencia del sistema. Sin autoplay de audio.
- Sin almacenamiento disponible, la escena funciona y anuncia que no puede guardar.

## Geometrías

`public/models/provenance.json` registra cada manifiesto de origen y su SHA-256. La sala trabaja en metros, con dimensiones originales, a partir de:

- Andon, Tōrō y Shoji: `Lamparas LED/Revision_v03`.
- Pebble jardín y compacta: `Lamparas LED/Pebble_Pared_Gruesa_v10`.
- SHIBUI individual y apilada: `Lamparas LED/SHIBUI_Rosca_025`.

Los exportadores solo crean copias para presentación web; no modifican los archivos originales de impresión. Se omiten herrajes internos y tornillos ocultos. Los GLB de SHIBUI omiten la pantalla de impresión; para visualización se reconstruye su pantalla por una superficie de revolución derivada del perfil radial real (`src/shibui-profile.json`). Se filtran las ondulaciones subpíxel y se representa el relieve mediante una textura con mipmaps; así desaparece el punteado de la malla de impresión en los primeros planos iluminados. La copia web mantiene el perfil y las posiciones del ensamblaje; no es una malla para imprimir. `scripts/build_shibui_profile.py` regenera este perfil desde el OBJ fuente.

Regenerar desde la raíz del proyecto web (requiere Blender):

```sh
/Applications/Blender.app/Contents/MacOS/Blender -b -t 4 --python scripts/export_models.py
node scripts/optimize_models.mjs
```

Para actualizar solo SHIBUI, pasar `-- shibui shibui-stack` al exportador y `shibui shibui-stack` al optimizador. Optimizar solo GLB recién exportados.

## Sonidos

Foley sintetizado con Web Audio, original y sin archivos externos. Madera para Andon, bambú grave para Tōrō, roce de papel para Shoji, resonancias cortas de piedra/cerámica para Pebble y SHIBUI. Cada modelo tiene una afinación distinta; encendido, apagado y temperatura cambian el gesto sonoro. Las notas arrancan únicamente después de interacción.

## Validación

Pruebas automatizadas: restauración de estados independientes, recuperación de datos corruptos, almacenamiento bloqueado y ciclo de activación/silencio de sonido con siete voces distintas. Comprobación manual en navegador de carga de los siete modelos, enfoque, cambios de temperatura, apagado y persistencia tras recarga. Las luces son una representación visual, no una simulación fotométrica certificada.

## Atmósfera

Los acercamientos usan profundidad de campo con distancia de enfoque calculada sobre la lámpara seleccionada y una zona nítida alrededor del modelo. La vista general permanece nítida. Las motas de polvo flotan despacio alrededor de las luces encendidas y heredan su temperatura. El movimiento se detiene con movimiento reducido o al ocultar la pestaña; en reposo se limita a 30 fps.
