import { fetchWidgets, getWidgetCollaborators } from "@/api/widget";
import { WidgetCollaboratorsType, WidgetType } from "@/data/types";
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

interface FilteredOutWidget {
  id: number;
  name: string;
  visibility?: string;
  reason: string;
}

function useQueryWidgets() {
  const widgets = useStore($widgets);
  const user = useStore($user);
  const [widgetsLoading, setWidgetsLoading] = useState(false);

  const loadWidgets = async () => {
    try {
      setWidgetsLoading(true);
      const [fetchedWidgets, categories] = await Promise.all([
        fetchWidgets(user.id),
        getCategories(),
      ]);

      // Debug log to check what we're getting
      console.log("Fetched widgets:", fetchedWidgets.map(w => ({
        id: w.id,
        name: w.name,
        visibility: w.visibility
      })));
      
      // Check if the user is a Widget Developer
      const isDev = user.role === "widget developer" ? true : false;

      // Modified filter logic to keep track of why widgets are filtered out
      const filteredWidgets: WidgetType[] = [];
      const filteredOutWidgets: FilteredOutWidget[] = [];
      
      fetchedWidgets.forEach((widget) => {
        // For Widget Developers: only include widgets they're associated with
        if (isDev) {
          if (user.id && widget.developerIds?.includes(parseInt(user.id))) {
            filteredWidgets.push(widget);
          } else {
            filteredOutWidgets.push({
              id: widget.id,
              name: widget.name,
              visibility: widget.visibility,
              reason: 'Not in developer IDs'
            });
          }
        } 
        // For non-developers: include all widgets
        else {
          filteredWidgets.push(widget);
        }
      });

      console.log("Filtered widgets:", filteredWidgets.map(w => ({
        id: w.id,
        name: w.name,
        visibility: w.visibility
      })));
      
      if (filteredOutWidgets.length > 0) {
        console.log("Filtered OUT widgets:", filteredOutWidgets);
      }

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
