export type SearchHit = {
  id: string;
  title: string;
  href: string;
  snippet: string | null;
  meta: string | null;
};

export type SiteSearchResults = {
  pages: SearchHit[];
  jobs: SearchHit[];
  profiles: SearchHit[];
  education: SearchHit[];
  marketplace: SearchHit[];
  unavailable: boolean;
};
