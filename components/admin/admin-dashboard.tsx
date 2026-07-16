"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  buttonPrimaryClassName,
  buttonSecondaryClassName,
} from "@/components/ui/forms";

type PendingSkill = {
  id: number;
  proposed_name: string;
};

type User = {
  id: number;
  email: string;
  subscription_tier: string;
  role: "user" | "admin";
};

export function AdminDashboard() {
  const t = useTranslations("admin");
  const [skills, setSkills] = useState<PendingSkill[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    void Promise.all([
      fetch("/api/admin/skills").then((response) => response.json()),
      fetch("/api/admin/users").then((response) => response.json()),
    ]).then(([skillData, userData]) => {
      setSkills(skillData.skills ?? []);
      setUsers(userData.users ?? []);
    });
  }, []);

  async function moderate(id: number, action: "approve" | "reject") {
    const response = await fetch("/api/admin/skills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    if (response.ok) setSkills((current) => current.filter((skill) => skill.id !== id));
  }

  async function changeRole(userId: number, role: User["role"]) {
    const response = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role }),
    });
    if (response.ok) {
      setUsers((current) =>
        current.map((user) => (user.id === userId ? { ...user, role } : user))
      );
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <section className="rounded-lg border border-border bg-surface p-5">
        <h2 className="text-xl font-semibold">{t("pendingSkills")}</h2>
        <div className="mt-4 space-y-3">
          {skills.length === 0 ? (
            <p className="text-sm text-muted">{t("noPendingSkills")}</p>
          ) : (
            skills.map((skill) => (
              <div key={skill.id} className="flex items-center justify-between gap-3">
                <span>{skill.proposed_name}</span>
                <span className="flex gap-2">
                  <button
                    type="button"
                    className={buttonPrimaryClassName}
                    onClick={() => void moderate(skill.id, "approve")}
                  >
                    {t("approve")}
                  </button>
                  <button
                    type="button"
                    className={buttonSecondaryClassName}
                    onClick={() => void moderate(skill.id, "reject")}
                  >
                    {t("reject")}
                  </button>
                </span>
              </div>
            ))
          )}
        </div>
      </section>
      <section className="rounded-lg border border-border bg-surface p-5">
        <h2 className="text-xl font-semibold">{t("users")}</h2>
        <div className="mt-4 space-y-3">
          {users.map((user) => (
            <div key={user.id} className="flex items-center justify-between gap-3 text-sm">
              <div>
                <p className="font-medium">{user.email}</p>
                <p className="text-muted">
                  {t("tier")}: {user.subscription_tier}
                </p>
              </div>
              <select
                className="rounded-md border border-border bg-surface px-2 py-1.5"
                value={user.role}
                aria-label={`${t("role")} for ${user.email}`}
                onChange={(event) =>
                  void changeRole(user.id, event.target.value as User["role"])
                }
              >
                <option value="user">user</option>
                <option value="admin">admin</option>
              </select>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
