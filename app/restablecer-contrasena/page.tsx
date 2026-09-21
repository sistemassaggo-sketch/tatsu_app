import styles from "../page.module.css";
import FormularioRestablecimiento from "./FormularioRestablecimiento";

export default async function RestablecerContrasenaPage({
  searchParams,
}: {
  searchParams: Promise<{ usuario?: string }>;
}) {
  const { usuario } = await searchParams;

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="restablecer-title">
        <div className={styles.brandWrap}>
          <div>
            <p className={styles.eyebrow}>Seguridad</p>
            <h1 id="restablecer-title">Restablece tu contraseña</h1>
          </div>
        </div>
        <p className={styles.helpText}>
          Un administrador solicitó que cambies tu contraseña. Ingresa la actual y define una nueva para continuar.
        </p>
        <FormularioRestablecimiento username={usuario ?? ""} />
      </section>
    </main>
  );
}
