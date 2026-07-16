export type Tier = "none" | "basic" | "advanced"; // 'trial' can be inserted later with no callers changing

export function canViewContactInfo(tier: Tier) {
  return tier === "basic" || tier === "advanced";
}

export function canPostJobs(tier: Tier) {
  return tier === "advanced";
}

export function canCreateWorkerProfile(tier: Tier) {
  // Spec: contact reveal requires Basic+, but profile create is allowed for paying users.
  // Until a free/trial tier exists, require at least Basic.
  return tier === "basic" || tier === "advanced";
}
