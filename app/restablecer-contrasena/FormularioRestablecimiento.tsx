"use client";

import { useActionState } from "react";
import styles from "../page.module.css";
import { completarRestablecimiento, type EstadoRestablecimiento } from "./acciones";

const estadoInicial: EstadoRestablecimiento = {};

export default function FormularioRestablecimiento({ username }: { username: string }) {
  const [estado, accion, estaEnviando] = useActionState(completarRestablecimiento, estadoInicial);

  return (
    <form className={styles.form} action={accion}>
      <div className={styles.fieldGroup}>
        <label htmlFor="username">Usuario</label>
        <input id="username" name="username" type="text" defaultValue={username} autoComplete="username" required />
      </div>

      <div className={styles.fieldGroup}>
        <label htmlFor="contrasenaActual">Contraseña actual</label>
        <input id="contrasenaActual" name="contrasenaActual" type="password" autoComplete="current-password" required />
      </div>

      <div className={styles.fieldGroup}>
        <label htmlFor="nuevaContrasena">Nueva contraseña</label>
        <input id="nuevaContrasena" name="nuevaContrasena" type="password" autoComplete="new-password" minLength={6} required />
      </div>

      <div className={styles.fieldGroup}>
        <label htmlFor="confirmacion">Confirmar nueva contraseña</label>
        <input id="confirmacion" name="confirmacion" type="password" autoComplete="new-password" minLength={6} required />
      </div>

      {estado.error ? (
        <p aria-live="polite" className={styles.errorMessage}>
          {estado.error}
        </p>
      ) : null}

      <button type="submit" className={styles.submitButton} disabled={estaEnviando}>
        {estaEnviando ? "Guardando..." : "Restablecer contraseña"}
      </button>
    </form>
  );
}
