import { useTranslations } from "next-intl";
import { FaEnvelope, FaLinkedin, FaPhone, FaWhatsapp } from "react-icons/fa";
import { iconFill } from "@/components/icons/icon-gradients";
import { toWhatsAppHref } from "@/lib/validation/fields";

type Props = {
  email?: string | null;
  phone?: string | null;
  linkedinUrl?: string | null;
  showEmpty?: boolean;
};

const iconBadgeClassName =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md";

const channelLinkClassName =
  "inline-flex items-center gap-2 text-white rounded-md px-3 py-2 no-underline hover:opacity-80";

export function ContactChannels({
  email,
  phone,
  linkedinUrl,
  showEmpty = false,
}: Props) {
  const t = useTranslations("billing");
  const whatsappHref = phone ? toWhatsAppHref(phone) : null;

  return (
    <div className="space-y-3">
      {email ? (
        <a className={`${channelLinkClassName} bg-[#4d8dff]`} href={`mailto:${email}`}>
          {email}
          <FaEnvelope size={20} aria-hidden color="red" />
        </a>
      ) : showEmpty ? (
        <p className="text-sm text-muted">{t("noEmail")}</p>
      ) : null}

      {phone ? (
        <div className="flex flex-wrap items-center gap-4">
          <a className={`${channelLinkClassName} bg-[#f6c546]`} href={`tel:${phone}`}>
            {phone}
            <FaPhone size={16} aria-hidden color="red" />
          </a>
          {whatsappHref ? (
            <a
              className={`${channelLinkClassName} bg-[#25D366]`}
              href={whatsappHref}
              target="_blank"
              rel="noreferrer"

            > 
              {t("whatsapp")}
                <FaWhatsapp size={18} color="#ffffff" aria-hidden/>
            </a>
          ) : null}
        </div>
      ) : showEmpty ? (
        <p className="text-sm text-muted">{t("noPhone")}</p>
      ) : null}

      {linkedinUrl ? (
        <a
          className={`${channelLinkClassName} bg-[#0077b5]`}
          href={linkedinUrl}
          target="_blank"
          rel="noreferrer"
        >
          {t("linkedin")}
          <FaLinkedin size={22} aria-hidden />
        </a>
      ) : showEmpty ? (
        <p className="text-sm text-muted">{t("noLinkedin")}</p>
      ) : null}
    </div>
  );
}
