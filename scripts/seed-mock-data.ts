/**
 * Seeds mock test accounts into MySQL (when available) and demo profile/job
 * JSON under `.data/` for USE_MOCK_MAP_DATA mode.
 *
 * Usage: npm run seed:mock
 */
import bcrypt from "bcryptjs";
import { pool } from "../lib/db/pool";
import {
  MOCK_TEST_ACCOUNTS,
  MOCK_TEST_PASSWORD,
} from "../lib/mock/test-accounts";
import {
  createJsonEmployerProfile,
  createJsonWorkerProfile,
  getJsonEmployerByUserId,
  getJsonWorkerByUserId,
  replaceJsonWorkerExperience,
  setJsonWorkerSkills,
} from "../lib/mock/profiles-store";
import {
  createJsonJob,
  listJsonJobsByEmployer,
  setJsonJobSkills,
} from "../lib/mock/jobs-store";
import { NOTTINGHAM_CENTER } from "../lib/search/constants";
import type { ResultSetHeader, RowDataPacket } from "mysql2";

async function seedMysqlAccounts() {
  console.log("Seeding MySQL test accounts…");
  for (const account of MOCK_TEST_ACCOUNTS) {
    const hash = await bcrypt.hash(MOCK_TEST_PASSWORD, 12);
    const [existing] = await pool.execute<RowDataPacket[]>(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [account.email]
    );

    if (existing[0]?.id) {
      await pool.execute(
        `UPDATE users
         SET password_hash = ?,
             subscription_tier = ?,
             email_verified_at = COALESCE(email_verified_at, CURRENT_TIMESTAMP),
             role = ?
         WHERE email = ?`,
        [hash, account.subscription_tier, account.role, account.email]
      );
      console.log(`  updated ${account.email} (id ${existing[0].id}) → ${account.subscription_tier}`);
    } else {
      const [result] = await pool.execute<ResultSetHeader>(
        `INSERT INTO users
          (email, password_hash, preferred_locale, subscription_tier, role, email_verified_at)
         VALUES (?, ?, 'en', ?, ?, CURRENT_TIMESTAMP)`,
        [account.email, hash, account.subscription_tier, account.role]
      );
      console.log(`  created ${account.email} (id ${result.insertId}) → ${account.subscription_tier}`);
    }
  }
}

function seedJsonDemoData() {
  console.log("Seeding .data JSON demo profiles/jobs…");

  const full = MOCK_TEST_ACCOUNTS[0]!;
  const worker = MOCK_TEST_ACCOUNTS[1]!;

  if (!getJsonEmployerByUserId(full.id)) {
    createJsonEmployerProfile(full.id, {
      company_name: "Trent Demo Hire Ltd",
      company_description:
        "Demo employer account with full (Advanced) subscription.",
      website_url: "https://example.com",
      logo_url: null,
    });
    console.log(`  employer profile for ${full.email}`);
  } else {
    console.log(`  employer profile for ${full.email} already exists`);
  }

  const employer = getJsonEmployerByUserId(full.id)!;
  if (listJsonJobsByEmployer(employer.id).length === 0) {
    const job = createJsonJob(employer.id, {
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
    });
    setJsonJobSkills(job.id, [{ skill_id: 1, required: true }]);
    console.log(`  demo job #${job.id} for ${full.email}`);
  } else {
    console.log(`  jobs for ${full.email} already exist`);
  }

  if (!getJsonWorkerByUserId(full.id)) {
    createJsonWorkerProfile(full.id, {
      headline: "Flexible candidate (full account)",
      bio: "Demo worker profile on the full-subscription account.",
      location_lat: NOTTINGHAM_CENTER.latitude + 0.015,
      location_lng: NOTTINGHAM_CENTER.longitude - 0.01,
      postcode: "NG1 2AB",
      address_text: "City Centre, Nottingham",
      desired_job_types: ["full-time", "part-time"],
      desired_salary_min: 25000,
      desired_salary_max: 32000,
      availability: "immediate",
      visibility: "public",
    });
    console.log(`  worker profile for ${full.email}`);
  }

  if (!getJsonWorkerByUserId(worker.id)) {
    const profile = createJsonWorkerProfile(worker.id, {
      headline: "Care assistant seeking part-time work",
      bio: "Demo worker-only subscription account around Sherwood.",
      location_lat: NOTTINGHAM_CENTER.latitude + 0.022,
      location_lng: NOTTINGHAM_CENTER.longitude - 0.012,
      postcode: "NG5 2CD",
      address_text: "Sherwood, Nottingham",
      desired_job_types: ["part-time"],
      desired_salary_min: 12,
      desired_salary_max: 15,
      availability: "2_weeks",
      visibility: "public",
    });
    setJsonWorkerSkills(profile.id, [
      { skill_id: 1, proficiency: "intermediate" },
    ]);
    replaceJsonWorkerExperience(profile.id, [
      {
        job_title: "Care Assistant",
        employer_name: "Greenwood Care",
        start_date: "2022-01-01",
        end_date: "2024-06-01",
        description: "Supported residents with daily living.",
      },
    ]);
    console.log(`  worker profile for ${worker.email}`);
  } else {
    console.log(`  worker profile for ${worker.email} already exists`);
  }
}

async function main() {
  console.log("Mock test accounts:");
  for (const account of MOCK_TEST_ACCOUNTS) {
    console.log(
      `  ${account.email} / ${MOCK_TEST_PASSWORD} — ${account.label}`
    );
  }
  console.log("");

  seedJsonDemoData();

  try {
    await seedMysqlAccounts();
  } catch (error) {
    console.warn(
      "\nMySQL seed skipped (DB unavailable). Mock-mode logins still work via fixed test accounts."
    );
    console.warn(error instanceof Error ? error.message : error);
  } finally {
    await pool.end().catch(() => undefined);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
