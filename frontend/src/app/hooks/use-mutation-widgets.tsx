import { CategoryType, WidgetType } from "@/data/types";
import {
  $favWidgetIds,
  $targetWidget,
  $user,
  addFavWidgetId,
  removeFavWidgetId,
  updateStoreWidget,
} from "@/lib/store";
import { updateWidget, addCategoryToWidget, removeCategoryFromWidget } from "@/api/widget";
import { useAuth } from "../contexts/AuthContext";
import { addFavorite, removeFavorite } from "@/api/user";
import { useStore } from "@nanostores/react";

function useMutationWidgets() {
  const user = useStore($user);
  const favWidgetIds = useStore($favWidgetIds); // Get the favorite widget IDs from the store
  const targetWidget = useStore($targetWidget);

  const editWidget = async ({
    id,
    name,
    description,
    redirectLink,
    visibility,
    imageUrl,
    publicId,
    restrictedAccess,
    categories,
    metrics,
  }: WidgetType, {categoriesToAdd, categoriesToRemove}: {categoriesToAdd: Set<CategoryType>, categoriesToRemove: Set<CategoryType>}) => {
    try {

      const [updatedWidget] = await Promise.all([
        updateWidget({
          id,
          name,
          description,
          redirectLink,
          visibility,
          imageUrl,
          publicId,
          restrictedAccess,
          categories,
          metrics,
        }),
        Promise.all(Array.from(categoriesToAdd).map(category => addCategoryToWidget(id, category.id))),
        Promise.all(Array.from(categoriesToRemove).map(category => removeCategoryFromWidget(id, category.id)))
      ]);
      updateStoreWidget({
        id,
        name,
        description,
        visibility,
        redirectLink,
        imageUrl,
        publicId,
        restrictedAccess,
        categoriesToAdd,
        categoriesToRemove,
      }); // Update the widget in the store
    } catch (error) {
      console.error("Error updating widget:", error);
    }
  };

  const toggleFavWidget = async (widgetId: number) => {
    try {
      if (favWidgetIds.has(widgetId)) {
        await removeFavorite(parseInt(user.id), widgetId); // Remove widget from favorites
        removeFavWidgetId(widgetId); // Update the store to reflect removal
        return "removed";
      } else {
        await addFavorite(parseInt(user.id), widgetId); // Add widget to favorites
        addFavWidgetId(widgetId); // Update the store to reflect addition
        return "added";
      }
    } catch (error) {
      console.error("Error updating widget:", error);
    }
  };

  return {
    editWidget,
    toggleFavWidget,
  };
}

export default useMutationWidgets;
