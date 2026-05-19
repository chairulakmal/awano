import type { DefaultSession } from "next-auth";
import type { Role, RequesterType } from "@/generated/prisma/enums";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      teamId: string | null;
      role: Role;
      requesterType?: RequesterType;
    } & DefaultSession["user"];
  }

  interface User {
    teamId: string | null;
    role: Role;
    requesterType?: RequesterType;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    teamId: string | null;
    role: Role;
    requesterType?: RequesterType;
  }
}
