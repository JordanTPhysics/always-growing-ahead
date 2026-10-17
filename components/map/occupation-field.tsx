"use client";

import { useTranslations } from "next-intl";
import { Combobox } from "@/components/ui/combobox";
import { OCCUPATIONS } from "@/components/map/occupations";

export function OccupationField({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const t = useTranslations("common");

  const options = OCCUPATIONS.map((occupation) => {
    const name = t(`occupations.${occupation.id}`);
    return {
      value: name,
      icon: (
        <occupation.Icon
          className={`size-4 shrink-0 ${occupation.color}`}
          aria-hidden
        />
      ),
    };
  });

  return (
    <Combobox
      label={
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="inline-flex items-center gap-1.5" aria-hidden>
            {OCCUPATIONS.map((occupation) => (
              <occupation.Icon
                key={occupation.id}
                className={`size-4 ${occupation.color}`}
                title={t(`occupations.${occupation.id}`)}
              />
            ))}
          </span>
          <span>{label}</span>
        </span>
      }
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      options={options}
    />
  );
}
