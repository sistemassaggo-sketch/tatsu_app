"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import styles from "./page.module.css";

export default function Home() {
  const router = useRouter();
  const [largeText, setLargeText] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pageClassName = [
    styles.page,
    largeText ? styles.largeText : "",
    highContrast ? styles.highContrast : "",
  ]
    .filter(Boolean)
    .join(" ");

  async function manejarInicioSesion(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const datosCliente = {
        username: typeof username === "string" ? username.trim() : "",
        password: typeof password === "string" ? password : "",
      };

      if (!datosCliente.username || !datosCliente.password) {
        throw new Error("Debes completar usuario y contraseña.");
      }

      const resultado = await signIn("credentials", {
        username: datosCliente.username,
        password: datosCliente.password,
        redirect: false,
      });

      if (resultado?.error === "RESTABLECER_CONTRASENA") {
        router.push(`/restablecer-contrasena?usuario=${encodeURIComponent(datosCliente.username)}`);
        return;
      }

      if (!resultado || resultado.error) {
        throw new Error("Usuario o contraseña incorrectos.");
      }

      window.location.assign(obtenerRutaDeRetorno());
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : "Ocurrió un error inesperado.";
      setError(mensaje);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className={pageClassName}>
      <section className={styles.card} aria-labelledby="login-title">
        <div className={styles.brandWrap}>
          <div className={styles.brandMark}>
            <Image src="/brand-mark.png" alt="Tatsu App brand mark" width={64} height={64} priority />
          </div>
          <div>
            <p className={styles.eyebrow}>Bienvenido</p>
            <h1 id="login-title">Ingresa a tu cuenta</h1>
          </div>
        </div>

        <div className={styles.accessibilityBar} aria-label="Accessibility options">
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={largeText}
              onChange={() => setLargeText((value) => !value)}
            />
            <span>Texto más grande</span>
          </label>

          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={highContrast}
              onChange={() => setHighContrast((value) => !value)}
            />
            <span>Alto contraste</span>
          </label>
        </div>

        <form className={styles.form} onSubmit={manejarInicioSesion} noValidate>
          <div className={styles.fieldGroup}>
            <label htmlFor="username">Usuario</label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              autoFocus
              spellCheck={false}
              placeholder="Ingresa tu usuario"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              aria-describedby="username-help"
              required
            />
            <small id="username-help">Usa el usuario asignado a tu cuenta.</small>
          </div>

          <div className={styles.fieldGroup}>
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="Ingresa tu contraseña"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>

          {error ? (
            <p aria-live="polite" className={styles.errorMessage}>
              {error}
            </p>
          ) : null}

          <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
            {isSubmitting ? "Ingresando..." : "Ingresar"}
          </button>

          <p className={styles.helpText}>Necesitas ayuda ? Contacta a tu administrador</p>
        </form>
      </section>
    </main>
  );
}

function obtenerRutaDeRetorno() {
  const callbackUrl = new URLSearchParams(window.location.search).get("callbackUrl");

  if (callbackUrl?.startsWith("/") && !callbackUrl.startsWith("//")) {
    return callbackUrl;
  }

  return "/dashboard";
}
