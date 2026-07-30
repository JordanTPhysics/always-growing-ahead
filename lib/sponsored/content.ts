export type SponsoredItem = {
  id: string;
  href: string;
  title: string;
  description?: string;
  imageUrl?: string;
};

export const sponsoredItems: SponsoredItem[] = [
  {
    id: "cscs-card",
    href: "https://www.cscs.uk.com/",
    title: "Get your CSCS card before your first site day",
    description: "Book the health, safety & environment test and card application in one place.",
  },
  {
    id: "toolstation",
    href: "https://www.toolstation.com/",
    title: "Trade tools & PPE delivered next day",
    description: "Hard hats, boots, and power tools from stores across the UK.",
  },
  {
    id: "city-guilds",
    href: "https://www.cityandguilds.com/",
    title: "Level up with a recognised trade qualification",
    description: "Apprenticeships and NVQs in electrical, plumbing, carpentry, and more.",
  },
];
