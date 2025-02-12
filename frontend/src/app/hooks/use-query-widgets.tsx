import { fetchWidgets } from "@/api/widget";
import { WidgetType } from "@/data/types";
import {
  setWidgets,
  $widgets,
  setFavWidgetIds,
  $user,
  setCategories,
} from "@/lib/store";
import { useStore } from "@nanostores/react";
import { useEffect } from "react";
import { getFavorites } from "@/api/user";
import { getCategories } from "@/api/categories";

function useQueryWidgets() {
  const widgets = useStore($widgets);
  const user = useStore($user);

  const loadWidgets = async () => {
    try {
      const [fetchedWidgets, categories] = await Promise.all([
        fetchWidgets(),
        getCategories(),
      ]);
      // Check if the user is a Widget Developer
      const isDev = user.role === "widget developer" ? true : false;

      // Filter widgets based on the user role and developer IDs
      const filteredWidgets = fetchedWidgets.filter((widget) =>
        isDev && user.id && widget.developerIds?.includes(parseInt(user.id))
          ? widget
          : !isDev,
      );
      setWidgets([...filteredWidgets]);
      // Fetch favorite widget IDs for the user
      const favWidgetIds = (await getFavorites(parseInt(user.id))) as number[];
      setFavWidgetIds(favWidgetIds);

      if (isDev) {
        setCategories(categories);
      }
    } catch (error) {
      console.error("Error fetching widgets", error);
    }
  };

  useEffect(() => {
    if (user.id) {
      loadWidgets();
    }
  }, [user.id]); // eslint-disable-line

  return { widgets };
}

export default useQueryWidgets;
