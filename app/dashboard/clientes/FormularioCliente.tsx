"use client";

import { useActionState } from "react";
import { crearCliente, type EstadoFormularioCliente } from "./acciones";

const estadoInicial: EstadoFormularioCliente = {};

export default function FormularioCliente() {
  const [estado, accion, estaEnviando] = useActionState(crearCliente, estadoInicial);

  return (
    <form action={accion} style={estiloFormulario}>
      <CampoCliente nombre="nombre" etiqueta="Nombre" placeholder="Nombre del cliente" />
      <CampoCliente nombre="personaContacto" etiqueta="Persona de contacto" placeholder="Nombre de contacto" />
      <CampoCliente nombre="telefono" etiqueta="Teléfono" placeholder="Teléfono" type="tel" />
      <CampoCliente nombre="direccion" etiqueta="Dirección" placeholder="Dirección" />
      <CampoCliente nombre="ciudad" etiqueta="Ciudad" placeholder="Ciudad" />
      {estado.error ? <p style={estiloError}>{estado.error}</p> : null}
      {estado.exito ? <p style={estiloExito}>{estado.exito}</p> : null}
      <button type="submit" disabled={estaEnviando} style={estiloBotonNaranja}>
        {estaEnviando ? "Creando..." : "Crear cliente"}
      </button>
    </form>
  );
}

export const estiloCampo = {
  width: "100%",
  boxSizing: "border-box" as const,
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  padding: "11px 12px",
  font: "inherit",
};

export const estiloFormulario = { display: "grid", gap: 14, maxWidth: 620 };
export const estiloError = { color: "#b42318", margin: 0 };
export const estiloExito = { color: "#087443", margin: 0 };
export const estiloBotonNaranja = {
  border: "none",
  borderRadius: 8,
  background: "#EF6C21",
  color: "#fff",
  padding: "12px 16px",
  fontWeight: 700,
  cursor: "pointer",
};

function CampoCliente({
  nombre,
  etiqueta,
  placeholder,
  type = "text",
}: {
  nombre: string;
  etiqueta: string;
  placeholder: string;
  type?: string;
}) {
  return (
    <label style={{ display: "grid", gap: 7, fontWeight: 700 }}>
      {etiqueta}
      <input name={nombre} type={type} placeholder={placeholder} required style={estiloCampo} />
    </label>
  );
}