import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

export const wheelState = sqliteTable("wheel_state", {
  id: integer("id").primaryKey(),
  revision: integer("revision").notNull().default(0),
});
export const people = sqliteTable("people", {
  id: text("id").primaryKey(),
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
});
export const picks = sqliteTable(
  "picks",
  {
    sequence: integer("sequence").primaryKey({ autoIncrement: true }),
    id: text("id").notNull().unique(),
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
    index("picks_person_valid_idx").on(table.personId, table.undoneAt),
    check(
      "picks_mode_check",
      sql`${table.mode} IN ('random', 'balanced', 'wildcard', 'volunteer')`,
    ),
  ],
);
