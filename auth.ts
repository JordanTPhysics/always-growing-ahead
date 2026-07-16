import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import type { Tier } from "@/lib/entitlements";
import type { UserRole } from "@/lib/db/types";
import {
  createUser,
  getUserByEmail,
  getUserById,
} from "@/lib/db/repositories/users";
import { isMockMapDataEnabled } from "@/lib/mock/nottingham";
import {
  getMockUserByEmail,
  getMockUserById,
} from "@/lib/mock/test-accounts";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      tier: Tier;
      role: UserRole;
      preferredLocale: string;
      isEmailVerified: boolean;
    };
  }

  interface User {
    tier: Tier;
    role: UserRole;
    preferredLocale: string;
    isEmailVerified: boolean;
  }
}

type AppToken = {
  id?: string;
  tier?: Tier;
  role?: UserRole;
  preferredLocale?: string;
  isEmailVerified?: boolean;
};

const googleId =
  process.env.AUTH_GOOGLE_ID ?? process.env.GOOGLE_CLIENT_ID ?? "";
const googleSecret =
  process.env.AUTH_GOOGLE_SECRET ?? process.env.GOOGLE_CLIENT_SECRET ?? "";

async function resolveUserByEmail(email: string) {
  if (isMockMapDataEnabled()) {
    const mockUser = getMockUserByEmail(email);
    if (mockUser) return mockUser;
  }
  return getUserByEmail(email);
}

async function resolveUserById(id: number) {
  if (isMockMapDataEnabled()) {
    const mockUser = getMockUserById(id);
    if (mockUser) return mockUser;
  }
  return getUserById(id);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "")
          .trim()
          .toLowerCase();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        const user = await resolveUserByEmail(email);
        if (!user?.password_hash) return null;

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return null;

        return {
          id: String(user.id),
          email: user.email,
          tier: user.subscription_tier,
          role: user.role,
          preferredLocale: user.preferred_locale,
          emailVerified: Boolean(user.email_verified_at),
          isEmailVerified: Boolean(user.email_verified_at),
        };
      },
    }),
    ...(googleId && googleSecret
      ? [
          Google({
            clientId: googleId,
            clientSecret: googleSecret,
          }),
        ]
      : []),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/en/sign-in",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== "google") return true;
      if (!user.email) return false;

      const existing = await resolveUserByEmail(user.email);
      if (!existing) {
        await createUser({
          email: user.email,
          passwordHash: null,
          emailVerifiedAt: new Date(),
        });
      }
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      const appToken = token as typeof token & AppToken;

      if (user?.email) {
        const dbUser = await resolveUserByEmail(user.email);
        if (dbUser) {
          appToken.id = String(dbUser.id);
          appToken.tier = dbUser.subscription_tier;
          appToken.role = dbUser.role;
          appToken.preferredLocale = dbUser.preferred_locale;
          appToken.isEmailVerified = Boolean(dbUser.email_verified_at);
        }
      } else if (appToken.id) {
        const dbUser = await resolveUserById(Number(appToken.id));
        if (dbUser) {
          appToken.tier = dbUser.subscription_tier;
          appToken.role = dbUser.role;
          appToken.preferredLocale = dbUser.preferred_locale;
          appToken.isEmailVerified = Boolean(dbUser.email_verified_at);
        }
      }

      if (trigger === "update" && session?.preferredLocale) {
        appToken.preferredLocale = session.preferredLocale;
      }

      return appToken;
    },
    async session({ session, token }) {
      const appToken = token as typeof token & AppToken;
      if (session.user) {
        session.user.id = appToken.id ?? "";
        session.user.tier = appToken.tier ?? "none";
        session.user.role = appToken.role ?? "user";
        session.user.preferredLocale = appToken.preferredLocale ?? "en";
        session.user.isEmailVerified = Boolean(appToken.isEmailVerified);
      }
      return session;
    },
  },
  trustHost: true,
});
