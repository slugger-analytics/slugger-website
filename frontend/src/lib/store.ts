import { atom } from "nanostores";
import { WidgetType } from "@/data/types";

const emptyWidget: WidgetType = {
  id: -1,
  name: "empty widget",
};

export const $widgets = atom<WidgetType[]>([]);
// export const $userRole = atom<string>("");
// export const $idToken = atom<string>("");
export const $targetWidget = atom<WidgetType>(emptyWidget);
export const $widgetQuery = atom<string>("");
export const $favWidgetIds = atom<Set<number>>(new Set());
export const $filters = atom<Set<string>>(new Set());
export const $activeCategoryIds = atom<Set<number>>(new Set([1, 2, 3]));

// IMPORTANT: in order for us to re-render widgets, we need to keep track of the state of our widgets and filters
// using the stores below. This is detects changes in REFERENCE, so our dashboard won't rerender when we
// add to an array or set.
export const $widgetsVersion = atom<number>(0);
export const $filtersVersion = atom<number>(0);

export function addWidget(widget: WidgetType) {
  $widgets.set([...$widgets.get(), widget]);
}

export function setWidgets(widgets: WidgetType[]) {
  $widgets.set([...widgets]);
}

export function setTargetWidget(target: WidgetType) {
  $targetWidget.set(target);
}

// export function setUserRole(role: string) {
//   $userRole.set(role);
// }

export function updateStoreWidget({
  id,
  name,
  description,
  visibility,
  redirectLink,
}: WidgetType) {
  $widgets.set(
    $widgets.get().map((widget) => {
      if (widget.id === id) {
        return {
          ...widget,
          ...(name !== undefined && { name }),
          ...(description !== undefined && { description }),
          ...(visibility !== undefined && { visibility }),
          ...(redirectLink !== undefined && { redirectLink }),
        };
      } else {
        return widget;
      }
    }),
  );
}

export function setWidgetQuery(query: string) {
  $widgetQuery.set(query);
}

export function addFavWidgetId(id: number) {
  $favWidgetIds.set($favWidgetIds.get().add(id));
}

export function removeFavWidgetId(id: number) {
  const favWidgetIds = $favWidgetIds.get();
  favWidgetIds.delete(id);
  $favWidgetIds.set(favWidgetIds);
}

export function setFavWidgetIds(ids: number[]) {
  console.log("ids:", ids);
  console.log("set from ids:", new Set(ids));
  $favWidgetIds.set(new Set(ids));
}

export function getFavWidgetIds() {
  return $favWidgetIds.get();
}

export function addFilter(filter: string) {
  $filters.set($filters.get().add(filter));
}

export function removeFilter(filter: string) {
  const filters = $filters.get();
  filters.delete(filter);
  $filters.set(filters);
}

export function addCategoryId(id: number) {
  $activeCategoryIds.set($activeCategoryIds.get().add(id));
}

export function removeCategoryId(id: number) {
  const categories = $activeCategoryIds.get();
  categories.delete(id);
  $activeCategoryIds.set(categories);
}

// export function setIdToken(token: string) {
//   $idToken.set(token);
// }

export function incrementFiltersVersion() {
  $filtersVersion.set($filtersVersion.get() + 1);
}

export function incrementWidgetsVersion() {
  $widgetsVersion.set($widgetsVersion.get() + 1);
}