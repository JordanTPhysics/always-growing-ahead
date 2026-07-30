import { NOTTINGHAM_CENTER } from "@/lib/search/constants";
import { isMemoryMockJson, readJsonFile, writeJsonFile } from "@/lib/mock/json-db";
import { MOCK_TEST_ACCOUNTS } from "@/lib/mock/test-accounts";

type WorkersDb = { workers: unknown[] };
type EmployersDb = { employers: unknown[] };
type JobsDb = { jobs: unknown[] };

let seeded = false;

/**
 * On Netlify (memory store), seed demo profiles/jobs once per instance
 * so mock accounts work without a local `.data` directory.
 */
export function ensureDemoJsonSeeded(): void {
  if (seeded || !isMemoryMockJson()) return;
  seeded = true;

  const employersDb = readJsonFile<EmployersDb>("employers.json", {
    employers: [],
  });
  if (employersDb.employers.length > 0) return;

  const full = MOCK_TEST_ACCOUNTS[0]!;
  const worker = MOCK_TEST_ACCOUNTS[1]!;
  const stamp = new Date().toISOString();

  const employer = {
    id: 10001,
    user_id: full.id,
    company_name: "Trent Demo Hire Ltd",
    company_description:
      "Demo employer account with full (Advanced) subscription.",
    logo_url: null,
    website_url: "https://example.com",
    contact_email: null,
    contact_phone: null,
    linkedin_url: null,
    actively_hiring: true,
    created_at: stamp,
    updated_at: stamp,
  };

  const job = {
    job: {
      id: 10001,
      employer_id: employer.id,
      title: "Demo Warehouse Operative",
      description: "Sample job posted by the full-subscription test account.",
      job_type: "full-time",
      location_lat: NOTTINGHAM_CENTER.latitude + 0.01,
      location_lng: NOTTINGHAM_CENTER.longitude + 0.01,
      postcode: "NG1 1AA",
      address_text: "Lace Market, Nottingham",
      salary_min: 24000,
      salary_max: 27000,
      salary_type: "annual",
      requirements: "Reliable and punctual",
      status: "active",
      published_at: stamp,
      expires_at: null,
      created_at: stamp,
      updated_at: stamp,
    },
    skills: [{ id: 1, job_id: 10001, skill_id: 1, required: true }],
  };

  const fullWorker = {
    profile: {
      id: 10001,
      user_id: full.id,
      headline: "Flexible candidate (full account)",
      bio: "Demo worker profile on the full-subscription account.",
      profile_photo_url: null,
      cv_file_url: null,
      location_lat: NOTTINGHAM_CENTER.latitude + 0.015,
      location_lng: NOTTINGHAM_CENTER.longitude - 0.01,
      postcode: "NG1 2AB",
      address_text: "City Centre, Nottingham",
      desired_job_types: ["full-time", "part-time"],
      desired_salary_min: 25000,
      desired_salary_max: 32000,
      availability: "immediate",
      visibility: "public",
      actively_looking: true,
      contact_email: null,
      contact_phone: null,
      linkedin_url: null,
      created_at: stamp,
      updated_at: stamp,
    },
    skills: [],
    experience: [],
    qualifications: [],
  };

  const workerOnly = {
    profile: {
      id: 10002,
      user_id: worker.id,
      headline: "Care assistant seeking part-time work",
      bio: "Demo worker-only subscription account around Sherwood.",
      profile_photo_url: null,
      cv_file_url: null,
      location_lat: NOTTINGHAM_CENTER.latitude + 0.022,
      location_lng: NOTTINGHAM_CENTER.longitude - 0.012,
      postcode: "NG5 2CD",
      address_text: "Sherwood, Nottingham",
      desired_job_types: ["part-time"],
      desired_salary_min: 12,
      desired_salary_max: 15,
      availability: "2_weeks",
      visibility: "public",
      actively_looking: false,
      contact_email: null,
      contact_phone: null,
      linkedin_url: null,
      created_at: stamp,
      updated_at: stamp,
    },
    skills: [
      { id: 1, worker_id: 10002, skill_id: 1, proficiency: "intermediate" },
    ],
    experience: [
      {
        id: 1,
        worker_id: 10002,
        job_title: "Care Assistant",
        employer_name: "Greenwood Care",
        start_date: "2022-01-01",
        end_date: "2024-06-01",
        description: "Supported residents with daily living.",
      },
    ],
    qualifications: [],
  };

  writeJsonFile<EmployersDb>("employers.json", { employers: [employer] });
  writeJsonFile<JobsDb>("jobs.json", { jobs: [job] });
  writeJsonFile<WorkersDb>("workers.json", {
    workers: [fullWorker, workerOnly],
  });
}
