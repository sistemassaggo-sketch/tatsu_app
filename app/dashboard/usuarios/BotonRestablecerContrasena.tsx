import { solicitarRestablecimientoContrasena } from "./acciones";

export default function BotonRestablecerContrasena({
  usuarioId,
  pendiente,
}: {
  usuarioId: number;
  pendiente: boolean;
}) {
  return (
    <form action={solicitarRestablecimientoContrasena} style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
      <input type="hidden" name="usuarioId" value={usuarioId} />
      <button type="submit" disabled={pendiente} style={{ ...estiloBoton, opacity: pendiente ? 0.6 : 1, cursor: pendiente ? "not-allowed" : "pointer" }}>
        Restablecer contraseña
      </button>
      {pendiente ? (
        <span style={{ color: "#D97706", fontWeight: 700 }}>Restablecimiento pendiente: el usuario deberá definir una nueva contraseña al iniciar sesión.</span>
      ) : null}
    </form>
  );
}

const estiloBoton = {
  border: "none",
  borderRadius: 8,
  background: "#176B87",
  color: "#fff",
  padding: "10px 14px",
  fontWeight: 700,
};
