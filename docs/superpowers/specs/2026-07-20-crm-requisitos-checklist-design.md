# Diseño: Botones principales de requisitos en el interno CRM

Fecha: 2026-07-20
Autor: Alan (requisito) + OpenCode (orquestador)

## Contexto

En la consola SINELI/Sportium (sportium-app/index.html), el panel "interno / Verificar en el
CRM" lista requisitos que el agente confirma contra el CRM manualmente. Al marcarlos, la respuesta
al cliente se reescribe sola (mecanismo `emCrmChk` -> regenera a los 1200ms con `emPedirSugerencia`).
Ese mecanismo YA FUNCIONA y no se toca.

El sondeo del caso lo hacen agentes especializados en n8n; la IA ya recibe instrucción (línea 4560)
para listar 2-4 verificaciones CONCRETAS en "Verificar en el CRM". El CRM se consulta manualmente
por el agente (no hay fuente automática).

## Problema

`emChecklistItems(t)` (línea 4334) extrae los checkboxes parseando con regex libre el texto que la
IA escribió. Es frágil: si la IA no sigue el formato esperado, los checkboxes salen vacíos o
imprecisos ("a medias"), y no hay forma rápida de marcar todos de golpe.

## Cambios (mínimos, no tocan el mecanismo de adaptación)

1. **Parser robusto** en `emChecklistItems`: tolerar viñetas `-`, `·`, `•`, `*` y el prefijo
   `[req]` en cada línea. Mantiene el corte actual en "Respuesta sugerida". Sin cambio de formato
   de salida (sigue devolviendo array de strings).

2. **Botón "Marcar todos"** en la cabecera de `emChecklistHTML`: marca todos los requisitos del
   caso de golpe, llamando a nueva `emCrmChkAll(id)` que replica el retardo de regeneración de
   `emCrmChk` (1200ms, respeta `draftEdited`).

3. **Marcado individual** ya existe (checkbox uno por uno) — se conserva.

## Fuera de alcance (explícito de Alan)

- No se conecta fuente de CRM automática (manual).
- No se toca el sistema de "la respuesta se adapta al marcar".
- Pre-marcado sugerido por la IA (checkbox ámbar) se pospone a iteración futura.

## Criterio de éxito

- Al abrir un ticket, la checklist muestra exactamente los requisitos que la IA sondeó para el caso.
- "Marcar todos" marca cada requisito y la respuesta se reescribe pidiendo solo lo que falta.
- `node --check` del script principal sin errores de sintaxis.
