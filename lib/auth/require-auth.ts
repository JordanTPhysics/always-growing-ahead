import { redirect } from "next/navigation";
import { auth } from "@/auth";

export async function requireAuthOrSignUp(
  locale: string,
  notice?: "education"
) {
  const session = await auth();
  if (!session?.user) {
    const query = notice ? `?notice=${notice}` : "";
    redirect(`/${locale}/sign-up${query}`);
  }
  return session;
}
