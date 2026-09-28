import { configureStore, createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type ProductoCotizacion = {
  id: number;
  codigo: string;
  descripcionGeneral: string;
  precio: number;
  imagen: string;
  cantidad: number;
  // Un mismo producto puede pedirse en varios colores dentro de la misma cotización: cada color
  // es una línea independiente en el carrito, por eso la identidad de una línea es
  // (id, colorId, apliqueId).
  colorId?: number;
  colorNombre?: string;
  colorHex?: string;
  // El aplique es opcional (a diferencia del color, que si el producto lo tiene es obligatorio).
  apliqueId?: number;
  apliqueNombre?: string;
  apliqueHex?: string;
};

// Dos líneas del carrito son "el mismo ítem" si son el mismo producto Y el mismo color Y el mismo
// aplique (o ninguno tiene). Se usa en vez de comparar solo `id` para no fusionar rojo con azul, ni
// una línea con aplique con otra sin él.
function mismoItem(
  a: { id: number; colorId?: number; apliqueId?: number },
  b: { id: number; colorId?: number; apliqueId?: number },
) {
  return a.id === b.id && (a.colorId ?? null) === (b.colorId ?? null) && (a.apliqueId ?? null) === (b.apliqueId ?? null);
}

export type ClienteCotizacion = {
  id: number;
  nombre: string;
};

type EstadoCotizacion = {
  cliente: ClienteCotizacion | null;
  items: ProductoCotizacion[];
  descuentoActivo: boolean;
  descuentoPorcentaje: number;
  esMinorista: boolean;
};

const estadoInicial: EstadoCotizacion = {
  cliente: null,
  items: [],
  descuentoActivo: false,
  descuentoPorcentaje: 0,
  esMinorista: false,
};

export const STORAGE_KEY = "cotizacion_estado";

export function leerEstadoPersistido(): EstadoCotizacion {
  if (typeof window === "undefined") {
    return estadoInicial;
  }

  try {
    const estadoGuardado = window.localStorage.getItem(STORAGE_KEY);

    if (!estadoGuardado) {
      return estadoInicial;
    }

    const estadoParseado = JSON.parse(estadoGuardado) as Partial<EstadoCotizacion>;

    return {
      cliente: estadoParseado.cliente ?? null,
      items: Array.isArray(estadoParseado.items) ? estadoParseado.items : [],
      descuentoActivo: Boolean(estadoParseado.descuentoActivo),
      descuentoPorcentaje: Number(estadoParseado.descuentoPorcentaje ?? 0),
      esMinorista: Boolean(estadoParseado.esMinorista),
    };
  } catch {
    return estadoInicial;
  }
}

const sliceCotizacion = createSlice({
  name: "cotizacion",
  initialState: estadoInicial,
  reducers: {
    // Reemplaza todo el estado por el guardado en localStorage. Se despacha una sola vez, después del
    // montaje (ver CotizacionesLayout), nunca en el estado inicial del store: si el store arrancara ya
    // con lo del localStorage, el primer render del cliente no coincidiría con el HTML del servidor
    // (que siempre parte vacío) y React marcaría un error de hidratación.
    cargarEstadoPersistido: (_estado, accion: PayloadAction<EstadoCotizacion>) => accion.payload,
    seleccionarCliente: (estado, accion: PayloadAction<ClienteCotizacion | null>) => {
      estado.cliente = accion.payload;
    },
    agregarProducto: (estado, accion: PayloadAction<Omit<ProductoCotizacion, "cantidad">>) => {
      const productoExistente = estado.items.find((item) => mismoItem(item, accion.payload));

      if (productoExistente) {
        productoExistente.cantidad += 1;
        return;
      }

      estado.items.push({
        ...accion.payload,
        cantidad: 1,
      });
    },
    actualizarCantidad: (estado, accion: PayloadAction<{ id: number; colorId?: number; apliqueId?: number; cantidad: number }>) => {
      const producto = estado.items.find((item) => mismoItem(item, accion.payload));

      if (!producto) {
        return;
      }

      producto.cantidad = Math.max(1, accion.payload.cantidad);
    },
    eliminarProducto: (estado, accion: PayloadAction<{ id: number; colorId?: number; apliqueId?: number }>) => {
      estado.items = estado.items.filter((item) => !mismoItem(item, accion.payload));
    },
    limpiarCarrito: (estado) => {
      estado.items = [];
      estado.cliente = null;
      estado.descuentoActivo = false;
      estado.descuentoPorcentaje = 0;
      estado.esMinorista = false;
    },
    activarDescuento: (estado, accion: PayloadAction<boolean>) => {
      estado.descuentoActivo = accion.payload;

      if (!accion.payload) {
        estado.descuentoPorcentaje = 0;
      }
    },
    cambiarDescuento: (estado, accion: PayloadAction<number>) => {
      estado.descuentoPorcentaje = Math.max(0, Math.min(100, accion.payload));
    },
    // Minorista y descuento son excluyentes: al activar minorista se apaga cualquier descuento activo.
    activarMinorista: (estado, accion: PayloadAction<boolean>) => {
      estado.esMinorista = accion.payload;

      if (accion.payload) {
        estado.descuentoActivo = false;
        estado.descuentoPorcentaje = 0;
      }
    },
  },
});

export const store = configureStore({
  reducer: {
    cotizacion: sliceCotizacion.reducer,
  },
});

store.subscribe(() => {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store.getState().cotizacion));
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const {
  cargarEstadoPersistido,
  seleccionarCliente,
  agregarProducto,
  actualizarCantidad,
  eliminarProducto,
  limpiarCarrito,
  activarDescuento,
  cambiarDescuento,
  activarMinorista,
} = sliceCotizacion.actions;
