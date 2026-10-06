/** Classify the latest Backtrack report as Barcelona, Tamariu, or elsewhere. */
export function getCurrentLocation(
  /** Contents of Backtrack's append-only CSV file. */
  csv: string,
): "barcelona" | "tamariu" | "other" {
  const latestRow = csv.trim().split(/\r?\n/).at(-1) ?? ""
  const [, latitudeText, longitudeText] = latestRow.split(",")
  const latitude = Number(latitudeText)
  const longitude = Number(longitudeText)

  if (
    !latitudeText?.trim() ||
    !longitudeText?.trim() ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  )
    throw new Error("Backtrack CSV has no valid latest location")

  // Approximate boxes around each place, including nearby residential areas.
  if (latitude >= 41.32 && latitude <= 41.48 && longitude >= 2.05 && longitude <= 2.23)
    return "barcelona"
  if (latitude >= 41.9 && latitude <= 41.93 && longitude >= 3.19 && longitude <= 3.23)
    return "tamariu"
  return "other"
}
