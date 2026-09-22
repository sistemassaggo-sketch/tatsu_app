import { readFile } from "node:fs/promises";
import path from "node:path";
import JsBarcode from "jsbarcode";
import pdfMake from "pdfmake/js/index.js";
import { formatearFechaHora } from "@/lib/fechas";

// pdfmake genera el PDF con pdfkit por debajo, mucho más rápido que pdf-lib para este documento
// (pdf-lib volvía a decodificar y reincrustar las imágenes del encabezado en cada llamada). Se usan
// las fuentes estándar del PDF (Helvetica) para no tener que incrustar ningún archivo de fuente.
pdfMake.setFonts({
  Helvetica: { normal: "Helvetica", bold: "Helvetica-Bold", italics: "Helvetica-Oblique", bolditalics: "Helvetica-BoldOblique" },
});
// No se referencia ninguna ruta de archivo ni URL controlada por el usuario (solo los nombres de las
// fuentes estándar y las imágenes ya cargadas en memoria), así que se permite todo para evitar el
// aviso de arranque de pdfmake sobre no tener una política de acceso configurada.
pdfMake.setLocalAccessPolicy(() => true);
pdfMake.setUrlAccessPolicy(() => true);

const ANCHO = 612;
const MARGEN = 30;
const NEGRO = "#000000";
const BLANCO = "#ffffff";
const GRIS = "#48546a";
const ROJO_VENDEDOR = "#ff2a0b";
const FONDO_BLOQUES = "#dbe0d6";
const CONTORNO_BLOQUES = "#27527d";

// Datos fijos del vendedor: son los mismos en todos los documentos, no vienen de la base de datos.
const CONTACTO_VENDEDOR_FIJO = "304 6091 545";
const DIRECCION_VENDEDOR_FIJA = "AV 1 MAYO #28-07";

const AVISO_CONFIRMACION = "RECUERDE QUE PARA PROCEDER CON EL ALISTAMIENTO DE SU PEDIDO DEBE DE CONFIRMAR ESTA COTIZACIÓN";
const AVISO_CONFIRMACION_PRODUCTOS =
  "IMPORTANTE VERIFIQUE LA DESCRIPCION DE SUS PRODUCTOS ANTES DE CONFIRMAR DE LO CONTRARIO NO SE RESPONDE POR ALGUN CAMBIO";

const IMG = 64; // tamaño mostrado de cada logo
const ANCHO_RECEPCION = 120;

// --- Carga de imágenes: una sola vez por proceso ---
// Los logos de origen (public/brand-logo.png y public/sm_brand-logo.png) pesan varios megapíxeles
// (uno de ellos ~4060×4060 px) aunque en el PDF se muestran a 64×64; decodificarlos completos en
// cada PDF era lo que hacía lenta la generación con pdf-lib. En vez de reducirlos en cada arranque
// del proceso, se guardó una copia ya reducida (128×128, el doble del tamaño mostrado, para verse
// nítida) como public/brand-logo-pdf.png y public/sm_brand-logo-pdf.png; aquí solo se leen esos
// archivos (unos pocos KB) y se cachean en memoria la primera vez que se generan un PDF.
let imagenesEncabezadoPromise: Promise<{ logo: string; logoSm: string }> | null = null;

function obtenerImagenesEncabezado() {
  if (!imagenesEncabezadoPromise) {
    imagenesEncabezadoPromise = Promise.all([
      readFile(path.join(process.cwd(), "public", "brand-logo-pdf.png")),
      readFile(path.join(process.cwd(), "public", "sm_brand-logo-pdf.png")),
    ])
      .then(([logoBuf, logoSmBuf]) => ({
        logo: `data:image/png;base64,${logoBuf.toString("base64")}`,
        logoSm: `data:image/png;base64,${logoSmBuf.toString("base64")}`,
      }))
      .catch((error) => {
        imagenesEncabezadoPromise = null; // si falla, se reintenta en la próxima llamada
        throw error;
      });
  }

  return imagenesEncabezadoPromise;
}

