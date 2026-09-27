/**
 * Only a widget developer can be added to a widget.
 * The role stored on that assignment is member or owner.
 */

export function parseAssigneeId(value) {
  const id = Number.parseInt(value, 10);
  return Number.isInteger(id) ? id : null;
}

export function isWidgetDeveloperRole(role) {
  return role === "widget developer";
}

export function isAssignableWidgetRole(role) {
  return role === "member" || role === "owner";
}
