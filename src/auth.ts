import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { authConfig } from "@/auth.config";

const credentialsSchema = z.object({
  team: z.string().optional(),
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        team: { label: "Team slug", type: "text" },
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) {
          console.error("[authorize] schema error:", parsed.error.flatten());
          return null;
        }

        const { team: slug, email, password } = parsed.data;

        let userId: string;
        let userTeamId: string | null;
        let userPasswordHash: string;
        let userRole: import("@/generated/prisma/enums").Role;
        let userRequesterType: import("@/generated/prisma/enums").RequesterType | null;
        let userName: string | null;

        if (slug) {
          const team = await db.team.findUnique({ where: { slug } });
          if (!team) return null;

          const user = await db.user.findUnique({
            where: { teamId_email: { teamId: team.id, email } },
          });
          if (!user) return null;

          ({
            id: userId,
            teamId: userTeamId,
            passwordHash: userPasswordHash,
            role: userRole,
            requesterType: userRequesterType,
            name: userName,
          } = user);
        } else {
          // SUPER users have no team slug
          const user = await db.user.findFirst({
            where: { email, teamId: null },
          });
          if (!user) return null;

          ({
            id: userId,
            teamId: userTeamId,
            passwordHash: userPasswordHash,
            role: userRole,
            requesterType: userRequesterType,
            name: userName,
          } = user);
        }

        const valid = await bcrypt.compare(password, userPasswordHash);
        if (!valid) {
          console.error("[authorize] bad password for", email);
          return null;
        }

        return {
          id: userId,
          teamId: userTeamId,
          role: userRole,
          requesterType: userRequesterType ?? undefined,
          name: userName,
          email,
        };
      },
    }),
  ],
});
