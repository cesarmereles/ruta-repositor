/**
 * Ruta Repositor — app del celular (funciona sin internet).
 * Todo se guarda en el teléfono (localStorage). Para mandarlo a la oficina se arma un archivo
 * que se comparte por WhatsApp. El archivo lleva TODOS los registros que siguen en el teléfono:
 * si se manda dos veces, Logicom App no duplica (cada registro tiene su uid).
 */
(() => {
  'use strict'
  const CLAVE = 'rr-estado-v1'
  const DIAS = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  const DIAS_LARGO = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  const TOLERANCIA_MIN = 5          // minutos de gracia para dar por cumplidas las horas
  const $ = id => document.getElementById(id)
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

  // ---------- Estado ----------
  let E = leer()
  let diaVista = null   // 1..6
  let seccion = 'ruta'

  function leer() {
    let e
    try { e = JSON.parse(localStorage.getItem(CLAVE)) || nuevo() } catch { e = nuevo() }
    e.articulos ??= []
    return e
  }
  function nuevo() { return { ruta: null, sesion: null, registros: [], articulos: [] } }
  function guardar() {
    try { localStorage.setItem(CLAVE, JSON.stringify(E)); return true }
    catch { avisar('⚠️ No se pudo guardar en el teléfono. No cierres la app y avisá a la oficina.'); return false }
  }

  // ---------- Fechas (siempre hora local del teléfono) ----------
  const dosD = n => String(n).padStart(2, '0')
  const isoFecha = d => `${d.getFullYear()}-${dosD(d.getMonth() + 1)}-${dosD(d.getDate())}`
  function isoLocal(d = new Date()) {
    const o = -d.getTimezoneOffset(), s = o >= 0 ? '+' : '-'
    return `${isoFecha(d)}T${dosD(d.getHours())}:${dosD(d.getMinutes())}:${dosD(d.getSeconds())}${s}${dosD(Math.floor(Math.abs(o) / 60))}:${dosD(Math.abs(o) % 60)}`
  }
  const hoy = () => isoFecha(new Date())
  const hora = iso => iso ? iso.slice(11, 16) : '--:--'
  /** Fecha (Date) del día 1..6 de esta semana (o de las semanas que siguen) */
  function fechaDelDia(dia, semanas = 0) {
    const d = new Date(); d.setHours(12, 0, 0, 0)
    const dow = d.getDay() || 7
    d.setDate(d.getDate() - dow + dia + semanas * 7)
    return d
  }
  const fechaCorta = iso => { const [a, m, d] = iso.split('-'); return `${d}/${m}` }
  const diaNombre = iso => DIAS_LARGO[new Date(iso + 'T12:00:00').getDay()]

  // ---------- Días de empresa: lunes, miércoles y viernes; si cae feriado, el día hábil siguiente ----------
  const esFeriado = iso => (E.ruta?.feriados || []).includes(iso)
  /** Fechas ISO en que va a la empresa en la semana (0 = esta, 1 = la que viene) */
  function diasEmpresa(semana = 0) {
    const res = new Set()
    for (const d of E.ruta?.oficina?.dias || [1, 3, 5]) {
      const f = fechaDelDia(d, semana)
      while (esFeriado(isoFecha(f)) || f.getDay() === 0) f.setDate(f.getDate() + 1)
      res.add(isoFecha(f))
    }
    return res
  }
  const esDiaEmpresa = iso => diasEmpresa(0).has(iso) || diasEmpresa(1).has(iso)
  function proximoDiaEmpresa() {
    const h = hoy()
    return [...diasEmpresa(0), ...diasEmpresa(1)].filter(f => f > h).sort()[0]
  }
  function textoHoras(min) {
    if (min == null) return '—'
    const h = Math.floor(min / 60), m = Math.round(min % 60)
    return h ? `${h} h ${dosD(m)}` : `${m} min`
  }
  const horasPedidas = h => h ? textoHoras(h * 60) : 'sin horas'

  // ---------- Avisos ----------
  let tAviso
  function avisar(txt, ms = 3500) {
    const a = $('aviso'); a.textContent = txt; a.hidden = false
    clearTimeout(tAviso); tAviso = setTimeout(() => { a.hidden = true }, ms)
  }

  // ---------- Vistas ----------
  function mostrar(id) {
    for (const v of ['v-inicio', 'v-ingreso', 'v-ruta']) $(v).hidden = v !== id
  }
  function arrancar() {
    if (!E.ruta) return mostrar('v-inicio')
    if (!E.sesion || E.sesion.fecha !== hoy()) {
      $('ingreso-nombre').textContent = `Hola, ${E.ruta.repositor.nombre}`
      $('in-pin').value = ''
      // Ruta de ejemplo: los datos de prueba son públicos (están en datos-prueba.js), se muestran para poder entrar
      const demo = E.ruta.repositor.id === RUTA_PRUEBA.repositor.id
      $('ingreso-prueba').hidden = !demo
      if (demo) $('ingreso-prueba').textContent = `🧪 Datos de ejemplo: teléfono ${RUTA_PRUEBA.repositor.telefono} · PIN 1234`
      return mostrar('v-ingreso')
    }
    const dow = new Date().getDay()
    diaVista ??= dow >= 1 && dow <= 6 ? dow : 1
    mostrar('v-ruta')
    pintar()
  }

  // ---------- Cargar la ruta ----------
  function validarRuta(r) {
    if (!r || r.tipo !== 'logicom-ruta') throw new Error('Ese archivo no es una ruta de Logicom.')
    if (!r.repositor?.id || !r.repositor?.pin_hash || !Array.isArray(r.visitas)) throw new Error('Al archivo le faltan datos. Pedile a la oficina que lo genere de nuevo.')
    return r
  }
  function usarRuta(r) {
    const pendientes = E.registros.filter(x => !x.enviado).length
    if (E.ruta && E.ruta.repositor.id !== r.repositor.id && (E.registros.length || E.articulos.some(a => a.estado === 'activo'))) {
      throw new Error(`Esta ruta es de ${r.repositor.nombre} y en el teléfono hay registros de ${E.ruta.repositor.nombre}. Enviálos a la oficina antes de cambiar.`)
    }
    const mismo = E.ruta && E.ruta.repositor.id === r.repositor.id
    E.ruta = r
    if (!mismo) E.sesion = null
    guardar()
    avisar(mismo ? `✅ Ruta actualizada (${r.visitas.length} visitas).${pendientes ? ' Tus registros siguen guardados.' : ''}` : '✅ Ruta cargada.')
    arrancar()
  }
  async function leerArchivo(input, errEl) {
    const f = input.files?.[0]; input.value = ''
    if (!f) return
    try { usarRuta(validarRuta(JSON.parse(await f.text()))) }
    catch (e) { const m = e instanceof SyntaxError ? 'No se pudo leer el archivo. ¿Es el que mandó la oficina?' : e.message; if (errEl) errEl.textContent = m; else avisar('⚠️ ' + m, 6000) }
  }

  // ---------- Ingreso ----------
  async function sha256(txt) {
    const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt))
    return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('')
  }
  const soloNumeros = v => String(v).replace(/\D/g, '').slice(-10)
  async function entrar(ev) {
    ev.preventDefault()
    const r = E.ruta.repositor, err = $('ingreso-error')
    err.textContent = ''
    if (soloNumeros($('in-tel').value) !== soloNumeros(r.telefono)) { err.textContent = 'Ese teléfono no es el de esta ruta.'; return }
    if (await sha256(`${r.sal}:${$('in-pin').value}`) !== r.pin_hash) { err.textContent = 'PIN incorrecto.'; $('in-pin').value = ''; return }
    E.sesion = { fecha: hoy(), desde: isoLocal() }
    guardar(); arrancar()
  }

  // ---------- GPS (no bloquea: si no anda, se registra igual) ----------
  function tomarGps() {
    return new Promise(res => {
      if (!navigator.geolocation) return res({ error: 'sin GPS' })
      navigator.geolocation.getCurrentPosition(
        p => res({ lat: +p.coords.latitude.toFixed(6), lng: +p.coords.longitude.toFixed(6), precision: Math.round(p.coords.accuracy) }),
        e => res({ error: e.code === 1 ? 'permiso negado' : 'no se pudo ubicar' }),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 })
    })
  }
  function distancia(a, b) {
    if (!a || a.lat == null || !b || b.lat == null) return null
    const R = 6371000, r = x => x * Math.PI / 180
    const dLa = r(b.lat - a.lat), dLo = r(b.lng - a.lng)
    const h = Math.sin(dLa / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLo / 2) ** 2
    return Math.round(2 * R * Math.asin(Math.sqrt(h)))
  }
  function textoGps(g, v) {
    if (!g) return ''
    if (g.error) return `📍 GPS: ${g.error}`
    const d = distancia(g, v)
    return d == null ? '📍 Ubicación guardada' : `📍 a ${d < 1000 ? d + ' m' : (d / 1000).toFixed(1) + ' km'} del negocio${d > 300 ? ' ⚠️' : ''}`
  }

  // ---------- Registros ----------
  const uid = (fecha, v) => `${E.ruta.repositor.id}-${fecha}-${v.id}`
  const registroDe = (fecha, v) => E.registros.find(x => x.uid === uid(fecha, v))
  const enCurso = () => E.registros.find(x => x.estado === 'curso')

  async function marcarEntrada(v) {
    const otro = enCurso()
    if (otro) { avisar(`Primero marcá la salida de ${otro.nombre}.`); return }
    const fecha = hoy()
    const reg = {
      uid: uid(fecha, v), visita_id: v.id, cliente: v.cliente, nombre: v.nombre, fecha, dia: v.dia, turno: v.turno,
      horas_pedidas: v.horas ?? null, estado: 'curso', entrada: isoLocal(), salida: null, minutos: null,
      gps_entrada: null, gps_salida: null, motivo: null, comentario: null, enviado: null
    }
    E.registros.push(reg); guardar(); pintar()
    avisar(`▶️ Entrada ${hora(reg.entrada)} en ${v.nombre}`)
    reg.gps_entrada = await tomarGps(); guardar(); pintar()
  }

  async function marcarSalida(reg) {
    const ahora = new Date(), min = Math.round((ahora - new Date(reg.entrada)) / 60000)
    const pedidas = (reg.horas_pedidas || 0) * 60
    if (reg.fecha !== hoy() || (pedidas && min > pedidas * 2 + 60)) {
      if (!confirm(`La entrada fue el ${reg.fecha.split('-').reverse().join('/')} a las ${hora(reg.entrada)} (${textoHoras(min)}). ¿Marcar la salida igual?`)) return
    }
    reg.salida = isoLocal(ahora); reg.minutos = min; reg.estado = 'visitado'
    guardar(); pintar()
    avisar(`⏹️ Salida ${hora(reg.salida)} · ${textoHoras(min)}`)
    reg.gps_salida = await tomarGps(); guardar(); pintar()
  }

  function quitar(reg, pregunta) {
    if (!confirm(pregunta)) return
    E.registros = E.registros.filter(x => x !== reg); guardar(); pintar()
  }

  // No visitado
  let nvVisita = null
  function abrirNoVisita(v) {
    nvVisita = v
    $('nv-cliente').textContent = v.nombre
    $('nv-motivos').innerHTML = '<legend>¿Qué pasó?</legend>' + (E.ruta.motivos || ['Negocio cerrado', 'No está el titular', 'Otro'])
      .map((m, i) => `<label><input type="radio" name="motivo" value="${esc(m)}"${i ? '' : ' required'}> ${esc(m)}</label>`).join('')
    $('nv-comentario').value = ''; $('nv-error').textContent = ''
    $('d-novisita').showModal()
  }
  async function guardarNoVisita(ev) {
    if (ev.submitter?.value !== 'ok') return
    ev.preventDefault()
    const motivo = $('form-novisita').querySelector('input[name=motivo]:checked')?.value
    const comentario = $('nv-comentario').value.trim()
    if (!motivo) { $('nv-error').textContent = 'Elegí qué pasó.'; return }
    if (motivo === 'Otro' && !comentario) { $('nv-error').textContent = 'Contá en el comentario qué pasó.'; return }
    const v = nvVisita, fecha = hoy()
    const reg = {
      uid: uid(fecha, v), visita_id: v.id, cliente: v.cliente, nombre: v.nombre, fecha, dia: v.dia, turno: v.turno,
      horas_pedidas: v.horas ?? null, estado: 'no_visitado', entrada: null, salida: null, minutos: null,
      registrado: isoLocal(), gps_entrada: null, gps_salida: null, motivo, comentario, enviado: null
    }
    E.registros.push(reg); guardar()
    $('d-novisita').close(); pintar()
    avisar('Guardado como no visitado.')
    reg.gps_entrada = await tomarGps(); guardar(); pintar()
  }

  // ---------- Pintar ----------
  function pintar() {
    const r = E.ruta, fHoy = hoy()
    $('r-nombre').textContent = r.repositor.nombre
    $('r-fecha').textContent = `${DIAS_LARGO[new Date().getDay()]} ${fHoy.split('-').reverse().join('/')}`
    for (const b of document.querySelectorAll('.seccion')) b.setAttribute('aria-pressed', String(b.dataset.sec === seccion))
    $('sec-ruta').hidden = seccion !== 'ruta'
    $('sec-venc').hidden = seccion !== 'venc'
    const urgentes = E.articulos.filter(a => a.estado === 'activo' && diasPara(a.vence) <= 30).length
    $('venc-cuenta').hidden = !urgentes; $('venc-cuenta').textContent = urgentes
    pintarVencimientos()
    actualizarBotonEnviar()

    // Días (🏢 = va a la empresa)
    const dowHoy = new Date().getDay(), empresa = diasEmpresa(0)
    $('dias').innerHTML = [1, 2, 3, 4, 5, 6].map(d => {
      const f = isoFecha(fechaDelDia(d))
      const extra = esFeriado(f) ? ' feriado' : ''
      return `<button type="button" class="dia${d === dowHoy ? ' hoy' : ''}${extra}" data-dia="${d}" aria-pressed="${d === diaVista}"
        aria-label="${DIAS_LARGO[d]} ${fechaCorta(f)}${empresa.has(f) ? ', día de empresa' : ''}${extra ? ', feriado' : ''}">${DIAS[d]}<small>${fechaCorta(f)}</small>${empresa.has(f) ? '<span class="ofi">🏢 EMPRESA</span>' : ''}</button>`
    }).join('')

    const fecha = isoFecha(fechaDelDia(diaVista))
    const esHoy = fecha === fHoy, pasado = fecha < fHoy
    const visitas = r.visitas.filter(v => v.dia === diaVista).sort((a, b) => (a.turno > b.turno) - (a.turno < b.turno) || (a.orden ?? 0) - (b.orden ?? 0))

    // Resumen del día
    const regs = visitas.map(v => registroDe(fecha, v)).filter(Boolean)
    const hechas = regs.filter(x => x.estado === 'visitado').length
    const minReal = regs.reduce((s, x) => s + (x.minutos || 0), 0)
    const minPed = visitas.reduce((s, v) => s + (v.horas || 0) * 60, 0)
    const sinEnviar = pendientesEnvio()
    let empresaTxt
    if (esHoy && esDiaEmpresa(fHoy)) {
      empresaTxt = `<p class="aviso-dia oficina">🏢 Hoy venís a la empresa${sinEnviar ? `: enviá tu registro (${sinEnviar} sin enviar)` : ''}.</p>`
    } else if (esHoy) {
      const p = proximoDiaEmpresa()
      empresaTxt = p ? `<p class="aviso-dia">🏢 Próximo día en la empresa: ${diaNombre(p).toLowerCase()} ${fechaCorta(p)}</p>` : ''
    } else if (esFeriado(fecha)) {
      empresaTxt = '<p class="aviso-dia">🎉 Feriado.</p>'
    } else {
      empresaTxt = `<p class="aviso-dia">${pasado ? '👀 Día pasado: solo para mirar.' : '📅 Día que viene: vas a poder marcar ese día.'}${esDiaEmpresa(fecha) ? ' 🏢 Ese día venís a la empresa.' : ''}</p>`
    }
    $('resumen').innerHTML = `
      <div class="dato"><b>${hechas}/${visitas.length}</b><span>visitas</span></div>
      <div class="dato"><b>${textoHoras(minReal)}</b><span>de ${textoHoras(minPed)}</span></div>
      <div class="dato"><b>${sinEnviar}</b><span>sin enviar</span></div>
      ${empresaTxt}`

    // Cartas
    const curso = enCurso()
    let turnoAnt = null
    const html = visitas.map(v => {
      const reg = registroDe(fecha, v)
      let t = ''
      if (v.turno !== turnoAnt) { t = `<h2 class="turno">${esc(v.turno || 'SIN TURNO')}</h2>`; turnoAnt = v.turno }
      const mapa = v.lat != null ? `<a href="https://www.google.com/maps/search/?api=1&query=${v.lat},${v.lng}" target="_blank" rel="noopener">🗺️ Mapa</a>` : ''
      const cab = `<h3>${esc(v.nombre)}</h3><div class="dir">${esc(v.direccion || '')} ${mapa}</div>`
      let clase = '', cuerpo = ''
      if (!reg) {
        const estado = pasado ? '<span class="etiqueta">Sin registrar</span>' : `<span class="etiqueta">${horasPedidas(v.horas)}</span>`
        cuerpo = `<div class="linea"><span class="tenue">Pedido: ${horasPedidas(v.horas)}</span>${estado}</div>`
        if (esHoy) cuerpo += `<div class="acciones">
            <button type="button" class="btn btn-ok" data-acc="entrada" data-id="${v.id}"${curso ? ' disabled' : ''}>▶️ Marcar entrada</button>
            <button type="button" class="btn btn-sec" data-acc="novisita" data-id="${v.id}" aria-label="No pude visitar ${esc(v.nombre)}">🚫 No</button>
          </div>`
      } else if (reg.estado === 'curso') {
        clase = 'curso'
        cuerpo = `<div class="linea"><span>Entrada ${hora(reg.entrada)} · pedido ${horasPedidas(v.horas)}</span><span class="etiqueta">En el local</span></div>
          <div class="reloj" data-desde="${reg.entrada}">${textoHoras(Math.round((Date.now() - new Date(reg.entrada)) / 60000))}</div>
          <div class="gps">${textoGps(reg.gps_entrada, v) || '📍 Buscando ubicación…'}</div>
          <div class="acciones">
            <button type="button" class="btn btn-salida" data-acc="salida" data-id="${v.id}">⏹️ Marcar salida</button>
            <button type="button" class="btn btn-link" data-acc="deshacer" data-id="${v.id}">Cancelar</button>
          </div>`
      } else if (reg.estado === 'visitado') {
        const ped = (v.horas || 0) * 60, cumple = !ped || reg.minutos >= ped - TOLERANCIA_MIN
        clase = cumple ? 'ok' : 'ok corto'
        const pct = ped ? Math.min(100, Math.round(reg.minutos / ped * 100)) : 100
        cuerpo = `<div class="linea"><span>${hora(reg.entrada)} → ${hora(reg.salida)}</span><span class="etiqueta">${cumple ? '✅' : '⚠️'} ${textoHoras(reg.minutos)} de ${horasPedidas(v.horas)}</span></div>
          <div class="barra-hs" aria-hidden="true"><i style="width:${pct}%"></i></div>
          <div class="gps">${textoGps(reg.gps_entrada, v)}</div>
          ${esHoy && !reg.enviado ? `<button type="button" class="btn btn-link" data-acc="corregir" data-id="${v.id}">Corregir</button>` : ''}`
      } else {
        clase = 'nv'
        cuerpo = `<div class="linea"><span>🚫 ${esc(reg.motivo)}</span><span class="etiqueta">No visitado</span></div>
          ${reg.comentario ? `<div class="tenue">“${esc(reg.comentario)}”</div>` : ''}
          ${esHoy && !reg.enviado ? `<button type="button" class="btn btn-link" data-acc="corregir" data-id="${v.id}">Corregir</button>` : ''}`
      }
      if (reg?.enviado) clase += ' enviada'
      const prods = E.articulos.filter(a => a.cliente === v.cliente && a.estado === 'activo')
      const urg = prods.filter(a => diasPara(a.vence) <= 30).length
      const venc = `<button type="button" class="btn btn-sec btn-venc" data-acc="venc" data-id="${v.id}">📦 ${prods.length ? `Vencimientos (${prods.length})${urg ? ' ⚠️' : ''}` : 'Cargar vencimiento'}</button>`
      return `${t}<article class="carta ${clase}">${cab}${cuerpo}${venc}</article>`
    }).join('')
    $('lista').innerHTML = html || `<p class="vacio">No tenés visitas el ${DIAS_LARGO[diaVista].toLowerCase()}.</p>`

    // Si quedó una visita abierta en otro día, avisarlo arriba
    if (curso && curso.fecha !== fecha) {
      $('lista').insertAdjacentHTML('afterbegin', `<p class="aviso-dia">⏱️ Tenés abierta la visita a <b>${esc(curso.nombre)}</b> (${curso.fecha.split('-').reverse().join('/')}). Andá a ese día para marcar la salida.</p>`)
    }
  }
  function actualizarBotonEnviar() {
    const n = pendientesEnvio()
    $('btn-enviar').textContent = n ? `📲 Enviar a la oficina (${n})` : '📲 Enviar a la oficina'
  }
  /** Registros cerrados sin enviar + productos cambiados desde el último envío */
  const pendientesEnvio = () => E.registros.filter(x => !x.enviado && x.estado !== 'curso').length
    + E.articulos.filter(a => !a.enviado || a.actualizado > a.enviado).length

  // ---------- Vencimientos ----------
  // Etapas: 60 días → aviso al grupo · 30 → vendedor + supervisor deciden · 10 → regalar
  const ETAPAS = {
    vencido: { orden: 0, titulo: '⚫ Vencido', accion: 'Retirarlo de la góndola y avisar a la oficina.' },
    regalar: { orden: 1, titulo: '🔴 10 días o menos', accion: 'Acción: regalar el producto.' },
    decidir: { orden: 2, titulo: '🟠 30 días o menos', accion: 'Hablar con el vendedor (participa el supervisor): ¿se acciona?' },
    aviso: { orden: 3, titulo: '🟡 60 días o menos', accion: 'Se avisa al grupo de supervisores y vendedores: estar atentos.' },
    ok: { orden: 4, titulo: '🟢 Más de 60 días', accion: 'Seguir mirándolo en cada visita.' },
    cerrado: { orden: 5, titulo: '✔ Resueltos', accion: '' }
  }
  function diasPara(iso) {
    const a = new Date(hoy() + 'T12:00:00'), b = new Date(iso + 'T12:00:00')
    return Math.round((b - a) / 86400000)
  }
  function etapaDe(a) {
    if (a.estado !== 'activo') return 'cerrado'
    const d = diasPara(a.vence)
    return d < 0 ? 'vencido' : d <= 10 ? 'regalar' : d <= 30 ? 'decidir' : d <= 60 ? 'aviso' : 'ok'
  }
  const textoDias = d => d < 0 ? `venció hace ${-d} día${d === -1 ? '' : 's'}` : d === 0 ? 'vence hoy' : `faltan ${d} día${d === 1 ? '' : 's'}`
  const ESTADOS = { vendido: 'Se vendió todo', regalado: 'Se regaló', retirado: 'Se retiró' }

  function pintarVencimientos() {
    const hace30 = isoFecha(new Date(Date.now() - 30 * 86400000))
    const lista = E.articulos.filter(a => a.estado === 'activo' || (a.actualizado || '').slice(0, 10) >= hace30)
    if (!lista.length) { $('venc-lista').innerHTML = '<p class="vacio">Todavía no cargaste productos. Cuando encuentres uno con fecha corta, cargalo acá o desde la visita.</p>'; return }
    const grupos = {}
    for (const a of lista) (grupos[etapaDe(a)] ??= []).push(a)
    $('venc-lista').innerHTML = Object.keys(grupos).sort((x, y) => ETAPAS[x].orden - ETAPAS[y].orden).map(k => {
      const items = grupos[k].sort((x, y) => x.vence.localeCompare(y.vence))
      return `<h2 class="grupo">${ETAPAS[k].titulo} <small>(${items.length})</small></h2>` + items.map(a => {
        const d = diasPara(a.vence)
        return `<article class="carta e-${k}">
          <h3>${esc(a.descripcion)}</h3>
          <div class="dir">${esc(a.cliente_nombre)}</div>
          <div class="linea"><span>${a.cantidad} u. · vence ${a.vence.split('-').reverse().join('/')}</span><span class="etiqueta">${k === 'cerrado' ? esc(ESTADOS[a.estado] || a.estado) : textoDias(d)}</span></div>
          ${ETAPAS[k].accion ? `<p class="accion">👉 ${ETAPAS[k].accion}</p>` : ''}
          ${a.nota ? `<div class="tenue">“${esc(a.nota)}”</div>` : ''}
          ${a.estado === 'activo' ? `<button type="button" class="btn btn-sec btn-venc" data-art="${esc(a.uid)}">✏️ Actualizar</button>` : ''}
        </article>`
      }).join('')
    }).join('')
  }

  let vcEditando = null
  function abrirVenc(cliente = null, art = null) {
    vcEditando = art
    const clientes = [...new Map(E.ruta.visitas.map(v => [v.cliente, v.nombre])).entries()].sort((a, b) => a[1].localeCompare(b[1]))
    $('vc-cliente').innerHTML = '<option value="">Elegí el cliente</option>' + clientes.map(([c, n]) => `<option value="${c}">${esc(n)}</option>`).join('')
    $('vc-catalogo').innerHTML = (E.ruta.articulos || []).map(p => `<option value="${esc(p.descripcion)}">`).join('')
    $('venc-titulo').textContent = art ? 'Actualizar producto' : 'Cargar producto'
    $('vc-cliente').value = String(art?.cliente ?? cliente ?? '')
    $('vc-cliente').disabled = !!art
    $('vc-producto').value = art?.descripcion ?? ''
    $('vc-producto').disabled = !!art
    $('vc-cantidad').value = art?.cantidad ?? ''
    $('vc-vence').value = art?.vence ?? ''
    $('vc-vence').min = isoFecha(new Date(Date.now() - 30 * 86400000))
    $('vc-estado-l').hidden = !art
    $('vc-estado').value = art?.estado ?? 'activo'
    $('vc-nota').value = art?.nota ?? ''
    $('vc-error').textContent = ''
    mostrarEtapa()
    $('d-venc').showModal()
  }
  function mostrarEtapa() {
    const v = $('vc-vence').value
    if (!v) { $('vc-etapa').textContent = ''; return }
    const k = etapaDe({ estado: 'activo', vence: v })
    $('vc-etapa').textContent = `${ETAPAS[k].titulo} · ${textoDias(diasPara(v))}. ${ETAPAS[k].accion}`
  }
  function guardarVenc(ev) {
    if (ev.submitter?.value !== 'ok') return
    ev.preventDefault()
    const err = $('vc-error'); err.textContent = ''
    const cliente = +$('vc-cliente').value, desc = $('vc-producto').value.trim().toUpperCase()
    const cant = Number($('vc-cantidad').value), vence = $('vc-vence').value
    if (!cliente) return void (err.textContent = 'Elegí el cliente.')
    if (!desc) return void (err.textContent = 'Escribí el producto.')
    if (!Number.isInteger(cant) || cant < 0) return void (err.textContent = 'La cantidad tiene que ser un número entero.')
    if (!vence) return void (err.textContent = 'Poné la fecha de vencimiento.')
    const ahora = isoLocal(), nota = $('vc-nota').value.trim()
    if (vcEditando) {
      const a = vcEditando
      a.historial.push({ fecha: ahora, cantidad: a.cantidad, vence: a.vence, estado: a.estado, nota: a.nota })
      Object.assign(a, { cantidad: cant, vence, estado: cant === 0 && $('vc-estado').value === 'activo' ? 'vendido' : $('vc-estado').value, nota, actualizado: ahora })
    } else {
      const prod = (E.ruta.articulos || []).find(p => p.descripcion.toUpperCase() === desc)
      const repe = E.articulos.find(a => a.estado === 'activo' && a.cliente === cliente && a.descripcion === desc && a.vence === vence)
      if (repe) return void (err.textContent = 'Ese producto con esa fecha ya está cargado en este cliente: actualizalo desde la lista.')
      E.articulos.push({
        uid: `${E.ruta.repositor.id}-${Date.now().toString(36)}`, cliente, cliente_nombre: E.ruta.visitas.find(v => v.cliente === cliente)?.nombre ?? '',
        codigo: prod?.codigo ?? null, descripcion: desc, cantidad: cant, vence, estado: 'activo', nota,
        alta: ahora, actualizado: ahora, historial: [], enviado: null
      })
    }
    guardar(); $('d-venc').close(); pintar()
    avisar(vcEditando ? '✅ Producto actualizado.' : '✅ Producto cargado.')
  }

  // Reloj de la visita en curso
  setInterval(() => {
    for (const el of document.querySelectorAll('.reloj[data-desde]')) {
      el.textContent = textoHoras(Math.round((Date.now() - new Date(el.dataset.desde)) / 60000))
    }
  }, 15000)

  // ---------- Enviar ----------
  function armarArchivo() {
    const r = E.ruta.repositor
    const datos = {
      tipo: 'logicom-registro', version: 1, generado: isoLocal(),
      repositor: { id: r.id, nombre: r.nombre, telefono: r.telefono },
      ruta_generada: E.ruta.generado,
      registros: E.registros.filter(x => x.estado !== 'curso').map(({ enviado, ...x }) => x),
      // Foto de todos los productos (la oficina se queda con la última versión de cada uid)
      articulos: E.articulos.map(({ enviado, ...a }) => ({ ...a, dias: diasPara(a.vence), etapa: etapaDe(a) }))
    }
    const nombre = `registro-${r.nombre.replace(/[^A-Za-z0-9]+/g, '-')}-${hoy()}-${datos.generado.slice(11, 16).replace(':', '')}.txt`
    // .txt y no .json: Chrome en Android no deja compartir .json (da "Permission denied"). Adentro sigue siendo JSON.
    return { datos, nombre, archivo: new File([JSON.stringify(datos, null, 1)], nombre, { type: 'text/plain' }) }
  }
  function descargar(archivo) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(archivo); a.download = archivo.name
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000)
  }
  function marcarEnviados() {
    const ahora = isoLocal()
    for (const x of E.registros) if (x.estado !== 'curso' && !x.enviado) x.enviado = ahora
    for (const a of E.articulos) a.enviado = ahora
    E.ultimo_envio = ahora; guardar(); pintar()
  }
  async function enviar() {
    const curso = enCurso()
    const { datos, archivo } = armarArchivo()
    if (!datos.registros.length && !datos.articulos.length) { avisar(curso ? 'Primero marcá la salida de la visita abierta.' : 'Todavía no hay nada para enviar.'); return }
    if (curso && !confirm(`La visita a ${curso.nombre} sigue abierta y no va en este envío. ¿Enviar lo demás?`)) return
    if (navigator.canShare && navigator.canShare({ files: [archivo] })) {
      try {
        await navigator.share({ files: [archivo], title: 'Registro de visitas' })   // sin text: algunos WhatsApp descartan el archivo si va con texto
        marcarEnviados(); avisar('✅ Listo. Elegiste a quién mandarlo: tiene que ser el WhatsApp de la oficina.', 5000)
      } catch (e) { if (e.name !== 'AbortError') avisar(`⚠️ No se pudo compartir (${e.name}). Probá con “Guardar copia en archivo” en el menú ☰.`, 8000) }
    } else {
      descargar(archivo)
      if (confirm('Este teléfono no deja compartir directo. Se guardó el archivo en Descargas: mandalo por WhatsApp a la oficina. ¿Ya lo mandaste?')) marcarEnviados()
    }
  }

  // ---------- Eventos ----------
  $('archivo-ruta').addEventListener('change', e => leerArchivo(e.target, $('inicio-error')))
  $('archivo-ruta-2').addEventListener('change', e => { $('d-menu').close(); leerArchivo(e.target) })
  $('btn-demo').addEventListener('click', () => {
    try {
      usarRuta(validarRuta(structuredClone(RUTA_PRUEBA)))
      if (!E.articulos.length) {
        const ahora = isoLocal()
        E.articulos = vencimientosPrueba().map(a => ({ ...a, estado: 'activo', nota: '', alta: ahora, actualizado: ahora, historial: [], enviado: null }))
        guardar()
      }
    } catch (e) { $('inicio-error').textContent = e.message }
  })
  document.querySelector('.secciones').addEventListener('click', e => { const b = e.target.closest('.seccion'); if (b) { seccion = b.dataset.sec; pintar(); scrollTo(0, 0) } })
  $('btn-nuevo-venc').addEventListener('click', () => abrirVenc())
  $('venc-lista').addEventListener('click', e => { const b = e.target.closest('[data-art]'); if (b) abrirVenc(null, E.articulos.find(a => a.uid === b.dataset.art)) })
  $('form-venc').addEventListener('submit', guardarVenc)
  $('vc-vence').addEventListener('input', mostrarEtapa)
  $('form-ingreso').addEventListener('submit', entrar)
  $('btn-volver').addEventListener('click', () => {
    const demo = E.ruta?.repositor.id === RUTA_PRUEBA.repositor.id
    const hay = E.registros.length + (demo ? 0 : E.articulos.length)
    if (hay && !confirm(`En el teléfono hay ${hay} registros guardados de ${E.ruta.repositor.nombre}. Si volvés al inicio se borran. ¿Seguro?`)) return
    E = nuevo(); guardar(); $('inicio-error').textContent = ''; arrancar()
  })
  $('form-novisita').addEventListener('submit', guardarNoVisita)
  $('btn-enviar').addEventListener('click', enviar)
  $('dias').addEventListener('click', e => { const b = e.target.closest('.dia'); if (b) { diaVista = +b.dataset.dia; pintar() } })
  $('lista').addEventListener('click', e => {
    const b = e.target.closest('[data-acc]'); if (!b) return
    const v = E.ruta.visitas.find(x => x.id === +b.dataset.id)
    const fecha = isoFecha(fechaDelDia(diaVista)), reg = registroDe(fecha, v)
    if (b.dataset.acc === 'entrada') marcarEntrada(v)
    else if (b.dataset.acc === 'novisita') abrirNoVisita(v)
    else if (b.dataset.acc === 'venc') abrirVenc(v.cliente)
    else if (b.dataset.acc === 'salida') marcarSalida(reg)
    else if (b.dataset.acc === 'deshacer') quitar(reg, `¿Cancelar la entrada en ${v.nombre}? Se borra la hora de entrada.`)
    else if (b.dataset.acc === 'corregir') quitar(reg, `¿Borrar lo que marcaste en ${v.nombre} para hacerlo de nuevo?`)
  })
  $('btn-menu').addEventListener('click', () => {
    const r = E.ruta, n = E.registros.length
    $('menu-info').textContent = `${r.repositor.nombre} · ${r.visitas.length} visitas en la ruta · ${n} registros en el teléfono${E.ultimo_envio ? ' · último envío ' + E.ultimo_envio.slice(0, 16).replace('T', ' ') : ''}`
    $('d-menu').showModal()
  })
  $('btn-copia').addEventListener('click', () => { const { datos, archivo } = armarArchivo(); if (!datos.registros.length && !datos.articulos.length) return avisar('No hay nada para guardar.'); descargar(archivo); avisar('💾 Copia guardada en Descargas.') })
  $('btn-borrar-env').addEventListener('click', () => {
    const viejos = E.registros.filter(x => x.enviado && x.fecha < hoy())
    if (!viejos.length) return avisar('No hay registros enviados de días anteriores.')
    if (!confirm(`¿Borrar del teléfono ${viejos.length} registros ya enviados? Hacelo solo si la oficina te confirmó que los recibió.`)) return
    E.registros = E.registros.filter(x => !viejos.includes(x)); guardar(); $('d-menu').close(); pintar(); avisar('🗑️ Borrados.')
  })
  $('btn-salir').addEventListener('click', () => { E.sesion = null; guardar(); $('d-menu').close(); arrancar() })
  for (const b of document.querySelectorAll('[data-cerrar]')) b.addEventListener('click', () => b.closest('dialog').close())

  // ---------- Sin internet ----------
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {})
  navigator.storage?.persist?.().catch(() => {})

  arrancar()
})()
