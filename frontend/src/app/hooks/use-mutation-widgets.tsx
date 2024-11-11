import { WidgetType } from "@/data/types";
import { updateStoreWidget } from "@/lib/store";
import { updateWidget } from "@/api/widget";

function useMutationWidgets() {
    const editWidget = async({ id, name, description, redirectLink, visibility }: WidgetType) => {
        try {
            const updatedWidget = await updateWidget({ id, name, description, redirectLink, visibility});
            updateStoreWidget({ id, name, description, visibility, redirectLink });
        } catch (error) {
            console.error("Error updating widget:", error);
        }
    }

    return {
        editWidget,
    }

}

export default useMutationWidgets;