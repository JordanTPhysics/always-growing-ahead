import { setRequestLocale } from "next-intl/server";
import { requireAuthOrSignUp } from "@/lib/auth/require-auth";
import { EmployerProfileForm } from "@/components/profile/employer-profile-form";

export default async function EmployerProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAuthOrSignUp(locale);

  return <EmployerProfileForm />;
}