// --- Código de barras: mismo dato binario que antes (JsBarcode en modo "objeto", sin lienzo), pero
// convertido a un SVG (vectorial) en vez de cientos de rectángulos dibujados a mano. ---
function generarSvgCodigoBarras(valor: string) {
  const destino: { encodings?: { data: string }[] } = {};
  JsBarcode(destino as never, valor, { format: "CODE128" });
  const binario = destino.encodings?.map((codificacion) => codificacion.data).join("") ?? "";

  let barras = "";
  for (let i = 0; i < binario.length; i++) {
    if (binario[i] === "1") {
      barras += `<rect x="${i}" y="0" width="1" height="10"/>`;
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${binario.length} 10" fill="#000">${barras}</svg>`;
}

// Reduce el tamaño de letra si el texto no cabe en el ancho disponible (para que los números de
// cuenta no se desborden de su celda). Estimación de ancho por carácter, sin medir con una fuente real.
function tamanoAjustado(valor: string, anchoDisponible: number, tamanoBase: number) {
  let tamano = tamanoBase;

  while (tamano > 6 && valor.length * tamano * 0.52 > anchoDisponible) {
    tamano -= 0.5;
  }

  return tamano;
}

// Bordes e interior de color uniforme #27527D para todos los bloques del documento.
function estiloBloque(relleno?: string) {
  return {
    hLineWidth: () => 1,
    vLineWidth: () => 1,
    hLineColor: () => CONTORNO_BLOQUES,
    vLineColor: () => CONTORNO_BLOQUES,
    fillColor: () => relleno,
    paddingLeft: () => 8,
    paddingRight: () => 8,
    paddingTop: () => 5,
    paddingBottom: () => 5,
  };
}

// Etiqueta en negrita seguida de su valor en texto normal (salvo que se pida en negrita), en una sola línea.
function etiquetaValor(etiqueta: string, valor: string, tamano: number, valorNegrita = false) {
  return {
    text: [
      { text: `${etiqueta} `, bold: true, fontSize: tamano, color: NEGRO },
      { text: valor, bold: valorNegrita, fontSize: tamano, color: NEGRO },
    ],
  };
}

export type DatosDocumentoPdf = {
  /** Subtítulo del encabezado, p. ej. "DOCUMENTO EQUIVALENTE A COTIZACIÓN". */
  titulo: string;
  /** Código de la cotización/legalización (se usa solo para el nombre del archivo, no se muestra en el PDF). */
  codigo: string;
  /** Id de la cotización en la base de datos (bloque CONSECUTIVO). */
  cotizacionId: number;
  fecha: Date;
  /** Vendedor que creó la cotización. */
  vendedor: string;
  cliente: { id: number; nombre: string; personaContacto: string; telefono: string; direccion: string; ciudad: string };
  items: {
    id: number;
    cantidad: number;
    precioUnitario: unknown;
    subtotal: unknown;
    eliminado?: boolean;
    producto: { codigo: string; descripcionOriginal: string };
  }[];
  descuentoPorcentaje: number;
  total?: unknown;
};

export async function generarPdfDocumento(datos: DatosDocumentoPdf) {
  const { cliente } = datos;
  const subtotal = datos.items.filter((item) => !item.eliminado).reduce((suma, item) => suma + Number(item.subtotal), 0);
  const porcentajeDescuento = datos.descuentoPorcentaje;
  const descuento = (subtotal * porcentajeDescuento) / 100;
  const total = datos.total != null ? Number(datos.total) : subtotal - descuento;

  const { logo, logoSm } = await obtenerImagenesEncabezado();
  const fecha = formatearFechaHora(datos.fecha);

  const formatearCop = (valor: number) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(valor);

  // --- Encabezado: se repite en todas las páginas mediante la función `header` de pdfmake. ---
  const encabezado = (currentPage: number, pageCount: number) => ({
    margin: [MARGEN, 20, MARGEN, 0] as [number, number, number, number],
    stack: [
      {
        text: `Página ${currentPage} de ${pageCount}`,
        fontSize: 10,
        bold: true,
        color: NEGRO,
        alignment: "right" as const,
        margin: [0, 0, 0, 6] as [number, number, number, number],
      },
      {
        columnGap: 10,
        columns: [
          {
            width: 3 * 8 + IMG * 2,
            table: {
              body: [[{ image: "logo", width: IMG, height: IMG }, { image: "logoSm", width: IMG, height: IMG }]],
            },
            layout: estiloBloque(BLANCO),
          },
          {
            width: "*",
            stack: [
              { text: datos.titulo, fontSize: 8, bold: true, color: NEGRO, alignment: "center" as const },
              { text: "TATSU MOTOS", fontSize: 28, bold: true, color: NEGRO, alignment: "center" as const, margin: [0, 6, 0, 0] as [number, number, number, number] },
            ],
          },
          {
            width: ANCHO_RECEPCION,
            table: {
              widths: ["*"],
              body: [
                [{ text: "RECEPCIÓN COT.", bold: true, fontSize: 10, color: NEGRO }],
                [{ text: fecha, fontSize: 10, color: NEGRO }],
              ],
            },
            layout: estiloBloque(FONDO_BLOQUES),
          },
        ],
      },
    ],
  });

  // --- Fila VENDEDOR / CLIENTE (solo aparece una vez, al principio del contenido) ---
  const bloqueVendedor = {
    table: {
      widths: ["*"],
      body: [
        [{ text: "VENDEDOR", bold: true, fontSize: 10, color: ROJO_VENDEDOR }],
        [
          {
            stack: [
              { text: datos.vendedor, fontSize: 10, color: NEGRO, margin: [0, 0, 0, 4] as [number, number, number, number] },
              etiquetaValor("Nº CONTACTO:", CONTACTO_VENDEDOR_FIJO, 9),
              etiquetaValor("DIRECCIÓN:", DIRECCION_VENDEDOR_FIJA, 9),
            ],
          },
        ],
      ],
    },
    layout: estiloBloque(),
  };

  const bloqueCliente = {
    table: {
      widths: ["*"],
      body: [
        [
          {
            columns: [
              { width: "*", ...etiquetaValor("CLIENTE:", cliente.nombre, 10) },
              { width: 90, svg: generarSvgCodigoBarras(String(cliente.id)), height: 14, margin: [0, 1, 0, 0] as [number, number, number, number] },
            ],
          },
        ],
        [
          {
            stack: [
              etiquetaValor("PERSONA DE CONTACTO:", cliente.personaContacto, 9),
              etiquetaValor("Nº CONTACTO:", cliente.telefono, 9),
              etiquetaValor("DIRECCIÓN:", cliente.direccion, 9),
              etiquetaValor("ZONA:", cliente.ciudad, 9),
            ],
          },
        ],
      ],
    },
    layout: {
      ...estiloBloque(),
      // La primera fila (CLIENTE + código de barras) lleva fondo #DBE0D6; el resto, blanco.
      fillColor: (rowIndex: number) => (rowIndex === 0 ? FONDO_BLOQUES : null),
    },
  };

  // --- Fila CONSECUTIVO / FECHA DE ENTREGA (también una sola vez) ---
  const bloqueDosColumnas = (etiqueta: string, valor: string, valorNegrita: boolean) => ({
    table: {
      widths: [130, "*"],
      body: [[{ text: etiqueta, bold: true, fontSize: 10, color: NEGRO }, { text: valor, bold: valorNegrita, fontSize: 10, color: NEGRO }]],
    },
    layout: {
      ...estiloBloque(),
      fillColor: (_rowIndex: number, _node: unknown, columnIndex: number) => (columnIndex === 0 ? FONDO_BLOQUES : null),
    },
  });

  // --- Tabla de productos: el código de barras de cada ítem va en la misma columna que su código. ---
  const encabezadoTablaFila = ["Código", "Descripción", "Uds.", "Precio", "Importe"].map((texto, indice) => ({
    text: texto,
    bold: true,
    fontSize: 11,
    color: CONTORNO_BLOQUES,
    alignment: indice >= 2 ? ("right" as const) : ("left" as const),
  }));

  const filasProductos = datos.items.map((item) => {
    const color = item.eliminado ? GRIS : NEGRO;
    // Se recorta la descripción como salvaguarda: pdfmake ajusta el texto solo, así que no hace
    // falta partirla en líneas a mano como con pdf-lib, solo evitar filas desmesuradas.
    const descripcion =
      item.producto.descripcionOriginal.length > 160
        ? `${item.producto.descripcionOriginal.slice(0, 160)}…`
        : item.producto.descripcionOriginal;

    return [
      {
        stack: [
          { svg: generarSvgCodigoBarras(String(item.id)), width: 80, height: 16 },
          { text: item.producto.codigo, fontSize: 7, color, alignment: "center" as const, margin: [0, 2, 0, 0] as [number, number, number, number] },
        ],
      },
      { text: descripcion, fontSize: 9.5, color },
      { text: String(item.cantidad), fontSize: 10, color, alignment: "right" as const },
      { text: formatearCop(Number(item.precioUnitario)), fontSize: 10, color, alignment: "right" as const },
      { text: item.eliminado ? "Eliminado" : formatearCop(Number(item.subtotal)), fontSize: 10, color, alignment: "right" as const },
    ];
  });

  const tablaProductos = {
    table: {
      headerRows: 1,
      widths: [95, "*", 40, 70, 80],
      body: [encabezadoTablaFila, ...filasProductos],
    },
    layout: {
      hLineWidth: () => 0.75,
      vLineWidth: () => 0,
      hLineColor: () => CONTORNO_BLOQUES,
      fillColor: (rowIndex: number) => (rowIndex === 0 ? FONDO_BLOQUES : null),
      paddingLeft: () => 6,
      paddingRight: () => 6,
      paddingTop: () => 6,
      paddingBottom: () => 6,
    },
  };

  // --- Pie de página: comentarios + medios de pago/total + redes sociales, solo en la última página. ---
  const anchoCeldaPago = 175;
  const pie = (currentPage: number, pageCount: number) => {
    if (currentPage !== pageCount) {
      return null;
    }

    return {
      margin: [MARGEN, 10, MARGEN, 0] as [number, number, number, number],
      stack: [
        // Bloque de comentarios.
        {
          table: {
            widths: ["*"],
            body: [
              [{ text: "COMENTARIOS", bold: true, fontSize: 11, color: CONTORNO_BLOQUES }],
              [{ text: " ", fontSize: 30 }], // espacio en blanco para anotar
            ],
          },
          layout: estiloBloque(FONDO_BLOQUES),
        },
        // Medios de pago (izquierda) y total (derecha).
        {
          margin: [0, 10, 0, 0] as [number, number, number, number],
          columns: [
            {
              width: 350,
              table: {
                widths: [anchoCeldaPago, anchoCeldaPago],
                body: [
                  [{ text: AVISO_CONFIRMACION_PRODUCTOS, bold: true, fontSize: 9, color: ROJO_VENDEDOR, colSpan: 2 }, {}],
                  [
                    {
                      stack: [
                        { text: "CUENTA AHORROS BANCOLOMBIA", bold: true, color: ROJO_VENDEDOR, fontSize: tamanoAjustado("CUENTA AHORROS BANCOLOMBIA", anchoCeldaPago - 16, 10) },
                        { text: "N° 108 944 02 682", bold: true, color: ROJO_VENDEDOR, fontSize: tamanoAjustado("N° 108 944 02 682", anchoCeldaPago - 16, 10) },
                      ],
                    },
                    {
                      stack: [
                        { text: "NEQUI PARA PAGOS", bold: true, color: NEGRO, fontSize: tamanoAjustado("NEQUI PARA PAGOS", anchoCeldaPago - 16, 10) },
                        { text: "312 458 4286", bold: true, color: NEGRO, fontSize: tamanoAjustado("312 458 4286", anchoCeldaPago - 16, 10) },
                      ],
                    },
                  ],
                ],
              },
              layout: estiloBloque(),
            },
            {
              width: "*",
              table: {
                widths: ["*"],
                body: [
                  [{ text: "TOTAL", bold: true, fontSize: 11, color: CONTORNO_BLOQUES, alignment: "center" as const }],
                  [{ text: formatearCop(total), bold: true, fontSize: 16, alignment: "center" as const, margin: [0, 6, 0, 6] as [number, number, number, number] }],
                ],
              },
              layout: {
                ...estiloBloque(),
                fillColor: (rowIndex: number) => (rowIndex === 0 ? FONDO_BLOQUES : null),
              },
            },
          ],
          columnGap: 12,
        },
        // Redes sociales (sin cambios respecto al diseño anterior).
        {
          text: "@tatsumotosoficial   @sm.racingoficial",
          bold: true,
          fontSize: 12,
          color: NEGRO,
          margin: [0, 12, 0, 0] as [number, number, number, number],
        },
      ],
    };
  };

  const contenido: unknown[] = [
    {
      columns: [{ width: "*", ...bloqueVendedor }, { width: "*", ...bloqueCliente }],
      columnGap: 12,
    },
    {
      margin: [0, 10, 0, 16] as [number, number, number, number],
      columns: [
        { width: "*", ...bloqueDosColumnas("CONSECUTIVO N°", `COT N° ${datos.cotizacionId} - ${datos.fecha.getFullYear()}`, false) },
        { width: "*", ...bloqueDosColumnas("FECHA_ENTREGA", "3-4 DÍAS HÁBILES", true) },
      ],
      columnGap: 12,
    },
    {
      text: AVISO_CONFIRMACION,
      bold: true,
      fontSize: 11,
      color: ROJO_VENDEDOR,
      margin: [0, 0, 0, 10] as [number, number, number, number],
    },
    tablaProductos,
    {
      margin: [0, 14, 0, 0] as [number, number, number, number],
      columns: [
        { width: "*", text: "" },
        { width: 100, text: "Subtotal", bold: true, fontSize: 12 },
        { width: 100, text: formatearCop(subtotal), fontSize: 12, alignment: "right" as const },
      ],
    },
  ];

  if (porcentajeDescuento > 0) {
    contenido.push({
      columns: [
        { width: "*", text: "" },
        { width: 100, text: `Descuento (${porcentajeDescuento}%)`, bold: true, fontSize: 12 },
        { width: 100, text: `-${formatearCop(descuento)}`, fontSize: 12, alignment: "right" as const },
      ],
    });
  }

  const docDefinition = {
    pageSize: { width: ANCHO, height: 792 },
    pageMargins: [MARGEN, 130, MARGEN, 230] as [number, number, number, number],
    defaultStyle: { font: "Helvetica" },
    images: { logo, logoSm },
    header: encabezado,
    footer: pie,
    content: contenido,
  };

  const documento = pdfMake.createPdf(docDefinition);
  return documento.getBuffer();
}
