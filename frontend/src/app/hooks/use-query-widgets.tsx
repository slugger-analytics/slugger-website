import { fetchWidgets } from "@/api/widget";
import { WidgetType } from "@/data/types";
import { setWidgets, $widgets, $userRole, $widgetQuery, $favWidgetIds, setFavWidgetIds, getFavWidgetIds } from "@/lib/store";
import { useStore } from "@nanostores/react";
import { useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { getFavorites } from "@/api/user";

function useQueryWidgets() {
  const widgets = useStore($widgets);
  const userRole = useStore($userRole);
  const { userId } = useAuth();
  const favWidgetIds = useStore($favWidgetIds);
  const widgetQuery = useStore($widgetQuery);

  const loadWidgets = async () => {
    try {
      const fetchedWidgets = await fetchWidgets();
      const isDev = userRole == "Widget Developer" ? true : false;
      const filteredWidgets = fetchedWidgets.filter((widget) =>
        isDev && userId && widget.developerIds?.includes(userId)
          ? widget
          : !isDev,
      );
      setWidgets([...filteredWidgets]);
      const favWidgetIds = await getFavorites(parseInt(userId));
      setFavWidgetIds(favWidgetIds);
    } catch (error) {
      console.error("Error fetching widgets", error);
    }
  };

  useEffect(() => {
    loadWidgets();
  }, [favWidgetIds]);

  return { widgets };
}

export default useQueryWidgets;
