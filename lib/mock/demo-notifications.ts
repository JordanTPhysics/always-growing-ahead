import type { Notification } from "@/lib/db/types";
import { readJsonFile, writeJsonFile, nextNumericId } from "@/lib/mock/json-db";
import { MOCK_TEST_ACCOUNTS } from "@/lib/mock/test-accounts";

const FILE = "notifications.json";

type NotificationRecord = {
  id: number;
  user_id: number;
  type: string;
  title: string;
  body: string;
  link_url: string | null;
  read_at: string | null;
  created_at: string;
};

type NotificationsDb = { notifications: NotificationRecord[] };

function accountId(email: string): number {
  const account = MOCK_TEST_ACCOUNTS.find((item) => item.email === email);
  if (!account) throw new Error(`Missing demo account ${email}`);
  return account.id;
}

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function demoNotification(
  id: number,
  email: string,
  type: string,
  title: string,
  body: string,
  linkUrl: string,
  ageHours: number,
  read = false,
): NotificationRecord {
  return {
    id,
    user_id: accountId(email),
    type,
    title,
    body,
    link_url: linkUrl,
    read_at: read ? hoursAgo(ageHours + 2) : null,
    created_at: hoursAgo(ageHours),
  };
}

function seedNotifications(): NotificationRecord[] {
  return [
    demoNotification(
      1,
      "full@aga.test",
      "contact_reveal",
      "Your job contact was revealed",
      "A worker revealed the contact details for Demo Warehouse Operative.",
      "/jobs",
      2,
    ),
    demoNotification(
      2,
      "full@aga.test",
      "favourited",
      "Your company was added to favourites",
      "Someone saved Trent Demo Hire Ltd to their favourites.",
      "/workers",
      6,
    ),
    demoNotification(
      3,
      "full@aga.test",
      "chat_message",
      "Admin replied to your chat",
      "Thanks, we have updated your listing.",
      "/",
      30,
      true,
    ),
    demoNotification(
      4,
      "free@aga.test",
      "favourited",
      "Your profile was added to favourites",
      "An employer saved your worker profile to their favourites.",
      "/workers",
      3,
    ),
    demoNotification(
      5,
      "free@aga.test",
      "contact_reveal",
      "Your contact details were revealed",
      "An employer revealed your contact details.",
      "/jobs",
      9,
    ),
    demoNotification(
      6,
      "free@aga.test",
      "education_comment",
      "New comment on your guide",
      "Someone commented on a guide you published.",
      "/education",
      40,
      true,
    ),
    demoNotification(
      7,
      "admin@aga.test",
      "chat_message",
      "New live chat message",
      "A visitor asked about posting a job in Nottingham.",
      "/admin",
      1,
    ),
    demoNotification(
      8,
      "admin@aga.test",
      "chat_message",
      "New live chat message",
      "Can you help me reset my worker profile?",
      "/admin",
      4,
    ),
    demoNotification(
      9,
      "admin@aga.test",
      "chat_message",
      "New live chat message",
      "Thanks, that answered my question.",
      "/admin",
      28,
      true,
    ),
    demoNotification(
      10,
      "employer@aga.test",
      "contact_reveal",
      "Your job contact was revealed",
      "A worker revealed the contact details on one of your jobs.",
      "/jobs",
      5,
    ),
    demoNotification(
      11,
      "employer@aga.test",
      "favourited",
      "Your company was added to favourites",
      "Someone saved your company profile to their favourites.",
      "/workers",
      12,
    ),
    demoNotification(
      12,
      "employer@aga.test",
      "marketplace_comment",
      "New comment on your listing",
      "Someone asked about the tools you listed on the marketplace.",
      "/marketplace",
      36,
      true,
    ),
    demoNotification(
      13,
      "basic@aga.test",
      "contact_reveal",
      "Your contact details were revealed",
      "An employer revealed your contact details.",
      "/workers",
      2,
    ),
    demoNotification(
      14,
      "basic@aga.test",
      "favourited",
      "Your profile was added to favourites",
      "Someone saved your worker profile to their favourites.",
      "/education",
      7,
    ),
    demoNotification(
      15,
      "basic@aga.test",
      "education_comment",
      "New comment on your guide",
      "Someone commented on a short video you shared.",
      "/education",
      20,
      true,
    ),
  ];
}

function load(): NotificationRecord[] {
  return readJsonFile<NotificationsDb>(FILE, {
    notifications: seedNotifications(),
  }).notifications;
}

function save(notifications: NotificationRecord[]) {
  writeJsonFile(FILE, { notifications });
}

function toNotification(row: NotificationRecord): Notification {
  return {
    ...row,
    read_at: row.read_at ? new Date(row.read_at) : null,
    created_at: new Date(row.created_at),
  };
}

export function listMockNotificationsForUser(
  userId: number,
  limit: number,
): Notification[] {
  return load()
    .filter((notification) => notification.user_id === userId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, limit)
    .map(toNotification);
}

export function createMockNotification(input: {
  userId: number;
  type: string;
  title: string;
  body: string;
  linkUrl?: string | null;
}): Notification {
  const notifications = load();
  const row: NotificationRecord = {
    id: nextNumericId(notifications, 1),
    user_id: input.userId,
    type: input.type,
    title: input.title,
    body: input.body,
    link_url: input.linkUrl ?? null,
    read_at: null,
    created_at: new Date().toISOString(),
  };
  notifications.unshift(row);
  save(notifications);
  return toNotification(row);
}

export function markMockNotificationRead(
  notificationId: number,
  userId: number,
): void {
  const notifications = load();
  const now = new Date().toISOString();
  let changed = false;
  for (const notification of notifications) {
    if (
      notification.id === notificationId &&
      notification.user_id === userId &&
      !notification.read_at
    ) {
      notification.read_at = now;
      changed = true;
    }
  }
  if (changed) save(notifications);
}

export function markAllMockNotificationsRead(userId: number): void {
  const notifications = load();
  const now = new Date().toISOString();
  let changed = false;
  for (const notification of notifications) {
    if (notification.user_id === userId && !notification.read_at) {
      notification.read_at = now;
      changed = true;
    }
  }
  if (changed) save(notifications);
}
