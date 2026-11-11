import { fetchWidgets, getWidgetCollaborators } from "@/api/widget";
import { WidgetCollaboratorsType } from "@/data/types";
import {
  setWidgets,
  $widgets,
  setFavWidgetIds,
  setCategories,
  setTargetWidgetCollaborators,
} from "@/lib/widgetStore";
import { $user } from "@/lib/userStore";
import { useStore } from "@nanostores/react";
import { useEffect, useState } from "react";
import { getFavorites } from "@/api/user";
import { getCategories } from "@/api/categories";
import { catalogVisibleToWidgetDeveloper } from "@/lib/widgetVisibility";

function useQueryWidgets() {
  const widgets = useStore($widgets);
  const user = useStore($user);
  const [widgetsLoading, setWidgetsLoading] = useState(false);

  const loadWidgets = async () => {
    try {
      setWidgetsLoading(true);
      const [fetchedWidgets, categories] = await Promise.all([
        fetchWidgets(),
        getCategories(),
      ]);
      
      const isPublicWidgetDeveloper =
        user.role === "widget developer" ||
        user.role === "public widget developer" ||
        user.role === "site side";

      const filteredWidgets = isPublicWidgetDeveloper
        ? fetchedWidgets.filter((widget) =>
            catalogVisibleToWidgetDeveloper(widget, user.id),
          )
        : fetchedWidgets;

      setWidgets([...filteredWidgets]);
      
      // Fetch favorite widget IDs for the user
      const favWidgetIds = (await getFavorites(parseInt(user.id))) as number[];
      setFavWidgetIds(favWidgetIds);

      setCategories(categories);
    } catch (error) {
      console.error("Error fetching widgets:", error);
    } finally {
      setWidgetsLoading(false);
    }
  };

  useEffect(() => {
    if (user.id) {
      loadWidgets();
    }
  }, [user.id]); // eslint-disable-line

  return { widgets, widgetsLoading };
}

export const callGetWidgetCollaborators = async (widgetId: number) => {
  try {
    const widgetCollaborators: WidgetCollaboratorsType[] =
      await getWidgetCollaborators(widgetId);
    setTargetWidgetCollaborators(widgetCollaborators);
  } catch (error) {
    console.error("Error fetching widget collaborators:", error);
  }
};

export default useQueryWidgets;
