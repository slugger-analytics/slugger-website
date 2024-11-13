import { atom } from "nanostores";
import { WidgetType } from "@/data/types";

const emptyWidget: WidgetType = {
  id: -1,
  name: "empty widget",
};

export const $widgets = atom<WidgetType[]>([]);
export const $userRole = atom<string>("");
export const $targetWidget = atom<WidgetType>(emptyWidget);
export const $widgetQuery = atom<string>("");
export const $favWidgetIds = atom<Set<number>>(new Set());

export function addWidget(widget: WidgetType) {
  $widgets.set([...$widgets.get(), widget]);
}

export function setWidgets(widgets: WidgetType[]) {
  $widgets.set([...widgets]);
}

export function setTargetWidget(target: WidgetType) {
  $targetWidget.set(target);
}

export function setUserRole(role: string) {
  $userRole.set(role);
}

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
  // TODO is this correct?
  const favWidgetIds = $favWidgetIds.get();
  favWidgetIds.delete(id);
  $favWidgetIds.set(favWidgetIds);
}

export function setFavWidgetIds(ids: number[]) {
  $favWidgetIds.set(new Set(ids));
}

export function getFavWidgetIds() {
  return $favWidgetIds.get();
}