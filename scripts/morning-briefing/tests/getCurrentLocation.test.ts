import { expect, test } from "vitest"

import { getCurrentLocation } from "../getCurrentLocation.ts"

test.each([
  [41.39, 2.17, "barcelona"],
  [41.918, 3.208, "tamariu"],
  [40.42, -3.7, "other"],
  [41.39, 3.208, "other"],
  [41.918, 2.17, "other"],
  [41.32, 2.05, "barcelona"],
  [41.48, 2.23, "barcelona"],
  [41.9, 3.19, "tamariu"],
  [41.93, 3.23, "tamariu"],
])("classifies %s, %s as %s", (latitude, longitude, expected) => {
  const csv = `DateTime,Latitude,Longitude,Device\n2026-10-06 08:00:00,${latitude},${longitude},Phone\n`

  expect(getCurrentLocation(csv)).toBe(expected)
})

test("uses the last appended row even when its wall-clock timestamp is earlier", () => {
  const csv = [
    "DateTime,Latitude,Longitude,Device",
    "2026-10-06 09:00:00,41.39,2.17,Phone",
    "2026-10-06 08:00:00,41.918,3.208,Phone",
    "",
    "",
  ].join("\r\n")

  expect(getCurrentLocation(csv)).toBe("tamariu")
})

test.each([
  "DateTime,Latitude,Longitude,Device\n",
  "2026-10-06 08:00:00,,2.17,Phone",
  "2026-10-06 08:00:00,41.39,invalid,Phone",
  "2026-10-06 08:00:00,91,2.17,Phone",
])("rejects a missing or invalid latest location", csv => {
  expect(() => getCurrentLocation(csv)).toThrow("Backtrack CSV has no valid latest location")
})
