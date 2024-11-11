import { atom } from "nanostores";
import { WidgetType } from "@/data/types";

export const $widgets = atom<WidgetType[]>([]);

export function addWidget(widget: WidgetType) {
    $widgets.set([...$widgets.get(), widget]);
}

export function setWidgetsStore(widgets: WidgetType[]) {
    $widgets.set([...widgets]);
}

const emptyWidget: WidgetType = {
    id: -1,
    name: "empty widget"
}

export const $targetWidget = atom<WidgetType>(emptyWidget);

export function setTargetWidget(target: WidgetType) {
    $targetWidget.set(target);
}