import withAuth from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/",
  },
  callbacks: {
    authorized({ req, token }) {
      if (token?.status !== true) {
        return false;
      }

      if (req.nextUrl.pathname.startsWith("/dashboard/usuarios")) {
        return token?.role === "admin";
      }

      return Boolean(token);
    },
  },
});

export const config = {
  matcher: ["/dashboard/:path*"],
};
