import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Source_Sans_3, Noto_Sans_Arabic } from "next/font/google";
import { activeLocales, isActiveLocale, locales } from "@/lib/i18n/locales";
import { SiteHeader } from "@/components/layout/site-header";
import { MainShell } from "@/components/layout/main-shell";
import { Link } from "@/lib/i18n/navigation";
import { AuthSessionProvider } from "@/components/auth/session-provider";
import { NativeBootstrap } from "@/components/native/native-bootstrap";
import { auth } from "@/auth";
import "../globals.css";

const latin = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-latin",
  display: "swap",
});

const arabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  variable: "--font-arabic-face",
  display: "swap",
});

export const runtime = "nodejs";

export function generateStaticParams() {
  return activeLocales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isActiveLocale(locale)) notFound();

  setRequestLocale(locale);
  const messages = await getMessages();
  const session = await auth();
  const meta = locales[locale];

  return (
    <html
      lang={locale}
      dir={meta.dir}
      data-font={meta.font}
      className={`${latin.variable} ${arabic.variable} h-full`}
    >
      <body className="min-h-full flex flex-col antialiased">
        <NextIntlClientProvider messages={messages}>
          <AuthSessionProvider>
            <NativeBootstrap />
            <SiteHeader
              locale={locale}
              user={
                session?.user
                  ? {
                      email: session.user.email,
                      tier: session.user.tier,
                      role: session.user.role,
                    }
                  : null
              }
            />
            <MainShell>{children}</MainShell>
            <footer className="border-t border-border bg-surface px-4 py-6 text-center text-sm text-muted">
              AGA · UK ·{" "}
              <Link href="/privacy" className="underline hover:text-text">
                Privacy
              </Link>
            </footer>
          </AuthSessionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
