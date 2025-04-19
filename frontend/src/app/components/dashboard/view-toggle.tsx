import { $filters, addFilter, removeFilter } from "@/lib/widgetStore";
import { useStore } from "@nanostores/react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

export default function ViewToggle() {
  const filters = useStore($filters);
  const [activeView, setActiveView] = useState<"all" | "favorites">("all");

  useEffect(() => {
    setActiveView(filters.has("favorites") ? "favorites" : "all");
  }, [filters]);

  const toggleView = (view: "all" | "favorites") => {
    if (view === "favorites") {
      addFilter("favorites");
    } else {
      removeFilter("favorites");
    }
    setActiveView(view);
  };

  return (
    <div className="flex space-x-6 pt-6">
      <button
        onClick={() => toggleView("all")}
        className={cn(
          "text-sm transition-all px-2 py-1 rounded-md hover:bg-accent",
          activeView === "all"
            ? "font-bold text-primary"
            : "font-normal text-muted-foreground",
        )}
      >
        All Widgets
      </button>
      <button
        onClick={() => toggleView("favorites")}
        className={cn(
          "text-sm transition-all px-2 py-1 rounded-md hover:bg-accent",
          activeView === "favorites"
            ? "font-bold text-primary"
            : "font-normal text-muted-foreground",
        )}
      >
        Favorites
      </button>
    </div>
  );
}
