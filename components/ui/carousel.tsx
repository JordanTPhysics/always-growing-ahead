"use client";

import { BiNetworkChart } from "react-icons/bi";
import { HiBookOpen } from "react-icons/hi";
import { FaPoundSign } from "react-icons/fa";
import { IoIosBriefcase } from "react-icons/io";
import { TbHandClick } from "react-icons/tb";
import { MdSell } from "react-icons/md";
import { LuBicepsFlexed } from "react-icons/lu";
import { PiMegaphoneBold } from "react-icons/pi";

import useMediaQuery from "@/lib/use-media-query";
import { Link } from "@/lib/i18n/routing";

const skills: string[] = [
  "Education",
  "Find Your Career",
  "Find Business",
  "Make Money",
  "Browse Marketplace",
  "Buy and Sell",
  "Find Reliable Workers",
  "Post Adverts",
];

const linkClassName =
  "flex flex-col items-center gap-1 whitespace-nowrap text-center";

function renderLink(text: string, size: number) {
  switch (text) {
    case "Education":
      return (
        <Link href="/education" className={linkClassName}>
          <HiBookOpen size={size} aria-hidden />
          {text}
        </Link>
      );
    case "Find Your Career":
      return (
        <Link href="/jobs" className={linkClassName}>
          <IoIosBriefcase size={size} aria-hidden />
          {text}
        </Link>
      );
    case "Find Business":
      return (
        <Link href="/marketplace" className={linkClassName}>
          <BiNetworkChart size={size} aria-hidden />
          {text}
        </Link>
      );
    case "Make Money":
      return (
        <Link href="/marketplace" className={linkClassName}>
          <FaPoundSign size={size} aria-hidden />
          {text}
        </Link>
      );
    case "Browse Marketplace":
      return (
        <Link href="/marketplace" className={linkClassName}>
          <TbHandClick size={size} aria-hidden />
          {text}
        </Link>
      );
    case "Buy and Sell":
      return (
        <Link href="/marketplace" className={linkClassName}>
          <MdSell size={size} aria-hidden />
          {text}
        </Link>
      );
    case "Find Reliable Workers":
      return (
        <Link href="/workers" className={linkClassName}>
          <LuBicepsFlexed size={size} aria-hidden />
          {text}
        </Link>
      );
    case "Post Adverts":
      return (
        <Link href="/marketplace" className={linkClassName}>
          <PiMegaphoneBold size={size} aria-hidden />
          {text}
        </Link>
      );
    default:
      return (
        <Link href="/" className={linkClassName}>
          {text}
        </Link>
      );
  }
}

export default function Carousel() {
  const extendedItems = [...skills, ...skills];
  const size = useMediaQuery("(min-width: 640px)") ? 20 : 15;

  return (
    <div className="group w-full overflow-hidden border-y-2 border-y-surface bg-muted font-sans">
      <div
        className="relative flex flex-row flex-nowrap animate-scroll text-background group-hover:animate-scroll-paused"
        style={{ width: `${extendedItems.length * 18}rem` }}
      >
        {extendedItems.map((item, index) => (
          <div
            key={`${item}-${index}`}
            className="flex shrink-0 items-center justify-center px-8 py-2 text-lg transition ease-in-out hover:scale-95 hover:bg-background hover:text-muted lg:text-2xl"
          >
            {renderLink(item, size)}
          </div>
        ))}
      </div>
    </div>
  );
}
