import { configureStore, createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type ProductoCotizacion = {
  id: number;
  codigo: string;
  descripcionGeneral: string;
  precio: number;
  imagen: string;
  cantidad: number;
};

export type ClienteCotizacion = {
  id: number;
  nombre: string;
};

type EstadoCotizacion = {
  cliente: ClienteCotizacion | null;
  items: ProductoCotizacion[];
  descuentoActivo: boolean;
  descuentoPorcentaje: number;
};

const estadoInicial: EstadoCotizacion = {
  cliente: null,
  items: [],
  descuentoActivo: false,
  descuentoPorcentaje: 0,
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
    };
  } catch {
    return estadoInicial;
  }
}

function cargarEstadoPersistido(): EstadoCotizacion {
  return leerEstadoPersistido();
}

const sliceCotizacion = createSlice({
  name: "cotizacion",
  initialState: estadoInicial,
  reducers: {
    seleccionarCliente: (estado, accion: PayloadAction<ClienteCotizacion | null>) => {
      estado.cliente = accion.payload;
    },
    agregarProducto: (estado, accion: PayloadAction<Omit<ProductoCotizacion, "cantidad">>) => {
      const productoExistente = estado.items.find((item) => item.id === accion.payload.id);

      if (productoExistente) {
        productoExistente.cantidad += 1;
        return;
      }

      estado.items.push({
        ...accion.payload,
        cantidad: 1,
      });
    },
    actualizarCantidad: (estado, accion: PayloadAction<{ id: number; cantidad: number }>) => {
      const producto = estado.items.find((item) => item.id === accion.payload.id);

      if (!producto) {
        return;
      }

      producto.cantidad = Math.max(1, accion.payload.cantidad);
    },
    eliminarProducto: (estado, accion: PayloadAction<number>) => {
      estado.items = estado.items.filter((item) => item.id !== accion.payload);
    },
    limpiarCarrito: (estado) => {
      estado.items = [];
      estado.cliente = null;
      estado.descuentoActivo = false;
      estado.descuentoPorcentaje = 0;
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
  },
});

export const store = configureStore({
  reducer: {
    cotizacion: sliceCotizacion.reducer,
  },
  preloadedState: {
    cotizacion: cargarEstadoPersistido(),
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
  seleccionarCliente,
  agregarProducto,
  actualizarCantidad,
  eliminarProducto,
  limpiarCarrito,
  activarDescuento,
  cambiarDescuento,
} = sliceCotizacion.actions;
