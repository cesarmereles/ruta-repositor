/**
 * Ruta de PRUEBA (todo inventado: no hay clientes reales).
 * Es el mismo formato que va a generar Logicom App en "Bajar ruta" (archivo ruta-NOMBRE.json).
 * Repositor: REPO PRUEBA · teléfono 3764000000 · PIN 1234 (pin_hash = SHA-256 de "sal:PIN").
 */
const RUTA_PRUEBA = {
  tipo: 'logicom-ruta',
  version: 1,
  generado: '2026-11-24T08:00:00-03:00',
  repositor: {
    id: 9001,
    nombre: 'REPO PRUEBA',
    telefono: '3764000000',
    sal: 'prueba-7f3a',
    pin_hash: '67eeebdb36d7aa6df3f83852b6068be350f3325dbd1900155a5bfb4f82c42a13'
  },
  // Días que el repositor va a la empresa (1 lunes … 6 sábado). Si cae feriado, pasa al día hábil siguiente.
  oficina: { whatsapp: '', dias: [1, 3, 5] },
  feriados: ['2026-11-23', '2026-12-08', '2026-12-25'],
  // Lista para elegir al cargar un vencimiento (también se puede escribir a mano)
  articulos: [
    { codigo: 'P001', descripcion: 'ALFAJOR TRIPLE CHOCOLATE X 60G (PRUEBA)' },
    { codigo: 'P002', descripcion: 'GALLETITAS DULCES VAINILLA X 120G (PRUEBA)' },
    { codigo: 'P003', descripcion: 'CARAMELOS FRUTALES BOLSA X 800G (PRUEBA)' },
    { codigo: 'P004', descripcion: 'MERMELADA DURAZNO X 454G (PRUEBA)' },
    { codigo: 'P005', descripcion: 'TURRON DE MANI X 25G (PRUEBA)' },
    { codigo: 'P006', descripcion: 'BARRITA CEREAL FRUTILLA X 23G (PRUEBA)' }
  ],
  motivos: ['Negocio cerrado', 'No está el titular', 'No me dejaron reponer', 'Sin mercadería para reponer', 'Otro'],
  visitas: [
    // dia: 1 lunes … 6 sábado · horas = horas pedidas en el punto de venta
    { id: 1, cliente: 90001, nombre: 'AUTOSERVICIO LA ESQUINA (PRUEBA)', direccion: 'Av. Uruguay · Villa Sarita', lat: -27.3712, lng: -55.9015, dia: 1, turno: 'MAÑANA', horas: 3 },
    { id: 2, cliente: 90002, nombre: 'SUPER DON PEPE (PRUEBA)', direccion: 'Calle Junín · Centro', lat: -27.3650, lng: -55.8960, dia: 1, turno: 'MAÑANA', horas: 1.5 },
    { id: 3, cliente: 90003, nombre: 'MAXIKIOSCO EL SOL (PRUEBA)', direccion: 'Av. López Torres · Itaembé Guazú', lat: -27.4010, lng: -55.9320, dia: 1, turno: 'TARDE', horas: 2 },
    { id: 4, cliente: 90004, nombre: 'AUTOSERVICIO LOS PINOS (PRUEBA)', direccion: 'Av. Quaranta · Villa Cabello', lat: -27.4105, lng: -55.9150, dia: 1, turno: 'TARDE', horas: 1.5 },

    { id: 5, cliente: 90005, nombre: 'SUPER FAMILIA (PRUEBA)', direccion: 'Av. Jauretche · Itaembé Miní', lat: -27.4200, lng: -55.9400, dia: 2, turno: 'MAÑANA', horas: 3 },
    { id: 6, cliente: 90006, nombre: 'DESPENSA LA AMISTAD (PRUEBA)', direccion: 'Calle Entre Ríos · Centro', lat: -27.3690, lng: -55.8930, dia: 2, turno: 'MAÑANA', horas: 1 },
    { id: 7, cliente: 90007, nombre: 'AUTOSERVICIO SAN JORGE (PRUEBA)', direccion: 'Av. Tambor de Tacuarí · Villa Lanús', lat: -27.4300, lng: -55.9000, dia: 2, turno: 'TARDE', horas: 4 },

    { id: 8, cliente: 90008, nombre: 'SUPER EL TREBOL (PRUEBA)', direccion: 'Av. Cabred · Chacra 32', lat: -27.3800, lng: -55.9200, dia: 3, turno: 'MAÑANA', horas: 2 },
    { id: 9, cliente: 90009, nombre: 'AUTOSERVICIO LA ESQUINA (PRUEBA)', direccion: 'Av. Uruguay · Villa Sarita', lat: -27.3712, lng: -55.9015, dia: 3, turno: 'MAÑANA', horas: 2 },
    { id: 10, cliente: 90010, nombre: 'MINIMERCADO ROSITA (PRUEBA)', direccion: 'Calle Sarmiento · Centro', lat: -27.3640, lng: -55.8990, dia: 3, turno: 'TARDE', horas: 4 },

    { id: 11, cliente: 90011, nombre: 'SUPER DON PEPE (PRUEBA)', direccion: 'Calle Junín · Centro', lat: -27.3650, lng: -55.8960, dia: 4, turno: 'MAÑANA', horas: 2 },
    { id: 12, cliente: 90012, nombre: 'AUTOSERVICIO EL PUENTE (PRUEBA)', direccion: 'Av. Mitre · Villa Urquiza', lat: -27.3600, lng: -55.9100, dia: 4, turno: 'MAÑANA', horas: 2 },
    { id: 13, cliente: 90013, nombre: 'SUPER FAMILIA (PRUEBA)', direccion: 'Av. Jauretche · Itaembé Miní', lat: -27.4200, lng: -55.9400, dia: 4, turno: 'TARDE', horas: 4 },

    { id: 14, cliente: 90014, nombre: 'AUTOSERVICIO LOS PINOS (PRUEBA)', direccion: 'Av. Quaranta · Villa Cabello', lat: -27.4105, lng: -55.9150, dia: 5, turno: 'MAÑANA', horas: 3 },
    { id: 15, cliente: 90015, nombre: 'DESPENSA LA AMISTAD (PRUEBA)', direccion: 'Calle Entre Ríos · Centro', lat: -27.3690, lng: -55.8930, dia: 5, turno: 'MAÑANA', horas: 1 },
    { id: 16, cliente: 90016, nombre: 'AUTOSERVICIO SAN JORGE (PRUEBA)', direccion: 'Av. Tambor de Tacuarí · Villa Lanús', lat: -27.4300, lng: -55.9000, dia: 5, turno: 'TARDE', horas: 4 },

    { id: 17, cliente: 90017, nombre: 'SUPER EL TREBOL (PRUEBA)', direccion: 'Av. Cabred · Chacra 32', lat: -27.3800, lng: -55.9200, dia: 6, turno: 'MAÑANA', horas: 2 },
    { id: 18, cliente: 90018, nombre: 'MINIMERCADO ROSITA (PRUEBA)', direccion: 'Calle Sarmiento · Centro', lat: -27.3640, lng: -55.8990, dia: 6, turno: 'MAÑANA', horas: 2 }
  ]
}

