export type VisibilityFilter = "all" | "active" | "hidden";

export function isHiddenWidget(visibility?: string | null) {
  return (visibility || "").toLowerCase() === "private";
}

export function isApprovedWidget(status?: string | null) {
  return (status || "").toLowerCase() === "approved";
}

/** Active means approved and not hidden. */
export function isActiveWidget(status?: string | null, visibility?: string | null) {
  return (status || "").toLowerCase() === "approved" && !isHiddenWidget(visibility);
}

export function matchesVisibilityFilter(
  widget: { status?: string | null; visibility?: string | null },
  filter: VisibilityFilter,
) {
  if (filter === "active") return isActiveWidget(widget.status, widget.visibility);
  if (filter === "hidden") return isHiddenWidget(widget.visibility);
  return true;
}
