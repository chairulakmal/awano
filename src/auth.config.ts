import type { NextAuthConfig } from "next-auth";
import type { JWT } from "next-auth/jwt";

export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  trustHost: true,
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.teamId = user.teamId;
        token.role = user.role;
        token.requesterType = user.requesterType;
      }
      return token;
    },
    session({ session, token }) {
      const t = token as JWT;
      session.user.id = t.sub!;
      session.user.teamId = t.teamId;
      session.user.role = t.role;
      session.user.requesterType = t.requesterType;
      return session;
    },
  },
};
