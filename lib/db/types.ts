import type { Tier } from "@/lib/entitlements";

export type JobType =
  | "full-time"
  | "part-time"
  | "contract"
  | "temporary"
  | "apprenticeship";

export type Availability =
  | "immediate"
  | "2_weeks"
  | "1_month"
  | "not_looking";

export type Visibility = "public" | "hidden";

export type JobStatus = "draft" | "active" | "closed" | "expired";

export type SalaryType = "hourly" | "daily" | "annual";

export type Proficiency =
  | "beginner"
  | "intermediate"
  | "advanced"
  | "expert";

export type User = {
  id: number;
  email: string;
  password_hash: string | null;
  phone: string | null;
  preferred_locale: string;
  subscription_tier: Tier;
  role: UserRole;
  stripe_customer_id: string | null;
  email_verified_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export type UserRole = "user" | "admin";

export type DevicePlatform = "web" | "ios" | "android";

export type DeviceToken = {
  id: number;
  user_id: number;
  token: string;
  platform: DevicePlatform;
  created_at: Date;
};

export type Notification = {
  id: number;
  user_id: number;
  type: string;
  title: string;
  body: string;
  link_url: string | null;
  read_at: Date | null;
  created_at: Date;
};

export type SavedSearchKind = "jobs" | "workers";

export type SavedSearch = {
  id: number;
  user_id: number;
  kind: SavedSearchKind;
  name: string;
  filters: Record<string, unknown>;
  created_at: Date;
};

export type AnalyticsEvent = {
  id: number;
  user_id: number | null;
  event_name: string;
  properties: Record<string, unknown> | null;
  created_at: Date;
};

export type SkillModerationStatus = "pending" | "approved" | "rejected";

export type SkillModeration = {
  id: number;
  skill_id: number | null;
  proposed_name: string;
  proposed_by_user_id: number;
  status: SkillModerationStatus;
  created_at: Date;
};

export type WorkerProfile = {
  id: number;
  user_id: number;
  headline: string | null;
  bio: string | null;
  profile_photo_url: string | null;
  cv_file_url: string | null;
  location_lat: number | null;
  location_lng: number | null;
  postcode: string | null;
  address_text: string | null;
  desired_job_types: JobType[] | null;
  desired_salary_min: number | null;
  desired_salary_max: number | null;
  availability: Availability | null;
  visibility: Visibility;
  contact_email: string | null;
  contact_phone: string | null;
  linkedin_url: string | null;
  created_at: Date;
  updated_at: Date;
};

export type WorkerSkill = {
  id: number;
  worker_id: number;
  skill_id: number;
  proficiency: Proficiency | null;
  skill_name?: string;
  skill_category?: string | null;
};

export type WorkerExperience = {
  id: number;
  worker_id: number;
  job_title: string | null;
  employer_name: string | null;
  start_date: string | null;
  end_date: string | null;
  description: string | null;
};

export type WorkerQualification = {
  id: number;
  worker_id: number;
  qualification_name: string | null;
  institution: string | null;
  year_awarded: number | null;
  certificate_file_url: string | null;
};

export type EmployerProfile = {
  id: number;
  user_id: number;
  company_name: string | null;
  company_description: string | null;
  logo_url: string | null;
  website_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  linkedin_url: string | null;
  created_at: Date;
  updated_at?: Date;
};

export type Job = {
  id: number;
  employer_id: number;
  title: string;
  description: string | null;
  job_type: JobType | null;
  location_lat: number | null;
  location_lng: number | null;
  postcode: string | null;
  address_text: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_type: SalaryType | null;
  requirements: string | null;
  status: JobStatus;
  published_at: Date | null;
  expires_at: Date | null;
  created_at: Date;
  updated_at: Date;
  company_name?: string | null;
};

export type JobSearchResult = Job & {
  distance_m: number | null;
};

export type WorkerSearchResult = WorkerProfile & {
  distance_m: number | null;
  top_skills?: string | null;
};

export type JobSearchFilters = {
  lat?: number;
  lng?: number;
  /** null/undefined with lat/lng = nationwide (no radius cap) */
  radiusMeters?: number | null;
  jobType?: JobType;
  salaryMin?: number;
  salaryMax?: number;
  skillIds?: number[];
  postedWithinDays?: number;
  limit?: number;
};

export type WorkerSearchFilters = {
  lat?: number;
  lng?: number;
  radiusMeters?: number | null;
  jobType?: JobType;
  skillIds?: number[];
  availability?: Availability;
  limit?: number;
};

export type Skill = {
  id: number;
  name: string;
  category: string | null;
};

export type JobSkill = {
  id: number;
  job_id: number;
  skill_id: number;
  required: boolean;
  skill_name?: string;
};
