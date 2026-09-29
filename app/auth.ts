import type { DefaultSession, NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@/lib/prisma";
import { comprobarContrasena } from "@/lib/contrasenas";
import { registrarEventoAuditoria } from "@/lib/auditoria";

declare module "next-auth" {
  interface User {
    username?: string | null;
    role?: string | null;
    status?: boolean;
  }

  interface Session {
    user: {
      id?: string;
      username?: string | null;
      role?: string | null;
      status?: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    username?: string | null;
    role?: string | null;
    status?: boolean;
  }
}

export const ERROR_RESTABLECER_CONTRASENA = "RESTABLECER_CONTRASENA";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    // Sesión deslizante: mientras haya actividad (el SessionProvider sondea /api/auth/session, ver
    // proveedor-sesion.tsx), NextAuth reemite el JWT cada updateAge con un exp nuevo, así que la
    // sesión no vence. Si el usuario queda inactivo 30 min seguidos, el JWT expira y proxy.ts lo saca.
    maxAge: 30 * 60,
    updateAge: 5 * 60,
  },
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

          if (usuario.debeRestablecerContrasena) {
            throw new Error(ERROR_RESTABLECER_CONTRASENA);
          }

          await registrarEventoAuditoria({
            usuario: usuario.username,
            usuarioId: usuario.id,
            accion: "INICIO_SESION",
            descripcion: `El usuario ${usuario.username} inició sesión correctamente.`,
            recurso: "usuarios",
            recursoId: usuario.id,
          });

          return {
            id: String(usuario.id),
            name: usuario.username,
            username: usuario.username,
            role: usuario.rol.nombre,
            status: usuario.status,
          };
        } catch (error) {
          if (error instanceof Error && error.message === ERROR_RESTABLECER_CONTRASENA) {
            throw error;
          }

          console.error("Error validating credentials:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      console.info(token , user)
      if (user) {
        token.id = user.id;
        token.username = user.username ?? null;
        token.role = user.role ?? null;
        token.status = user.status ?? false;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.name = session.user.name ?? "Administrador";
        session.user.id = token.id;
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
