import type { IconType } from "react-icons";
import { BiSolidCarMechanic } from "react-icons/bi";
import { FaScissors } from "react-icons/fa6";
import { GiTyre } from "react-icons/gi";
import { MdLocalCarWash, MdLocalGroceryStore, MdRestaurant } from "react-icons/md";

export type Occupation = {
  id: string;
  Icon: IconType;
  color: string;
  terms: readonly string[];
};

export const OCCUPATIONS: readonly Occupation[] = [
  { id: "barber", Icon: FaScissors, color: "text-rose-500", terms: ["barber"] },
  {
    id: "mechanic",
    Icon: BiSolidCarMechanic,
    color: "text-orange-500",
    terms: ["mechanic"],
  },
  {
    id: "restaurant",
    Icon: MdRestaurant,
    color: "text-red-500",
    terms: ["restaurant"],
  },
  {
    id: "supermarket",
    Icon: MdLocalGroceryStore,
    color: "text-emerald-500",
    terms: ["supermarket"],
  },
  {
    id: "carWash",
    Icon: MdLocalCarWash,
    color: "text-sky-500",
    terms: ["car wash", "carwash"],
  },
  {
    id: "tyreShop",
    Icon: GiTyre,
    color: "text-violet-500",
    terms: ["tyre", "tire"],
  },
];

export function occupationById(id: string | null | undefined) {
  if (!id) return null;
  return OCCUPATIONS.find((occupation) => occupation.id === id) ?? null;
}

export function occupationIdFromText(
  text: string | null | undefined,
  labels?: Readonly<Record<string, string>>
): string | null {
  const hay = (text ?? "").toLowerCase();
  if (!hay.trim()) return null;
  for (const occupation of OCCUPATIONS) {
    const translated = labels?.[occupation.id];
    const terms = translated ? [...occupation.terms, translated] : occupation.terms;
    if (terms.some((term) => hay.includes(term.toLowerCase()))) {
      return occupation.id;
    }
  }
  return null;
}
