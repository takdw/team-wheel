import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const teams = sqliteTable("teams", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  joinCode: text("join_code").unique(),
  publicId: text("public_id").unique(),
});
export const teamSessions = sqliteTable(
  "team_sessions",
  {
    tokenHash: text("token_hash").primaryKey(),
    teamId: integer("team_id")
      .notNull()
      .references(() => teams.id),
    owner: integer("owner", { mode: "boolean" }).notNull().default(false),
    expiresAt: integer("expires_at").notNull(),
  },
  (table) => [index("team_sessions_expiry_idx").on(table.expiresAt)],
);
export const teamAccessLimits = sqliteTable(
  "team_access_limits",
  {
    key: text("key").primaryKey(),
    attempts: integer("attempts").notNull(),
    expiresAt: integer("expires_at").notNull(),
  },
  (table) => [index("team_access_limits_expiry_idx").on(table.expiresAt)],
);

export const wheelState = sqliteTable("wheel_state", {
  id: integer("id").primaryKey(),
  revision: integer("revision").notNull().default(0),
});
export const people = sqliteTable(
  "people",
  {
    id: text("id").primaryKey(),
    teamId: integer("team_id").notNull().default(1),
    name: text("name").notNull(),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    absent: integer("absent", { mode: "boolean" }).notNull().default(false),
    shields: integer("shields").notNull().default(0),
    shieldArmed: integer("shield_armed", { mode: "boolean" })
      .notNull()
      .default(false),
    volunteerCooldown: integer("volunteer_cooldown", { mode: "boolean" })
      .notNull()
      .default(false),
    createdAt: text("created_at").notNull(),
    color: text("color"),
    defaultColor: text("default_color"),
    photo: text("photo"),
    photoVersion: text("photo_version"),
    deletedAt: text("deleted_at"),
  },
  (table) => [index("people_team_idx").on(table.teamId)],
);
export const picks = sqliteTable(
  "picks",
  {
    sequence: integer("sequence").primaryKey({ autoIncrement: true }),
    id: text("id").notNull(),
    teamId: integer("team_id").notNull().default(1),
    personId: text("person_id")
      .notNull()
      .references(() => people.id),
    personName: text("person_name").notNull(),
    mode: text("mode", {
      enum: ["random", "balanced", "wildcard", "volunteer"],
    }).notNull(),
    candidates: text("candidates").notNull(),
    landingAngle: real("landing_angle"),
    effects: text("effects"),
    createdAt: text("created_at").notNull(),
    undoneAt: text("undone_at"),
  },
  (table) => [
    uniqueIndex("picks_team_request_idx").on(table.teamId, table.id),
    index("picks_team_history_idx").on(table.teamId, table.sequence),
    index("picks_person_valid_idx").on(table.personId, table.undoneAt),
    check(
      "picks_mode_check",
      sql`${table.mode} IN ('random', 'balanced', 'wildcard', 'volunteer')`,
    ),
  ],
);
