import { redirect } from "next/navigation";
import { auth } from "@/auth";

export async function requireAuthOrSignUp(locale: string) {
  const session = await auth();
  if (!session?.user) {
    redirect(`/${locale}/sign-up`);
  }
  return session;
}
