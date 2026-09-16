"use client";

import { useActionState } from "react";
import { editarCliente, type EstadoFormularioCliente } from "./acciones";
import { estiloBotonNaranja, estiloCampo, estiloError, estiloExito } from "./FormularioCliente";

const estadoInicial: EstadoFormularioCliente = {};

type DatosCliente = {
  id: number;
  nombre: string;
  personaContacto: string;
  telefono: string;
  direccion: string;
  ciudad: string;
};

export default function EditarCliente({ cliente }: { cliente: DatosCliente }) {
  const [estado, accion, estaEnviando] = useActionState(editarCliente, estadoInicial);

  return (
    <details>
      <summary style={{ cursor: "pointer", color: "#176B87", fontWeight: 700 }}>Editar cliente</summary>
      <form action={accion} style={{ ...estiloFormularioEdicion }}>
        <input type="hidden" name="clienteId" value={cliente.id} />
        {[
          ["nombre", "Nombre", cliente.nombre],
          ["personaContacto", "Persona de contacto", cliente.personaContacto],
          ["telefono", "Teléfono", cliente.telefono],
          ["direccion", "Dirección", cliente.direccion],
          ["ciudad", "Ciudad", cliente.ciudad],
        ].map(([nombre, etiqueta, valor]) => (
          <label key={nombre} style={{ display: "grid", gap: 6, fontWeight: 700 }}>
            {etiqueta}
            <input name={nombre} defaultValue={valor} required style={estiloCampo} />
          </label>
        ))}
        {estado.error ? <p style={estiloError}>{estado.error}</p> : null}
        {estado.exito ? <p style={estiloExito}>{estado.exito}</p> : null}
        <button type="submit" disabled={estaEnviando} style={estiloBotonNaranja}>
          {estaEnviando ? "Guardando..." : "Guardar cambios"}
        </button>
      </form>
    </details>
  );
}

const estiloFormularioEdicion = { display: "grid", gap: 12, marginTop: 14 };