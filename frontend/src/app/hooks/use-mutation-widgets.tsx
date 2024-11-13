import { WidgetType } from "@/data/types";
import { $favWidgetIds, addFavWidgetId, removeFavWidgetId, updateStoreWidget } from "@/lib/store";
import { updateWidget } from "@/api/widget";
import { useAuth } from "../contexts/AuthContext";
import { addFavorite, removeFavorite } from "@/api/user";
import { useStore } from "@nanostores/react";

function useMutationWidgets() {
  const { userId } = useAuth();
  const favWidgetIds = useStore($favWidgetIds);

  const editWidget = async ({
    id,
    name,
    description,
    redirectLink,
    visibility,
  }: WidgetType) => {
    try {
      const updatedWidget = await updateWidget({
        id,
        name,
        description,
        redirectLink,
        visibility,
      });
      updateStoreWidget({ id, name, description, visibility, redirectLink });
    } catch (error) {
      console.error("Error updating widget:", error);
    }
  };

  const toggleFavWidget = async (widgetId: number) => {
    try {
      const id = parseInt(userId);
      if (favWidgetIds.has(widgetId)) {
        await removeFavorite(id, widgetId);
        removeFavWidgetId(widgetId);
        console.log("removed widget from favs")
        return "removed";
      } else {
        await addFavorite(id, widgetId);
        addFavWidgetId(widgetId);
        console.log("added widget to favs")
        return "added";
      }
    } catch (error) {
      console.error("Error updating widget:", error);
    }
  };

  return {
    editWidget,
    toggleFavWidget
  };
}


export default useMutationWidgets;
