import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { authHref } from "@/lib/auth/continue-path";

type SignUpRedirect =
  | "education"
  | {
      notice?: "education";
      next?: string;
      paid?: boolean;
    };

export async function requireAuthOrSignUp(
  locale: string,
  redirectTo?: SignUpRedirect
) {
  const session = await auth();
  if (!session?.user) {
    const options =
      typeof redirectTo === "string" ? { notice: redirectTo } : redirectTo;
    redirect(`/${locale}${authHref("/sign-up", options)}`);
  }
  return session;
}
