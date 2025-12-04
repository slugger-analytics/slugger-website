import useQueryWidgets from "@/app/hooks/use-query-widgets";
import { useStore } from "@nanostores/react";
import { $user } from "@/lib/userStore";
import { useAuth } from "@/app/contexts/AuthContext";
import Search from "./search";
import FilterDropdown from "./filter-dropdown";
import SortDropdown from "./sort-dropdown";
import ViewToggle from "./view-toggle";
import Widgets from "./widgets";
import RegisterWidget from "./register-widget";


export default function DashboardContent() {
  const { widgets } = useQueryWidgets();
  const user = useStore($user);
  const { loading } = useAuth();

  const hasWidgets = widgets && widgets.length > 0;

  return (
    <div className="max-w-full">
      {hasWidgets && (
        <div className="w-full mt-10 flex flex-col items-center">
          <h2 className="text-2xl font-semibold mb-6">Widgets</h2>
          <div className="flex justify-center w-full gap-2 px-4 md:px-10">
            <Search />
            <FilterDropdown />
            <SortDropdown />
          </div>
          <ViewToggle />
        </div>
      )}

      <div className="flex justify-center p-10">
        {hasWidgets ? (
          <div>
            {/* Widgets now renders Recent + All internally */}
            <Widgets />
          </div>
        ) : (
          <RegisterWidget />
        )}
      </div>
    </div>
  );
}
