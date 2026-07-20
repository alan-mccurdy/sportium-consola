# Spec: Botón "Re-sugerir" manual del panel interno (CRM)

**Fecha:** 2026-07-20
**Autor:** Alan (requerimiento) + OpenCode (ejecución)
**Estado:** implementado, pendiente de prueba en vivo

## Problema

El panel interno ("Para ti (interno)" + "Verificar en el CRM") es compartido y no es un panel
enfocable. El botón "Re-sugerir (panel activo)" actual (`emResugerir`) llama a
`emPedirSugerencia(emFocus, false, true)`, que SIEMPRE reescribe `t.iaRaw` y borra `t.crmChk`
(salvo `t._crmPreservar` en true, que solo setean `emCrmChk`/`emCrmChkAll`).

Consecuencia reportada por Alan: al pulsar Re-sugerir se pierden los checks del CRM ya marcados
y se reescribe el interno, sin poder regenerar el interno a mano sin afectar la respuesta ni los
checks. Alan quiere un botón manual en el panel interno que:
- marque el panel interno como seleccionado (igual que chat/correo lo hacen hoy con `emFocusSet`),
- regenere SOLO el interno,
- **NO borre los checks del CRM ya marcados** (para que la IA sepa qué ya está verificado y pida
  revisar lo que falta),
- **NO toque la respuesta al cliente** (`t.draft` intacta).

## Alcance

DENTRO de alcance:
1. Hacer el panel interno enfocable (`emFocus='interno'`, toggle de clase `focus` en `emChatAna`).
2. Botón "Re-sugerir" dentro de `emChatAna` que dispara `emResugerirInterno()`.
3. `emResugerirInterno()`: preserva `t.crmChk` (`t._crmPreservar=true`), pide a la IA SOLO
   "Para ti (interno):" + "Verificar en el CRM:" pasando la respuesta al cliente actual para
   coherencia, y fusiona el resultado en `t.iaRaw` SIN reescribir `t.draft`.
4. La IA recibe los checks ya verificados (`dirCrm` con `DATOS YA VERIFICADOS`) para pedir
   revisar lo que falta y no repetir lo cumplido.

FUERA de alcance (decisión de Alan):
- No cambiar el mecanismo automático de checks (`emCrmChk`/`emCrmChkAll`/`emChecklistItems`).
- No cambiar `emResugerir` actual (panel activo chat/correo).
- No conectar fuente automática de CRM (es manual, confirmado por humano).

## Diseño técnico

Se reutiliza el patrón de `emEnriquecerFaq` (fetch propio que regenera solo el interno sin
tocar la respuesta al cliente), NO se muta `emPedirSugerencia` (grande y frágil).

- `emFocusSet(slot)` (línea 3519): agregar caso `slot==='interno'` →
  `emFocus='interno'`; toggle clase `focus` en `$('emChatAna')`. Los slots chat/mail quedan
  igual.
- HTML `emChatAna` (línea 1382): agregar cabecera con botón
  `<button onclick="event.stopPropagation();emResugerirInterno()">Re-sugerir</button>`.
- `emResugerirInterno()` (nueva):
  - `const t=emActiveThread();` si no hay, toast y return.
  - `t._crmPreservar=true;` (preserva checks al regenerar).
  - Construye `dirFaq` = pide solo "Para ti (interno):" + "Verificar en el CRM:" con
    `DATOS YA VERIFICADOS` tomados de `emChecklistItems(t)` filtrados por `t.crmChk`.
  - `WEBHOOK` fetch (POST, Bearer session) con `RESPUESTA APROBADA QUE SE LE DARA` =
    `t.draft || extraerSugerida(t.iaRaw)`.
  - Al volver: `interno = respuesta.replace(/Respuesta sugerida al cliente:[\s\S]*$/,'')`.
  - `t.iaRaw = interno + '\nRespuesta sugerida al cliente: ' + (t.draft||extraerSugerida(t.iaRaw))`.
  - `t.iaCliente = extraerSugerida(t.iaRaw); t.iaInterno = emInterno(t.iaRaw);`
  - `t.crmChk` NO se resetea (gracias a `_crmPreservar`).
  - `emSave(); emPush(t); emRenderSlot(emFocus);` (re-render del interno).

## Verificación

- `node --check` del `<script>` principal → SYNTAX_OK.
- En navegador: marcar 1-2 checks del CRM en un caso, pulsar "Re-sugerir" del panel interno →
  el interno se regenera, los checks siguen marcados, y la respuesta al cliente no cambia.
- No se rompe el "Re-sugerir" de chat/correo ni el marcado individual.