/** Vencimientos de ejemplo (solo con "Probar con datos de ejemplo"): fechas a 75, 55, 25, 8 y -2 días de hoy para ver cada etapa */
function vencimientosPrueba() {
  const f = dias => { const d = new Date(); d.setDate(d.getDate() + dias); return d.toISOString().slice(0, 10) }
  const v = (n, cli, nombre, cod, desc, cant, dias) => ({ cliente: cli, cliente_nombre: nombre, codigo: cod, descripcion: desc, cantidad: cant, vence: f(dias), uid: 'demo-' + n })
  return [
    v(1, 90005, 'SUPER FAMILIA (PRUEBA)', 'P001', 'ALFAJOR TRIPLE CHOCOLATE X 60G (PRUEBA)', 24, 75),
    v(2, 90005, 'SUPER FAMILIA (PRUEBA)', 'P004', 'MERMELADA DURAZNO X 454G (PRUEBA)', 6, 55),
    v(3, 90006, 'DESPENSA LA AMISTAD (PRUEBA)', 'P002', 'GALLETITAS DULCES VAINILLA X 120G (PRUEBA)', 12, 25),
    v(4, 90007, 'AUTOSERVICIO SAN JORGE (PRUEBA)', 'P005', 'TURRON DE MANI X 25G (PRUEBA)', 40, 8),
    v(5, 90010, 'MINIMERCADO ROSITA (PRUEBA)', 'P006', 'BARRITA CEREAL FRUTILLA X 23G (PRUEBA)', 3, -2)
  ]
}
