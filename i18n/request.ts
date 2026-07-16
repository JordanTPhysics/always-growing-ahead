import { getRequestConfig } from "next-intl/server";
import { defaultLocale, isActiveLocale } from "@/lib/i18n/locales";

import enCommon from "../messages/en/common.json";
import enAuth from "../messages/en/auth.json";
import enWorker from "../messages/en/worker-profile.json";
import enEmployer from "../messages/en/employer-profile.json";
import enJobs from "../messages/en/jobs.json";
import enJobSearch from "../messages/en/job-search.json";
import enWorkerSearch from "../messages/en/worker-search.json";
import enBilling from "../messages/en/billing.json";
import enNotifications from "../messages/en/notifications.json";
import enAdmin from "../messages/en/admin.json";

import arCommon from "../messages/ar/common.json";
import arAuth from "../messages/ar/auth.json";
import arWorker from "../messages/ar/worker-profile.json";
import arEmployer from "../messages/ar/employer-profile.json";
import arJobs from "../messages/ar/jobs.json";
import arJobSearch from "../messages/ar/job-search.json";
import arWorkerSearch from "../messages/ar/worker-search.json";
import arBilling from "../messages/ar/billing.json";
import arNotifications from "../messages/ar/notifications.json";
import arAdmin from "../messages/ar/admin.json";

import ckbCommon from "../messages/ckb/common.json";
import ckbAuth from "../messages/ckb/auth.json";
import ckbWorker from "../messages/ckb/worker-profile.json";
import ckbEmployer from "../messages/ckb/employer-profile.json";
import ckbJobs from "../messages/ckb/jobs.json";
import ckbJobSearch from "../messages/ckb/job-search.json";
import ckbWorkerSearch from "../messages/ckb/worker-search.json";
import ckbBilling from "../messages/ckb/billing.json";
import ckbNotifications from "../messages/ckb/notifications.json";
import ckbAdmin from "../messages/ckb/admin.json";

const catalogs = {
  en: {
    common: enCommon,
    auth: enAuth,
    "worker-profile": enWorker,
    "employer-profile": enEmployer,
    jobs: enJobs,
    "job-search": enJobSearch,
    "worker-search": enWorkerSearch,
    billing: enBilling,
    notifications: enNotifications,
    admin: enAdmin,
  },
  ar: {
    common: arCommon,
    auth: arAuth,
    "worker-profile": arWorker,
    "employer-profile": arEmployer,
    jobs: arJobs,
    "job-search": arJobSearch,
    "worker-search": arWorkerSearch,
    billing: arBilling,
    notifications: arNotifications,
    admin: arAdmin,
  },
  ckb: {
    common: ckbCommon,
    auth: ckbAuth,
    "worker-profile": ckbWorker,
    "employer-profile": ckbEmployer,
    jobs: ckbJobs,
    "job-search": ckbJobSearch,
    "worker-search": ckbWorkerSearch,
    billing: ckbBilling,
    notifications: ckbNotifications,
    admin: ckbAdmin,
  },
} as const;

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale =
    requested && isActiveLocale(requested) ? requested : defaultLocale;

  return {
    locale,
    messages: catalogs[locale],
    onError(error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[i18n]", error.message);
      }
    },
    getMessageFallback({ namespace, key }) {
      return [namespace, key].filter(Boolean).join(".");
    },
  };
});
