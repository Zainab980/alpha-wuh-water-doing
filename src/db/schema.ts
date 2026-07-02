/**
 * Database tables, described in TypeScript.
 *
 * Drizzle reads this file to (a) create the real tables in Postgres and
 * (b) give us type-checked queries. One file = the single source of truth
 * for the shape of our data.
 */
import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

export const subscribers = pgTable(
  "subscribers",
  {
    // A unique number for each row, filled in automatically.
    id: serial("id").primaryKey(),

    // Who, and which area they want alerts for ("all" = all of Barbados,
    // otherwise a parish slug like "saint-michael").
    email: text("email").notNull(),
    area: text("area").notNull(),

    // "pending" until they click the confirm link, then "confirmed".
    // "unsubscribed" if they opt out.
    status: text("status").notNull().default("pending"),

    // Secret one-time codes used in the confirm and unsubscribe links.
    confirmToken: text("confirm_token").notNull(),
    unsubscribeToken: text("unsubscribe_token").notNull(),

    // When they signed up, and when they confirmed (empty until they do).
    createdAt: timestamp("created_at").notNull().defaultNow(),
    confirmedAt: timestamp("confirmed_at"),
  },
  // The database backstop: the same email can sign up for different areas,
  // but never the same area twice. This makes duplicates impossible even if
  // two requests arrive at the exact same moment.
  (t) => [unique("subscribers_email_area_unique").on(t.email, t.area)],
);

// A handy type for "one subscriber row", inferred from the table above.
export type Subscriber = typeof subscribers.$inferSelect;

/**
 * The "already emailed" logbook. One row = "we have emailed this subscriber
 * about this notice." The UNIQUE rule on (notice_id, subscriber_id) is what
 * makes it impossible to email the same person about the same notice twice.
 */
export const sentAlerts = pgTable(
  "sent_alerts",
  {
    id: serial("id").primaryKey(),

    // The BWA notice's id (from the feed) and which subscriber it went to.
    noticeId: text("notice_id").notNull(),
    subscriberId: integer("subscriber_id")
      .notNull()
      .references(() => subscribers.id),

    // false the moment we claim it; true once the email actually went out.
    sent: boolean("sent").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    unique("sent_alerts_notice_subscriber_unique").on(t.noticeId, t.subscriberId),
  ],
);
