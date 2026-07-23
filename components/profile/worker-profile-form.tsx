"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, PageSection } from "@/components/ui/card";
import {
  Field,
  FormModeTabs,
  PageHeader,
  inputClassName,
  type FormMode,
} from "@/components/ui/forms";
import { PostcodeInput } from "@/components/map/postcode-input";
import { captureOrPickImage } from "@/lib/native/camera";

type Skill = { id: number; name: string; category: string | null };

type Experience = {
  job_title: string;
  employer_name: string;
  start_date: string;
  end_date: string;
  description: string;
};

type Qualification = {
  qualification_name: string;
  institution: string;
  year_awarded: string;
  certificate_file_url: string;
};

const JOB_TYPES = [
  "full-time",
  "part-time",
  "contract",
  "temporary",
  "apprenticeship",
] as const;

export function WorkerProfileForm() {
  const t = useTranslations("worker-profile");
  const tCommon = useTranslations("common");
  const tJobs = useTranslations("jobs");

  const [mode, setMode] = useState<FormMode>("edit");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exists, setExists] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<Skill[]>([]);

  const [headline, setHeadline] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoBusy, setPhotoBusy] = useState(false);
  const [bio, setBio] = useState("");
  const [postcode, setPostcode] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [desiredTypes, setDesiredTypes] = useState<string[]>([]);
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [availability, setAvailability] = useState("immediate");
  const [visibility, setVisibility] = useState<"public" | "hidden">("public");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [selectedSkillIds, setSelectedSkillIds] = useState<number[]>([]);
  const [customSkill, setCustomSkill] = useState("");
  const [experience, setExperience] = useState<Experience[]>([]);
  const [qualifications, setQualifications] = useState<Qualification[]>([]);

  useEffect(() => {
    async function load() {
      const [skillsRes, meRes] = await Promise.all([
        fetch("/api/skills"),
        fetch("/api/workers?mine=1"),
      ]);
      const skillsData = await skillsRes.json();
      setCatalog(skillsData.skills ?? []);

      if (meRes.ok) {
        const data = await meRes.json();
        if (data.profile) {
          setExists(true);
          setHeadline(data.profile.headline ?? "");
          setPhotoUrl(data.profile.profile_photo_url ?? "");
          setBio(data.profile.bio ?? "");
          setPostcode(data.profile.postcode ?? "");
          setAddress(data.profile.address_text ?? "");
          setLat(
            data.profile.location_lat != null
              ? Number(data.profile.location_lat)
              : null
          );
          setLng(
            data.profile.location_lng != null
              ? Number(data.profile.location_lng)
              : null
          );
          setDesiredTypes(data.profile.desired_job_types ?? []);
          setSalaryMin(
            data.profile.desired_salary_min != null
              ? String(data.profile.desired_salary_min)
              : ""
          );
          setSalaryMax(
            data.profile.desired_salary_max != null
              ? String(data.profile.desired_salary_max)
              : ""
          );
          setAvailability(data.profile.availability ?? "immediate");
          setVisibility(data.profile.visibility ?? "public");
          setContactEmail(data.profile.contact_email ?? "");
          setContactPhone(data.profile.contact_phone ?? "");
          setLinkedinUrl(data.profile.linkedin_url ?? "");
          setSelectedSkillIds(
            (data.skills ?? []).map((s: { skill_id: number }) => s.skill_id)
          );
          setExperience(
            (data.experience ?? []).map(
              (e: {
                job_title: string | null;
                employer_name: string | null;
                start_date: string | null;
                end_date: string | null;
                description: string | null;
              }) => ({
                job_title: e.job_title ?? "",
                employer_name: e.employer_name ?? "",
                start_date: e.start_date ?? "",
                end_date: e.end_date ?? "",
                description: e.description ?? "",
              })
            )
          );
          setQualifications(
            (data.qualifications ?? []).map(
              (q: {
                qualification_name: string | null;
                institution: string | null;
                year_awarded: number | null;
                certificate_file_url: string | null;
              }) => ({
                qualification_name: q.qualification_name ?? "",
                institution: q.institution ?? "",
                year_awarded:
                  q.year_awarded != null ? String(q.year_awarded) : "",
                certificate_file_url: q.certificate_file_url ?? "",
              })
            )
          );
        }
      }
      setLoading(false);
    }
    load();
  }, []);

  async function addCustomSkill() {
    if (!customSkill.trim()) return;
    const res = await fetch("/api/skills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: customSkill.trim() }),
    });
    const data = await res.json();
    if (res.ok && data.skill) {
      setCatalog((prev) =>
        prev.some((s) => s.id === data.skill.id) ? prev : [...prev, data.skill]
      );
      setSelectedSkillIds((prev) =>
        prev.includes(data.skill.id) ? prev : [...prev, data.skill.id]
      );
      setCustomSkill("");
    }
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    const payload = {
      headline: headline || null,
      profile_photo_url: photoUrl || null,
      bio: bio || null,
      postcode: postcode || null,
      address_text: address || null,
      location_lat: lat,
      location_lng: lng,
      desired_job_types: desiredTypes,
      desired_salary_min: salaryMin ? Number(salaryMin) : null,
      desired_salary_max: salaryMax ? Number(salaryMax) : null,
      availability,
      visibility,
      contact_email: contactEmail || null,
      contact_phone: contactPhone || null,
      linkedin_url: linkedinUrl || null,
      skills: selectedSkillIds.map((skill_id) => ({ skill_id })),
      experience: experience.map((entry) => ({
        ...entry,
        start_date: entry.start_date || null,
        end_date: entry.end_date || null,
      })),
      qualifications: qualifications.map((entry) => ({
        ...entry,
        year_awarded: entry.year_awarded ? Number(entry.year_awarded) : null,
      })),
    };

    const res = await fetch("/api/workers", {
      method: exists ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? tCommon("status.error"));
      return;
    }
    setExists(true);
    setMessage(tCommon("status.saved"));
  }

  if (loading) {
    return <p className="text-muted">{tCommon("status.loading")}</p>;
  }

  const selectedSkills = catalog.filter((skill) =>
    selectedSkillIds.includes(skill.id)
  );

  const preview = (
    <article className="space-y-6">
      <Card elevation="nested" className="space-y-4 p-5">
        <div className="flex flex-wrap items-start gap-4">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt=""
              className="h-20 w-20 rounded-md object-cover"
            />
          ) : null}
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-semibold tracking-tight">
              {headline || t("title")}
            </h2>
            {bio ? <p className="mt-2 text-muted">{bio}</p> : null}
            {postcode || address ? (
              <p className="mt-2 text-sm text-muted">
                {[address, postcode].filter(Boolean).join(", ")}
              </p>
            ) : null}
          </div>
        </div>

        {(contactEmail || contactPhone || linkedinUrl) && (
          <div className="border-t border-border pt-4 text-sm">
            <h3 className="mb-1 font-medium">{t("contactSection")}</h3>
            <p className="mb-3 text-muted">{t("contactHint")}</p>
            {contactEmail ? (
              <p>
                <span className="text-muted">{t("contactEmail")}: </span>
                {contactEmail}
              </p>
            ) : null}
            {contactPhone ? (
              <p>
                <span className="text-muted">{t("contactPhone")}: </span>
                {contactPhone}
              </p>
            ) : null}
            {linkedinUrl ? (
              <p>
                <span className="text-muted">{t("linkedinUrl")}: </span>
                <a
                  href={linkedinUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  {linkedinUrl}
                </a>
              </p>
            ) : null}
          </div>
        )}

        {(desiredTypes.length > 0 ||
          salaryMin ||
          salaryMax ||
          availability) && (
          <dl className="grid gap-3 border-t border-border pt-4 text-sm sm:grid-cols-2">
            {desiredTypes.length > 0 ? (
              <div>
                <dt className="text-muted">{t("desiredJobTypes")}</dt>
                <dd>
                  {desiredTypes
                    .map((type) => tJobs(`jobTypes.${type}`))
                    .join(", ")}
                </dd>
              </div>
            ) : null}
            {salaryMin || salaryMax ? (
              <div>
                <dt className="text-muted">
                  {t("salaryMin")} / {t("salaryMax")}
                </dt>
                <dd>
                  {[salaryMin, salaryMax].filter(Boolean).join(" – ") || "—"}
                </dd>
              </div>
            ) : null}
            <div>
              <dt className="text-muted">{t("availability")}</dt>
              <dd>{t(`availabilityOptions.${availability}`)}</dd>
            </div>
          </dl>
        )}

        {selectedSkills.length > 0 ? (
          <div className="border-t border-border pt-4">
            <h3 className="mb-2 font-medium">{t("skills")}</h3>
            <ul className="flex flex-wrap gap-2">
              {selectedSkills.map((skill) => (
                <li
                  key={skill.id}
                  className="rounded-md border border-border px-3 py-1 text-sm"
                >
                  {skill.name}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {experience.some((e) => e.job_title || e.employer_name) ? (
          <div className="space-y-3 border-t border-border pt-4">
            <h3 className="font-medium">{t("experience")}</h3>
            {experience.map((entry, index) =>
              entry.job_title || entry.employer_name ? (
                <div key={index} className="text-sm">
                  <p className="font-medium">{entry.job_title || "—"}</p>
                  <p className="text-muted">{entry.employer_name}</p>
                  {entry.description ? (
                    <p className="mt-1 whitespace-pre-wrap">{entry.description}</p>
                  ) : null}
                </div>
              ) : null
            )}
          </div>
        ) : null}

        {qualifications.some((q) => q.qualification_name) ? (
          <div className="space-y-3 border-t border-border pt-4">
            <h3 className="font-medium">{t("qualifications")}</h3>
            {qualifications.map((entry, index) =>
              entry.qualification_name ? (
                <div key={index} className="text-sm">
                  <p className="font-medium">{entry.qualification_name}</p>
                  <p className="text-muted">
                    {[entry.institution, entry.year_awarded]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
              ) : null
            )}
          </div>
        ) : null}
      </Card>
    </article>
  );

  const editor = (
    <form onSubmit={onSave} className="space-y-8">
      <Card elevation="nested" className="space-y-4 p-5">
        <Field label={t("headline")}>
          <input
            className={inputClassName}
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
          />
        </Field>
        <Field label={t("photo")}>
          <div className="flex flex-wrap items-center gap-3">
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoUrl}
                alt=""
                className="h-16 w-16 rounded-md object-cover"
              />
            ) : null}
            <Button
              type="button"
              variant="secondary"
              disabled={photoBusy}
              onClick={() => {
                void (async () => {
                  setPhotoBusy(true);
                  setError(null);
                  try {
                    const image = await captureOrPickImage();
                    if (!image) return;
                    const res = await fetch("/api/uploads", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        dataUrl: image.dataUrl,
                        folder: "profiles",
                      }),
                    });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) {
                      setError(data.error ?? t("photoFailed"));
                      return;
                    }
                    setPhotoUrl(data.url);
                  } catch {
                    setError(t("photoFailed"));
                  } finally {
                    setPhotoBusy(false);
                  }
                })();
              }}
            >
              {photoBusy ? t("photoUploading") : t("addPhoto")}
            </Button>
          </div>
        </Field>
        <Field label={t("bio")}>
          <textarea
            className={inputClassName}
            rows={4}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
        </Field>
        <PostcodeInput
          label={t("postcode")}
          placeholder={t("locationHint")}
          value={postcode}
          onChange={setPostcode}
          onResolved={(result) => {
            setPostcode(result.postcode || result.address_text);
            setAddress(result.address_text || address);
            setLat(result.lat);
            setLng(result.lng);
          }}
        />
        <Field label={t("address")}>
          <input
            className={inputClassName}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </Field>
      </Card>

      <Card elevation="nested" className="space-y-4 p-5">
        <Field label={t("desiredJobTypes")}>
          <div className="flex flex-wrap gap-2">
            {JOB_TYPES.map((type) => {
              const active = desiredTypes.includes(type);
              return (
                <button
                  key={type}
                  type="button"
                  className={`min-h-11 rounded-md border px-3 py-1.5 text-sm ${
                    active
                      ? "border-accent bg-background text-white"
                      : "border-border"
                  }`}
                  onClick={() =>
                    setDesiredTypes((prev) =>
                      active ? prev.filter((item) => item !== type) : [...prev, type]
                    )
                  }
                >
                  {tJobs(`jobTypes.${type}`)}
                </button>
              );
            })}
          </div>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("salaryMin")}>
            <input
              className={inputClassName}
              type="number"
              value={salaryMin}
              onChange={(e) => setSalaryMin(e.target.value)}
            />
          </Field>
          <Field label={t("salaryMax")}>
            <input
              className={inputClassName}
              type="number"
              value={salaryMax}
              onChange={(e) => setSalaryMax(e.target.value)}
            />
          </Field>
          <Field label={t("availability")}>
            <select
              className={inputClassName}
              value={availability}
              onChange={(e) => setAvailability(e.target.value)}
            >
              {(
                ["immediate", "2_weeks", "1_month", "not_looking"] as const
              ).map((opt) => (
                <option key={opt} value={opt}>
                  {t(`availabilityOptions.${opt}`)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("visibility")}>
            <select
              className={inputClassName}
              value={visibility}
              onChange={(e) =>
                setVisibility(e.target.value as "public" | "hidden")
              }
            >
              <option value="public">{t("visibilityPublic")}</option>
              <option value="hidden">{t("visibilityHidden")}</option>
            </select>
          </Field>
          <div className="space-y-3 border-t border-border pt-4">
            <div>
              <h3 className="font-medium">{t("contactSection")}</h3>
              <p className="mt-1 text-sm text-muted">{t("contactHint")}</p>
            </div>
            <Field label={t("contactEmail")}>
              <input
                type="email"
                className={inputClassName}
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
              />
            </Field>
            <Field label={t("contactPhone")}>
              <input
                type="tel"
                className={inputClassName}
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
              />
            </Field>
            <Field label={t("linkedinUrl")}>
              <input
                type="url"
                className={inputClassName}
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://www.linkedin.com/in/…"
              />
            </Field>
          </div>
        </div>
      </Card>

      <Card elevation="nested" className="space-y-4 p-5">
        <div>
          <h2 className="text-lg font-medium">{t("skills")}</h2>
          <p className="text-sm text-muted">{t("skillsHint")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {catalog.map((skill) => {
            const active = selectedSkillIds.includes(skill.id);
            return (
              <button
                key={skill.id}
                type="button"
                className={`min-h-11 rounded-md border px-3 py-1.5 text-sm ${
                  active
                    ? "border-accent bg-background text-white"
                    : "border-border"
                }`}
                onClick={() =>
                  setSelectedSkillIds((prev) =>
                    active
                      ? prev.filter((id) => id !== skill.id)
                      : [...prev, skill.id]
                  )
                }
              >
                {skill.name}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            className={inputClassName + " max-w-xs"}
            placeholder={t("customSkill")}
            value={customSkill}
            onChange={(e) => setCustomSkill(e.target.value)}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={addCustomSkill}
          >
            {t("addSkill")}
          </Button>
        </div>
      </Card>

      <Card elevation="nested" className="space-y-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-medium">{t("experience")}</h2>
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              setExperience((prev) => [
                ...prev,
                {
                  job_title: "",
                  employer_name: "",
                  start_date: "",
                  end_date: "",
                  description: "",
                },
              ])
            }
          >
            {t("addExperience")}
          </Button>
        </div>
        {experience.map((entry, index) => (
          <div
            key={index}
            className="grid gap-3 border-t border-border pt-4 sm:grid-cols-2"
          >
            <Field label={t("jobTitle")}>
              <input
                className={inputClassName}
                value={entry.job_title}
                onChange={(e) =>
                  setExperience((prev) =>
                    prev.map((row, i) =>
                      i === index ? { ...row, job_title: e.target.value } : row
                    )
                  )
                }
              />
            </Field>
            <Field label={t("employerName")}>
              <input
                className={inputClassName}
                value={entry.employer_name}
                onChange={(e) =>
                  setExperience((prev) =>
                    prev.map((row, i) =>
                      i === index
                        ? { ...row, employer_name: e.target.value }
                        : row
                    )
                  )
                }
              />
            </Field>
            <Field label={t("startDate")}>
              <input
                className={inputClassName}
                type="date"
                value={entry.start_date}
                onChange={(e) =>
                  setExperience((prev) =>
                    prev.map((row, i) =>
                      i === index ? { ...row, start_date: e.target.value } : row
                    )
                  )
                }
              />
            </Field>
            <Field label={t("endDate")}>
              <input
                className={inputClassName}
                type="date"
                value={entry.end_date}
                onChange={(e) =>
                  setExperience((prev) =>
                    prev.map((row, i) =>
                      i === index ? { ...row, end_date: e.target.value } : row
                    )
                  )
                }
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label={t("description")}>
                <textarea
                  className={inputClassName}
                  rows={2}
                  value={entry.description}
                  onChange={(e) =>
                    setExperience((prev) =>
                      prev.map((row, i) =>
                        i === index
                          ? { ...row, description: e.target.value }
                          : row
                      )
                    )
                  }
                />
              </Field>
            </div>
          </div>
        ))}
      </Card>

      <Card elevation="nested" className="space-y-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-medium">{t("qualifications")}</h2>
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              setQualifications((prev) => [
                ...prev,
                {
                  qualification_name: "",
                  institution: "",
                  year_awarded: "",
                  certificate_file_url: "",
                },
              ])
            }
          >
            {t("addQualification")}
          </Button>
        </div>
        {qualifications.map((entry, index) => (
          <div
            key={index}
            className="grid gap-3 border-t border-border pt-4 sm:grid-cols-2"
          >
            <Field label={t("qualificationName")}>
              <input
                className={inputClassName}
                value={entry.qualification_name}
                onChange={(e) =>
                  setQualifications((prev) =>
                    prev.map((row, i) =>
                      i === index
                        ? { ...row, qualification_name: e.target.value }
                        : row
                    )
                  )
                }
              />
            </Field>
            <Field label={t("institution")}>
              <input
                className={inputClassName}
                value={entry.institution}
                onChange={(e) =>
                  setQualifications((prev) =>
                    prev.map((row, i) =>
                      i === index
                        ? { ...row, institution: e.target.value }
                        : row
                    )
                  )
                }
              />
            </Field>
            <Field label={t("yearAwarded")}>
              <input
                className={inputClassName}
                type="number"
                value={entry.year_awarded}
                onChange={(e) =>
                  setQualifications((prev) =>
                    prev.map((row, i) =>
                      i === index
                        ? { ...row, year_awarded: e.target.value }
                        : row
                    )
                  )
                }
              />
            </Field>
          </div>
        ))}
      </Card>

      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {message ? <p className="text-sm text-muted">{message}</p> : null}

      <Button
        type="submit"
        disabled={saving}
      >
        {saving
          ? tCommon("status.loading")
          : exists
            ? t("updateCta")
            : t("createCta")}
      </Button>
    </form>
  );

  return (
    <PageSection>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <FormModeTabs
        mode={mode}
        onChange={setMode}
        previewLabel={tCommon("actions.preview")}
        editLabel={tCommon("actions.edit")}
      />
      {mode === "preview" ? preview : editor}
    </PageSection>
  );
}
