// pdfmake 0.3.x no publica tipos propios (ni son compatibles los de @types/pdfmake, hechos para la
// API 0.2.x basada en callbacks). Se declara aquí solo lo que este proyecto usa.
declare module "pdfmake/js/index.js" {
  export type FuenteDescriptor = {
    normal?: string;
    bold?: string;
    italics?: string;
    bolditalics?: string;
  };

  export type DocumentoPdfMake = {
    getBuffer(): Promise<Buffer>;
  };

  export type PdfMake = {
    setFonts(fuentes: Record<string, FuenteDescriptor>): void;
    setLocalAccessPolicy(politica: (ruta: string) => boolean): void;
    setUrlAccessPolicy(politica: (url: string) => boolean): void;
    // El docDefinition de pdfmake es un árbol de contenido muy polimórfico; no vale la pena tipar
    // toda su forma aquí, así que se recibe como estructura abierta.
    createPdf(docDefinition: Record<string, unknown>): DocumentoPdfMake;
  };

  const pdfMake: PdfMake;
  export default pdfMake;
}
