import NextAuth from "next-auth";
import { authOptions } from "@/app/auth";

const handler = NextAuth(authOptions);

type ContextoRuta = { params: Promise<{ nextauth: string[] }> };

// En Next 16 `params` es una Promise; next-auth v4 espera el objeto ya resuelto.
async function manejar(request: Request, contexto: ContextoRuta) {
  return handler(request, { params: await contexto.params });
}

export { manejar as GET, manejar as POST };
