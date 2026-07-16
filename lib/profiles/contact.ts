/** Fields only returned to the profile owner or via /api/contacts/reveal. */
export type ProfileContactFields = {
  contact_email: string | null;
  contact_phone: string | null;
  linkedin_url: string | null;
};

export function stripProfileContact<T extends ProfileContactFields>(
  profile: T
): Omit<T, keyof ProfileContactFields> {
  const { contact_email: _e, contact_phone: _p, linkedin_url: _l, ...rest } =
    profile;
  return rest;
}
