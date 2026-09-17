import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { store, agregarProducto } from "@/store/cotizacion";

export async function POST(request: Request) {
  const formulario = await request.formData();

  const producto = {
    id: Number(formulario.get("productoId") ?? 0),
    codigo: String(formulario.get("codigo") ?? ""),
    descripcionGeneral: String(formulario.get("descripcionGeneral") ?? ""),
    precio: Number(formulario.get("precio") ?? 0),
    imagen: String(formulario.get("imagen") ?? ""),
  };

  if (!producto.id || !producto.codigo || !producto.descripcionGeneral) {
    redirect("/dashboard/cotizaciones");
  }

  store.dispatch(agregarProducto(producto));
  revalidatePath("/dashboard/cotizaciones");
  redirect("/dashboard/cotizaciones");
}
