import { fetchWidgets } from "@/api/widget";
import { WidgetType } from "@/data/types";
import { setWidgets, $widgets, $widgetQuery, $favWidgetIds, setFavWidgetIds, getFavWidgetIds, incrementFiltersVersion, incrementWidgetsVersion } from "@/lib/store";
import { useStore } from "@nanostores/react";
import { useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { getFavorites } from "@/api/user";

function useQueryWidgets() {
  const widgets = useStore($widgets);
  const { userId, userRole } = useAuth();

  const loadWidgets = async () => {
    try {
      const fetchedWidgets = await fetchWidgets();
      console.log("fetched:", fetchedWidgets)
      const isDev = userRole == "Widget Developer" ? true : false;
      const filteredWidgets = fetchedWidgets.filter((widget) =>
        isDev && userId && widget.developerIds?.includes(userId)
          ? widget
          : !isDev,
      );
      setWidgets([...filteredWidgets]);
      incrementWidgetsVersion();
      const favWidgetIds = await getFavorites(parseInt(userId));
      setFavWidgetIds(favWidgetIds);
      incrementFiltersVersion();
    } catch (error) {
      console.error("Error fetching widgets", error);
    }
  };

  useEffect(() => {
    loadWidgets();
  }, [userId]);

  return { widgets };
}

export default useQueryWidgets;
