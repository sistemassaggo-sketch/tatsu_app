import { auth } from "@/app/auth";
import { redirect } from "next/navigation";
import ConfirmarCotizacion from "./ConfirmarCotizacion";

export default async function ConfirmarCotizacionPage() {
  const session = await auth();
  const rolUsuario = session?.user?.role ?? "";

  if (!["admin", "comercial", "cliente"].includes(rolUsuario)) {
    redirect("/dashboard");
  }

  const esRolCliente = rolUsuario === "cliente";

  return <ConfirmarCotizacion esRolCliente={esRolCliente} />;
}
