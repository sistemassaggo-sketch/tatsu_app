"use client";

import { useActionState } from "react";
import { restablecerContrasena, type EstadoFormularioUsuario } from "./acciones";

const estadoInicial: EstadoFormularioUsuario = {};

export default function RestablecerContrasena({ usuarioId }: { usuarioId: number }) {
  const [estado, accion, estaEnviando] = useActionState(restablecerContrasena, estadoInicial);

  return (
    <form action={accion} style={{ display: "grid", gap: 8, gridTemplateColumns: "minmax(180px, 1fr) auto" }}>
      <input type="hidden" name="usuarioId" value={usuarioId} />
      <input
        name="nuevaContrasena"
        type="password"
        autoComplete="new-password"
        placeholder="Nueva contraseña"
        minLength={6}
        required
        style={estiloCampo}
      />
      <button type="submit" disabled={estaEnviando} style={estiloBoton}>
        {estaEnviando ? "Guardando..." : "Restablecer"}
      </button>
      {estado.error ? <p style={{ color: "#b42318", gridColumn: "1 / -1", margin: 0 }}>{estado.error}</p> : null}
      {estado.exito ? <p style={{ color: "#087443", gridColumn: "1 / -1", margin: 0 }}>{estado.exito}</p> : null}
    </form>
  );
}

const estiloCampo = {
  width: "100%",
  boxSizing: "border-box" as const,
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  padding: "10px 12px",
  font: "inherit",
};

const estiloBoton = {
  border: "none",
  borderRadius: 8,
  background: "#176B87",
  color: "#fff",
  padding: "10px 14px",
  fontWeight: 700,
  cursor: "pointer",
};