import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/app/components/ui/dropdown-menu";
import { ArrowDownNarrowWideIcon } from "lucide-react";
import { Button } from "../ui/button";
import { useStore } from "@nanostores/react";
import {
  $filters,
  $sortBy,
  $sortDirection,
  $timeFrame,
  setSortBy,
  setSortDirection,
  setTimeFrame,
} from "@/lib/widgetStore";
import { Separator } from "../ui/separator";
import { Check } from "lucide-react";

export default function SortDropdown() {
  // Accessing the shared state using nanostores
  const filters = useStore($filters);
  const sortBy = useStore($sortBy);
  const sortDirection = useStore($sortDirection);
  const timeFrame = useStore($timeFrame);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="mx-3">
          <ArrowDownNarrowWideIcon className="size-6" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-56">
        <DropdownMenuLabel>Sort By</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <Button
            variant="ghost"
            className="w-full flex justify-start"
            onClick={() => setSortBy("launch_count")}
          >
            <div className="w-4">
              {sortBy === "launch_count" ? <Check /> : <></>}
            </div>
            Total launches
          </Button>
          <Button
            variant="ghost"
            className="w-full flex justify-start"
            onClick={() => setSortBy("unique_launches")}
          >
            <div className="w-4">
              {sortBy === "unique_launches" ? <Check /> : <></>}
            </div>
            Unique launches
          </Button>
        </DropdownMenuGroup>
        {["launch_count", "unique_launches"].includes(sortBy) && (
          <>
            <Separator />
            <DropdownMenuGroup>
              <DropdownMenuLabel>Order By</DropdownMenuLabel>
              <Button
                variant="ghost"
                className="w-full flex justify-start"
                onClick={() => setSortDirection("asc")}
              >
                <div className="w-4">
                  {sortDirection === "asc" ? <Check /> : <></>}
                </div>
                Ascending
              </Button>

              <Button
                variant="ghost"
                className="w-full flex justify-start"
                onClick={() => setSortDirection("desc")}
              >
                <div className="w-4">
                  {sortDirection === "desc" ? <Check /> : <></>}
                </div>
                Descending
              </Button>
            </DropdownMenuGroup>
            <Separator />
            <DropdownMenuGroup>
              <DropdownMenuLabel>Time Frame</DropdownMenuLabel>
              <Button
                variant="ghost"
                className="w-full flex justify-start"
                onClick={() => setTimeFrame("weekly")}
              >
                <div className="w-4">
                  {timeFrame === "weekly" ? <Check /> : <></>}
                </div>
                Weekly
              </Button>
              <Button
                variant="ghost"
                className="w-full flex justify-start"
                onClick={() => setTimeFrame("monthly")}
              >
                <div className="w-4">
                  {timeFrame === "monthly" ? <Check /> : <></>}
                </div>
                Monthly
              </Button>
              <Button
                variant="ghost"
                className="w-full flex justify-start"
                onClick={() => setTimeFrame("yearly")}
              >
                <div className="w-4">
                  {timeFrame === "yearly" ? <Check /> : <></>}
                </div>
                Yearly
              </Button>
              <Button
                variant="ghost"
                className="w-full flex justify-start"
                onClick={() => setTimeFrame("all_time")}
              >
                <div className="w-4">
                  {timeFrame === "all_time" ? <Check /> : <></>}
                </div>
                All time
              </Button>
            </DropdownMenuGroup>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
