// Narrow profile demonstration of Cathay's published rules, not identity verification.
// Known profiles assume a same-day Cathay-operated flight, paid cabin, no guests,
// no complimentary upgrade and no connecting-cabin override.
export function loungeAccess(venue, profile) {
  if (venue.operationalStatus === "temporarily_closed")
    return { kind: "closed", label: "Closed" };
  if (!["diamond", "business", "economy"].includes(profile))
    return { kind: "unknown", label: "Needs confirmation" };
  if (
    profile === "diamond" ||
    (profile === "business" && venue.loungeType === "business")
  )
    return { kind: "eligible", label: "Eligible profile" };
  return { kind: "not-covered", label: "Not covered" };
}
