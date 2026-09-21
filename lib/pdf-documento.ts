import { readFile } from "node:fs/promises";
import path from "node:path";
import JsBarcode from "jsbarcode";
import { formatearFechaHora } from "@/lib/fechas";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

const ANCHO = 612;
const ALTO = 792;
const MARGEN = 30;
const AZUL = rgb(0.09, 0.42, 0.53);
const NARANJA = rgb(0.92, 0.36, 0.15);
const GRIS = rgb(0.28, 0.33, 0.41);
const ALTO_FILA = 38;

// Columnas de la tabla: x inicial de cada una.
const COL = { codigo: MARGEN + 4, descripcion: 100, unidades: 300, precio: 345, importe: 410, barras: 480 };

export type DatosDocumentoPdf = {
  /** Subtítulo del encabezado, p. ej. "COTIZACIÓN". */
  titulo: string;
  /** Código que se muestra y con el que se genera el código de barras del encabezado. */
  codigo: string;
  fecha: Date;
  /** Vendedor que creó la cotización. */
  vendedor: string;
  cliente: { nombre: string; personaContacto: string; telefono: string; direccion: string; ciudad: string };
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
  const { codigo, cliente } = datos;
  const subtotal = datos.items.filter((item) => !item.eliminado).reduce((suma, item) => suma + Number(item.subtotal), 0);
  const porcentajeDescuento = datos.descuentoPorcentaje;
  const descuento = (subtotal * porcentajeDescuento) / 100;
  const total = datos.total != null ? Number(datos.total) : subtotal - descuento;

  const pdf = await PDFDocument.create();
  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const negrita = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = await pdf.embedPng(await readFile(path.join(process.cwd(), "public", "brand-logo.png")));

  const texto = (valor: string, fuente: PDFFont) => {
    const permitidos = fuente.getCharacterSet();
    return Array.from(valor.normalize("NFC"))
      .map((caracter) => (permitidos.includes(caracter.codePointAt(0)!) ? caracter : "?"))
      .join("");
  };

  const escribir = (
    pagina: PDFPage,
    valor: string,
    x: number,
    y: number,
    opciones: { fuente?: PDFFont; tamano?: number; color?: ReturnType<typeof rgb>; alinearDerecha?: boolean } = {},
  ) => {
    const fuente = opciones.fuente ?? normal;
    const tamano = opciones.tamano ?? 9;
    const limpio = texto(valor, fuente);
    const xFinal = opciones.alinearDerecha ? x - fuente.widthOfTextAtSize(limpio, tamano) : x;
    pagina.drawText(limpio, { x: xFinal, y, size: tamano, font: fuente, color: opciones.color ?? rgb(0.07, 0.09, 0.15) });
  };

  const partirLineas = (valor: string, fuente: PDFFont, tamano: number, anchoMaximo: number) => {
    const lineas: string[] = [];
    let actual = "";

    for (const palabra of texto(valor, fuente).split(/\s+/).filter(Boolean)) {
      const candidata = actual ? `${actual} ${palabra}` : palabra;

      if (fuente.widthOfTextAtSize(candidata, tamano) > anchoMaximo && actual) {
        lineas.push(actual);
        actual = palabra;
      } else {
        actual = candidata;
      }
    }

    if (actual) {
      lineas.push(actual);
    }

    return lineas.slice(0, 3);
  };

  const dibujarCodigoBarras = (pagina: PDFPage, valor: string, x: number, y: number, ancho: number, alto: number) => {
    const destino: { encodings?: { data: string }[] } = {};
    JsBarcode(destino as never, valor, { format: "CODE128" });
    const binario = destino.encodings?.map((codificacion) => codificacion.data).join("") ?? "";
    const modulo = ancho / binario.length;

    for (let i = 0; i < binario.length; i++) {
      if (binario[i] === "1") {
        pagina.drawRectangle({ x: x + i * modulo, y, width: modulo, height: alto, color: rgb(0, 0, 0) });
      }
    }
  };

  const formatearCop = (valor: number) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(valor);

  const fecha = formatearFechaHora(datos.fecha);

  const dibujarEncabezado = (pagina: PDFPage) => {
    pagina.drawImage(logo, { x: MARGEN, y: ALTO - 80, width: 50, height: 50 });
    escribir(pagina, "TATSU MOTOS", 92, ALTO - 55, { fuente: negrita, tamano: 24, color: NARANJA });
    escribir(pagina, datos.titulo, 92, ALTO - 72, { fuente: negrita, tamano: 10, color: AZUL });
    escribir(pagina, `Código: ${codigo}`, ANCHO - MARGEN, ALTO - 45, { fuente: negrita, tamano: 11, alinearDerecha: true });
    escribir(pagina, fecha, ANCHO - MARGEN, ALTO - 60, { tamano: 9, alinearDerecha: true, color: GRIS });
    dibujarCodigoBarras(pagina, codigo, ANCHO - MARGEN - 200, ALTO - 92, 200, 26);
  };

  const dibujarEncabezadoTabla = (pagina: PDFPage, y: number) => {
    pagina.drawRectangle({ x: MARGEN, y: y - 6, width: ANCHO - MARGEN * 2, height: 20, color: AZUL });
    const blanco = rgb(1, 1, 1);
    escribir(pagina, "Código", COL.codigo, y, { fuente: negrita, color: blanco });
    escribir(pagina, "Descripción", COL.descripcion, y, { fuente: negrita, color: blanco });
    escribir(pagina, "Uds.", COL.unidades + 20, y, { fuente: negrita, color: blanco, alinearDerecha: true });
    escribir(pagina, "Precio", COL.precio + 55, y, { fuente: negrita, color: blanco, alinearDerecha: true });
    escribir(pagina, "Importe", COL.importe + 60, y, { fuente: negrita, color: blanco, alinearDerecha: true });
    escribir(pagina, "Código de barras", COL.barras, y, { fuente: negrita, color: blanco });
  };

  let pagina = pdf.addPage([ANCHO, ALTO]);
  dibujarEncabezado(pagina);

  // Datos del cliente
  let y = ALTO - 110;
  pagina.drawRectangle({
    x: MARGEN,
    y: y - 62,
    width: ANCHO - MARGEN * 2,
    height: 70,
    borderColor: rgb(0.8, 0.84, 0.88),
    borderWidth: 1,
  });
  escribir(pagina, "CLIENTE:", MARGEN + 8, y - 8, { fuente: negrita });
  escribir(pagina, cliente.nombre, MARGEN + 70, y - 8);
  escribir(pagina, "PERSONA DE CONTACTO:", MARGEN + 8, y - 24, { fuente: negrita });
  escribir(pagina, cliente.personaContacto, MARGEN + 130, y - 24);
  escribir(pagina, "Nº CONTACTO:", 340, y - 24, { fuente: negrita });
  escribir(pagina, cliente.telefono, 415, y - 24);
  escribir(pagina, "DIRECCIÓN:", MARGEN + 8, y - 40, { fuente: negrita });
  escribir(pagina, cliente.direccion, MARGEN + 70, y - 40);
  escribir(pagina, "ZONA:", MARGEN + 8, y - 56, { fuente: negrita });
  escribir(pagina, cliente.ciudad, MARGEN + 70, y - 56);
  escribir(pagina, "VENDEDOR:", 340, y - 56, { fuente: negrita });
  escribir(pagina, datos.vendedor, 400, y - 56);

  y -= 100;
  dibujarEncabezadoTabla(pagina, y);
  y -= 10;

  for (const item of datos.items) {
    if (y - ALTO_FILA < 170) {
      pagina = pdf.addPage([ANCHO, ALTO]);
      dibujarEncabezado(pagina);
      y = ALTO - 110;
      dibujarEncabezadoTabla(pagina, y);
      y -= 10;
    }

    const yFila = y - ALTO_FILA;
    const colorTexto = item.eliminado ? GRIS : undefined;
    pagina.drawLine({
      start: { x: MARGEN, y: yFila },
      end: { x: ANCHO - MARGEN, y: yFila },
      thickness: 0.5,
      color: rgb(0.8, 0.84, 0.88),
    });

    escribir(pagina, item.producto.codigo, COL.codigo, y - 14, { fuente: negrita, tamano: 8, color: colorTexto });
    partirLineas(item.producto.descripcionOriginal, normal, 7.5, 190).forEach((linea, indice) => {
      escribir(pagina, linea, COL.descripcion, y - 12 - indice * 9, { tamano: 7.5, color: colorTexto });
    });
    escribir(pagina, String(item.cantidad), COL.unidades + 20, y - 14, { alinearDerecha: true, color: colorTexto });
    escribir(pagina, formatearCop(Number(item.precioUnitario)), COL.precio + 55, y - 14, { alinearDerecha: true, color: colorTexto });
    escribir(pagina, item.eliminado ? "Eliminado" : formatearCop(Number(item.subtotal)), COL.importe + 60, y - 14, {
      alinearDerecha: true,
      color: colorTexto,
    });

    dibujarCodigoBarras(pagina, String(item.id), COL.barras, yFila + 12, 100, 18);
    escribir(pagina, String(item.id), COL.barras + 50 - normal.widthOfTextAtSize(String(item.id), 7) / 2, yFila + 3, { tamano: 7 });

    y = yFila;
  }

  // Totales (si no caben, en una página nueva)
  if (y < 190) {
    pagina = pdf.addPage([ANCHO, ALTO]);
    dibujarEncabezado(pagina);
    y = ALTO - 120;
  }

  y -= 20;
  escribir(pagina, "Subtotal", 410, y, { fuente: negrita });
  escribir(pagina, formatearCop(subtotal), ANCHO - MARGEN, y, { alinearDerecha: true });

  if (porcentajeDescuento > 0) {
    y -= 16;
    escribir(pagina, `Descuento (${porcentajeDescuento}%)`, 410, y, { fuente: negrita });
    escribir(pagina, `-${formatearCop(descuento)}`, ANCHO - MARGEN, y, { alinearDerecha: true });
  }

  y -= 22;
  escribir(pagina, "TOTAL", 410, y, { fuente: negrita, tamano: 13, color: AZUL });
  escribir(pagina, formatearCop(total), ANCHO - MARGEN, y, { fuente: negrita, tamano: 13, alinearDerecha: true, color: AZUL });

  // Pie con datos de pago (tomados del documento de referencia)
  escribir(pagina, "IMPORTANTE VERIFIQUE LA DESCRIPCIÓN DE SUS PRODUCTOS ANTES DE CONFIRMAR", MARGEN, 95, { fuente: negrita, tamano: 8 });
  escribir(pagina, "DE LO CONTRARIO NO SE RESPONDE POR ALGÚN CAMBIO", MARGEN, 84, { fuente: negrita, tamano: 8 });
  escribir(pagina, "CUENTA AHORROS BANCOLOMBIA N° 108 944 02 682", MARGEN, 62, { fuente: negrita, tamano: 9 });
  escribir(pagina, "NEQUI PARA PAGOS: 312 458 4286", 340, 62, { fuente: negrita, tamano: 9 });
  escribir(pagina, "@tatsumotosoficial   @sm.racingoficial", MARGEN, 40, { tamano: 9, color: GRIS });

  return pdf.save();
}
