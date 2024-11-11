import { atom } from "nanostores";
import { WidgetType } from "@/data/types";

const emptyWidget: WidgetType = {
    id: -1,
    name: "empty widget"
}

export const $widgets = atom<WidgetType[]>([]);
export const $userRole = atom<string>("");

export function addWidget(widget: WidgetType) {
    $widgets.set([...$widgets.get(), widget]);
}

export function setWidgets(widgets: WidgetType[]) {
    $widgets.set([...widgets]);
}

export const $targetWidget = atom<WidgetType>(emptyWidget);

export function setTargetWidget(target: WidgetType) {
    $targetWidget.set(target);
}

export function setUserRole(role: string) {
    $userRole.set(role);
}

export function updateStoreWidget({ id, name, description, visibility, redirectLink }: WidgetType) {
    $widgets.set(
        $widgets.get().map((widget) => {
            if (widget.id === id) {
                return {
                    ...widget,
                    ...(name !== undefined && { name }),
                    ...(description !== undefined && { description }),
                    ...(visibility !== undefined && { visibility }),
                    ...(redirectLink !== undefined && { redirectLink })
                }
            } else {
                return widget;
            }
        })
    );
}