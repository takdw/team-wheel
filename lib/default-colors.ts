import { palette } from "./wheel";

const levels = ["36", "59", "7b", "9e", "c0", "e3"];
const extendedPalette = Array.from({ length: 216 }, (_, index) => {
  // This stride visits every RGB combination without stepping through adjacent shades.
  const slot = (index * 89) % 216;
  const red = levels[Math.floor(slot / 36)];
  const green = levels[Math.floor(slot / 6) % 6];
  const blue = levels[slot % 6];
  return `#${red}${green}${blue}`;
});
const colors = JSON.stringify([...new Set([...palette, ...extendedPalette])]);

export function assignDefaultColors(db: D1Database) {
  // Match people to free colors in one write so simultaneous adds cannot claim the same color.
  return db
    .prepare(
      `
    WITH unassigned AS MATERIALIZED (
      SELECT person.id, ROW_NUMBER() OVER (ORDER BY person.created_at, person.id) AS position
      FROM people AS person
      WHERE person.deleted_at IS NULL AND (
        person.default_color IS NULL OR EXISTS (
          SELECT 1 FROM people AS other
          WHERE other.deleted_at IS NULL AND other.id != person.id
            AND LOWER(other.color) = person.default_color
        )
      )
    ), available AS MATERIALIZED (
      SELECT swatch.value AS color, ROW_NUMBER() OVER (ORDER BY swatch.key) AS position
      FROM json_each(?) AS swatch
      WHERE EXISTS (SELECT 1 FROM unassigned) AND NOT EXISTS (
        SELECT 1 FROM people
        WHERE deleted_at IS NULL AND (default_color = swatch.value OR LOWER(color) = swatch.value)
      )
    )
    UPDATE people SET default_color = available.color
    FROM unassigned JOIN available USING (position)
    WHERE people.id = unassigned.id
  `,
    )
    .bind(colors);
}
