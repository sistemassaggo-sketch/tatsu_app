import type { DefaultSession, NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { timingSafeEqual, scryptSync } from "node:crypto";
import prisma from "@/lib/prisma";

declare module "next-auth" {
  interface User {
    username?: string | null;
    role?: string | null;
    status?: boolean;
  }

  interface Session {
    user: {
      username?: string | null;
      role?: string | null;
      status?: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    username?: string | null;
    role?: string | null;
    status?: boolean;
  }
}

function comprobarContrasena(contrasena: string, contrasenaCifrada: string) {
  const [algoritmo, sal, hashGuardado] = contrasenaCifrada.split(":");

  if (algoritmo !== "scrypt" || !sal || !hashGuardado) {
    return false;
  }

  const hashCalculado = scryptSync(contrasena, sal, 64);
  const hashEsperado = Buffer.from(hashGuardado, "hex");

  return hashCalculado.length === hashEsperado.length && timingSafeEqual(hashCalculado, hashEsperado);
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  pages: { signIn: "/" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Usuario", type: "text" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        try {
          const username = typeof credentials?.username === "string" ? credentials.username.trim() : "";
          const password = typeof credentials?.password === "string" ? credentials.password : "";

          if (!username || !password) {
            return null;
          }

          const usuario = await prisma.usuario.findUnique({
            where: { username, status: true },
            include: { rol: true },
          });

          if (!usuario || !comprobarContrasena(password, usuario.password)) {
            return null;
          }

          return {
            id: String(usuario.id),
            name: usuario.username,
            username: usuario.username,
            role: usuario.rol.nombre,
            status: usuario.status,
          };
        } catch (error) {
          console.error("Error validating credentials:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.username = user.username ?? null;
        token.role = user.role ?? null;
        token.status = user.status ?? false;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.name = session.user.name ?? "Administrador";
        session.user.username = token.username ?? null;
        session.user.role = token.role ?? null;
        session.user.status = token.status ?? false;
      }

      return session;
    },
  },
};

export async function auth() {
  return getServerSession(authOptions);
}
