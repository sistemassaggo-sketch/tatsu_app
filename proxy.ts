import withAuth from "next-auth/middleware";
import { puedeAccederARuta } from "@/lib/permisos";

export default withAuth({
  pages: {
    signIn: "/",
  },
  callbacks: {
    authorized({ req, token }) {
      if (token?.status !== true) {
        return false;
      }

      return puedeAccederARuta(token.role, req.nextUrl.pathname);
    },
  },
});

export const config = {
  matcher: ["/dashboard/:path*"],
};
