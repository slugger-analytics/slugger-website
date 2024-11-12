import { fetchWidgets } from "@/api/widget";
import { WidgetType } from "@/data/types";
import { setWidgets, $widgets, $userRole, $widgetQuery } from "@/lib/store";
import { useStore } from "@nanostores/react";
import { useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";

function useQueryWidgets() {
    const widgets = useStore($widgets);
    const userRole = useStore($userRole);
    const widgetQuery = useStore($widgetQuery);
    const { userId } = useAuth();

    const loadWidgets = async () => {
        try {
            const fetchedWidgets = await fetchWidgets();
            const isDev = userRole == "Widget Developer" ? true: false;
            const filteredWidgets = fetchedWidgets.filter((widget) =>
                isDev && userId && widget.developerIds?.includes(userId) ? widget : !isDev
            )
            setWidgets([...filteredWidgets]);
        } catch (error) {
            console.error("Error fetching widgets", error);
        }
    };

    useEffect(() => {
        loadWidgets();
    }, []);

    return { widgets };
}

export default useQueryWidgets;
