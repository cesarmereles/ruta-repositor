# Ruta Repositor (app del celular)

App web instalable (PWA) para los repositores. Funciona **sin internet**: todo queda guardado en el teléfono
y se manda a la oficina como archivo por WhatsApp. En GitHub va **solo el código**, sin datos de clientes.

## Fase 1 (esta versión)
- Cargar la ruta (archivo `ruta-NOMBRE.json` que va a generar Logicom App) o probar con datos de ejemplo.
- Ingreso con teléfono + PIN de 4 números (el PIN viaja como hash en el archivo de ruta).
- Ruta por día (lunes a sábado) y turno, con las horas pedidas en cada punto de venta.
- Marcar entrada y salida (hora del teléfono + GPS si está disponible, sin bloquear).
- No visitado: motivo + comentario + fecha.
- Resumen del día: visitas hechas, horas reales vs. pedidas, registros sin enviar.
- Enviar a la oficina: arma `registro-NOMBRE-FECHA-HHMM.json` y abre el menú de compartir (WhatsApp).
  El archivo lleva TODOS los registros que siguen en el teléfono; Logicom App no duplica (cada uno tiene `uid`).

- Días de empresa: lunes, miércoles y viernes (`oficina.dias` en la ruta). Si cae feriado (`feriados`), pasa al día
  hábil siguiente (lunes feriado → martes). Ese día la app avisa "🏢 Hoy venís a la empresa: enviá tu registro".
- Vencimientos: el repositor carga producto, cantidad y fecha por cliente; los ve con semáforo y los actualiza en cada visita.
  | Etapa | Qué se hace |
  |---|---|
  | 🟡 60 días o menos | Se avisa al grupo de supervisores y vendedores |
  | 🟠 30 días o menos | Se habla con el vendedor (participa el supervisor): ¿se acciona? |
  | 🔴 10 días o menos | Acción: regalar el producto |
  | ⚫ Vencido | Retirar de la góndola y avisar |
  Estados: sigue en el negocio · se vendió todo · se regaló · se retiró (queda el historial de cada cambio).
  El archivo de envío lleva la foto de todos los productos con sus días y etapa.

## Usuario de prueba
| Dato | Valor |
|---|---|
| Repositor | REPO PRUEBA |
| Teléfono | 3764000000 |
| PIN | 1234 |

Clientes inventados (códigos 90001 a 90018, todos con "(PRUEBA)"), en `datos-prueba.js`.

## Probar en la PC
Preview `repositores-celular` (php -S localhost:8095). En el navegador, vista de celular.

## Archivos
| Archivo | Qué es |
|---|---|
| index.html / app.css / app.js | La app |
| sw.js | Guarda la app en el teléfono para abrir sin señal (cambiar VERSION al actualizar) |
| manifest.webmanifest + íconos | Para "Agregar a pantalla de inicio" |
| datos-prueba.js | Ruta de ejemplo |

## Próximas fases
2. Logicom App: "Bajar ruta" por repositor (con teléfono y PIN) y "Recibir registros" (subir los archivos de WhatsApp).
3. Control de horas en la oficina: pedidas vs. reales, no visitados automáticos, Excel.
4. Artículos y vencimientos por cliente (alerta a 60 días).
