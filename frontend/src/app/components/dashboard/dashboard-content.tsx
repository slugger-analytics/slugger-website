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
  return (
    <div className="max-w-full">
      {widgets.length > 0 && (
        <>
          <div className="flex flex-col items-center w-full mt-10">
            <div className="flex justify-center w-full">
              <Search />
              <FilterDropdown />
              <SortDropdown />
            </div>
            <ViewToggle />
          </div>
        </>
      )}
      <div className="flex justify-center p-10">
        {widgets.length > 0 && (
          <div>
            <Widgets />
          </div>
        )}
        {widgets.length == 0 && <RegisterWidget />}{" "}
      </div>
    </div>
  );
}
