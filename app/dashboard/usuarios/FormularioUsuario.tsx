"use client";

import { useActionState } from "react";
import { crearUsuario, type EstadoFormularioUsuario } from "./acciones";

const estadoInicial: EstadoFormularioUsuario = {};

type RolFormulario = {
  id: number;
  nombre: string;
};

export default function FormularioUsuario({ roles }: { roles: RolFormulario[] }) {
  const [estado, accion, estaEnviando] = useActionState(crearUsuario, estadoInicial);

  return (
    <form action={accion} style={{ display: "grid", gap: 18, maxWidth: 520 }}>
      <label style={{ display: "grid", gap: 7, fontWeight: 700 }}>
        Usuario
        <input
          name="username"
          type="text"
          autoComplete="username"
          placeholder="Nombre de usuario"
          required
          style={estiloCampo}
        />
      </label>

      <label style={{ display: "grid", gap: 7, fontWeight: 700 }}>
        Contraseña
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="Mínimo 6 caracteres"
          minLength={6}
          required
          style={estiloCampo}
        />
      </label>

      <label style={{ display: "grid", gap: 7, fontWeight: 700 }}>
        Rol
        <select name="rolId" defaultValue="" required style={estiloCampo}>
          <option value="" disabled>
            Selecciona un rol
          </option>
          {roles.map((rol) => (
            <option key={rol.id} value={rol.id}>
              {rol.nombre === "almacen" ? "Almacén" : "Comercial"}
            </option>
          ))}
        </select>
      </label>

      {estado.error ? <p style={{ color: "#b42318", margin: 0 }}>{estado.error}</p> : null}
      {estado.exito ? <p style={{ color: "#087443", margin: 0 }}>{estado.exito}</p> : null}

      <button type="submit" disabled={estaEnviando} style={estiloBoton}>
        {estaEnviando ? "Creando..." : "Crear usuario"}
      </button>
    </form>
  );
}

const estiloCampo = {
  width: "100%",
  boxSizing: "border-box" as const,
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  padding: "11px 12px",
  font: "inherit",
};

const estiloBoton = {
  border: "none",
  borderRadius: 8,
  background: "#EA5C25",
  color: "#fff",
  padding: "12px 16px",
  fontWeight: 700,
  cursor: "pointer",
};