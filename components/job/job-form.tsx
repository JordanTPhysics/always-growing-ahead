"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/lib/i18n/routing";
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

type Skill = { id: number; name: string };

type Props = {
  jobId?: number;
  embedded?: boolean;
  onSaved?: () => void;
};

export function JobForm({ jobId, embedded = false, onSaved }: Props) {
  const t = useTranslations("jobs");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [mode, setMode] = useState<FormMode>("edit");
  const [loading, setLoading] = useState(Boolean(jobId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<Skill[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [jobType, setJobType] = useState("full-time");
  const [postcode, setPostcode] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [salaryType, setSalaryType] = useState("annual");
  const [requirements, setRequirements] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<
    { skill_id: number; required: boolean }[]
  >([]);

  useEffect(() => {
    fetch("/api/skills")
      .then((r) => r.json())
      .then((data) => setCatalog(data.skills ?? []));

    if (!jobId) {
      setLoading(false);
      return;
    }
    fetch(`/api/jobs?id=${jobId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.job) return;
        setTitle(data.job.title ?? "");
        setDescription(data.job.description ?? "");
        setJobType(data.job.job_type ?? "full-time");
        setPostcode(data.job.postcode ?? "");
        setAddress(data.job.address_text ?? "");
        setLat(
          data.job.location_lat != null ? Number(data.job.location_lat) : null
        );
        setLng(
          data.job.location_lng != null ? Number(data.job.location_lng) : null
        );
        setSalaryMin(
          data.job.salary_min != null ? String(data.job.salary_min) : ""
        );
        setSalaryMax(
          data.job.salary_max != null ? String(data.job.salary_max) : ""
        );
        setSalaryType(data.job.salary_type ?? "annual");
        setRequirements(data.job.requirements ?? "");
        setSelectedSkills(
          (data.skills ?? []).map(
            (s: { skill_id: number; required: boolean | number }) => ({
              skill_id: s.skill_id,
              required: Boolean(s.required),
            })
          )
        );
      })
      .finally(() => setLoading(false));
  }, [jobId]);

  async function save(status: "draft" | "active") {
    setSaving(true);
    setError(null);
    const payload = {
      id: jobId,
      title,
      description: description || null,
      job_type: jobType,
      postcode: postcode || null,
      address_text: address || null,
      location_lat: lat,
      location_lng: lng,
      salary_min: salaryMin ? Number(salaryMin) : null,
      salary_max: salaryMax ? Number(salaryMax) : null,
      salary_type: salaryType,
      requirements: requirements || null,
      status,
      skills: selectedSkills,
    };

    const res = await fetch("/api/jobs", {
      method: jobId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? tCommon("status.error"));
      return;
    }
    if (onSaved) {
      onSaved();
      return;
    }
    router.push("/employer/jobs");
    router.refresh();
  }

  if (loading) return <p className="text-muted">{tCommon("status.loading")}</p>;

  const selectedSkillDetails = catalog.filter((skill) =>
    selectedSkills.some((s) => s.skill_id === skill.id)
  );

  const preview = (
    <Card elevation="nested" className="space-y-4 p-5">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          {title || t("createTitle")}
        </h2>
      </div>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted">{t("jobType")}</dt>
          <dd>{t(`jobTypes.${jobType}`)}</dd>
        </div>
        {postcode || address ? (
          <div>
            <dt className="text-muted">{t("address")}</dt>
            <dd>{[address, postcode].filter(Boolean).join(", ")}</dd>
          </div>
        ) : null}
        {salaryMin || salaryMax ? (
          <div>
            <dt className="text-muted">Salary</dt>
            <dd>
              £{salaryMin || "—"}–£{salaryMax || "—"} /{" "}
              {t(`salaryTypes.${salaryType}`)}
            </dd>
          </div>
        ) : null}
      </dl>
      {description ? (
        <div className="space-y-2 border-t border-border pt-4">
          <h3 className="font-medium">{t("description")}</h3>
          <p className="whitespace-pre-wrap text-muted">{description}</p>
        </div>
      ) : null}
      {requirements ? (
        <div className="space-y-2 border-t border-border pt-4">
          <h3 className="font-medium">{t("requirements")}</h3>
          <p className="whitespace-pre-wrap text-muted">{requirements}</p>
        </div>
      ) : null}
      {selectedSkillDetails.length > 0 ? (
        <div className="space-y-2 border-t border-border pt-4">
          <h3 className="font-medium">{t("skills")}</h3>
          <ul className="flex flex-wrap gap-2">
            {selectedSkillDetails.map((skill) => {
              const selected = selectedSkills.find(
                (s) => s.skill_id === skill.id
              );
              return (
                <li
                  key={skill.id}
                  className="rounded-md border border-border px-3 py-1 text-sm"
                >
                  {skill.name}
                  {selected
                    ? ` · ${selected.required ? t("requiredSkill") : t("niceToHave")}`
                    : ""}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </Card>
  );

  const editor = (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        void save("draft");
      }}
    >
      <Card elevation="nested" className="space-y-4 p-5">
        <Field label={t("jobTitle")}>
          <input
            className={inputClassName}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </Field>
        <Field label={t("description")}>
          <textarea
            className={inputClassName}
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("jobType")}>
            <select
              className={inputClassName}
              value={jobType}
              onChange={(e) => setJobType(e.target.value)}
            >
              {(
                [
                  "full-time",
                  "part-time",
                  "contract",
                  "temporary",
                  "apprenticeship",
                ] as const
              ).map((type) => (
                <option key={type} value={type}>
                  {t(`jobTypes.${type}`)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("salaryType")}>
            <select
              className={inputClassName}
              value={salaryType}
              onChange={(e) => setSalaryType(e.target.value)}
            >
              {(["hourly", "daily", "annual"] as const).map((type) => (
                <option key={type} value={type}>
                  {t(`salaryTypes.${type}`)}
                </option>
              ))}
            </select>
          </Field>
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
        </div>
        <PostcodeInput
          label={t("postcode")}
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
        <Field label={t("requirements")}>
          <textarea
            className={inputClassName}
            rows={4}
            value={requirements}
            onChange={(e) => setRequirements(e.target.value)}
          />
        </Field>
      </Card>

      <Card elevation="nested" className="space-y-3 p-5">
        <h2 className="text-lg font-medium">{t("skills")}</h2>
        <div className="flex flex-wrap gap-2">
          {catalog.map((skill) => {
            const selected = selectedSkills.find((s) => s.skill_id === skill.id);
            return (
              <button
                key={skill.id}
                type="button"
                className={`min-h-11 rounded-md border px-3 py-1.5 text-sm ${
                  selected
                    ? "border-accent bg-background text-white"
                    : "border-border"
                }`}
                onClick={() => {
                  if (selected) {
                    setSelectedSkills((prev) =>
                      prev.filter((s) => s.skill_id !== skill.id)
                    );
                  } else {
                    setSelectedSkills((prev) => [
                      ...prev,
                      { skill_id: skill.id, required: true },
                    ]);
                  }
                }}
              >
                {skill.name}
                {selected
                  ? ` · ${selected.required ? t("requiredSkill") : t("niceToHave")}`
                  : ""}
              </button>
            );
          })}
        </div>
      </Card>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          variant="secondary"
          disabled={saving}
          onClick={() => void save("draft")}
        >
          {t("saveDraft")}
        </Button>
        <Button
          type="button"
          disabled={saving}
          onClick={() => void save("active")}
        >
          {t("publish")}
        </Button>
      </div>
    </form>
  );

  const content = (
    <>
      {!embedded ? (
        <PageHeader
          title={jobId ? t("editTitle") : t("createTitle")}
          actions={
            <Button asChild variant="secondary">
              <Link href="/employer/jobs">{tCommon("actions.back")}</Link>
            </Button>
          }
        />
      ) : null}
      <FormModeTabs
        mode={mode}
        onChange={setMode}
        previewLabel={tCommon("actions.preview")}
        editLabel={tCommon("actions.edit")}
      />
      {mode === "preview" ? preview : editor}
    </>
  );

  if (embedded) {
    return <div className="space-y-6">{content}</div>;
  }

  return <PageSection>{content}</PageSection>;
}
