/**
 * FilterDropdown Component
 *
 * This component renders a dropdown menu for managing filters. It includes functionality to toggle
 * a "Favorites" filter and category filters.
 * The state is managed using React's `useState` and `useEffect` hooks, along with `@nanostores/react` for shared state.
 */

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/app/components/ui/dropdown-menu"; // UI components for dropdown functionality
import { ArrowDownNarrowWideIcon } from "lucide-react";
import { Button } from "../ui/button"; // Button component (not currently used but imported for possible extension)
import { useStore } from "@nanostores/react"; // React hook for accessing nanostores
import { $filters,  $sortBy, $sortDirection, $timeFrame, setSortBy, setSortDirection, setTimeFrame } from "@/lib/store"; // Nanostores state and actions for filters
import { useState, useEffect } from "react"; // React hooks for managing component state and lifecycle
import { Separator } from "../ui/separator";

/**
 * FilterDropdown Component
 *
 * @returns {JSX.Element} - A dropdown menu with filter options.
 */
export default function SortDropdown() {

  // Accessing the shared state using nanostores
  const filters = useStore($filters);
    const sortBy = useStore($sortBy);
    const sortDirection = useStore($sortDirection);
    const timeFrame = useStore($timeFrame);

  return (
    <DropdownMenu>
      {/* Dropdown trigger button with an icon */}
      <DropdownMenuTrigger asChild>
        <button className="mx-3">
          <ArrowDownNarrowWideIcon className="size-6" />
        </button>
      </DropdownMenuTrigger>

      {/* Dropdown menu content */}
      <DropdownMenuContent className="w-56">
        {/* Dropdown label */}
        <DropdownMenuLabel>Sort By</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Favorites filter option */}
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <DropdownMenuCheckboxItem
                checked={sortBy === "launch_count"}
                onCheckedChange={() => setSortBy("launch_count")}
            >
              Launch Count
            </DropdownMenuCheckboxItem>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <DropdownMenuCheckboxItem
                checked={sortBy === "unique_launches"}
                onCheckedChange={() => setSortBy("unique_launches")}
            >
              Unique Launches
            </DropdownMenuCheckboxItem>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        {["launch_count", "unique_launches"].includes(sortBy) && (
            <>
            <Separator />
            <DropdownMenuGroup>
                <DropdownMenuLabel>Order By</DropdownMenuLabel>
                <DropdownMenuItem>
                    <DropdownMenuCheckboxItem
                        checked={sortDirection === "asc"}
                        onCheckedChange={() => setSortDirection("asc")}
                    >
                        Ascending
                    </DropdownMenuCheckboxItem>
                </DropdownMenuItem>
                <DropdownMenuItem>
                    <DropdownMenuCheckboxItem
                        checked={sortDirection === "desc"}
                        onCheckedChange={() => setSortDirection("desc")}
                    >
                        Descending
                    </DropdownMenuCheckboxItem>
                </DropdownMenuItem>
                </DropdownMenuGroup>
                <Separator />
                <DropdownMenuGroup>
                    <DropdownMenuLabel>Time Frame</DropdownMenuLabel>
                    <DropdownMenuItem>
                        <DropdownMenuCheckboxItem
                            checked={timeFrame === "weekly"}
                            onCheckedChange={() => setTimeFrame("weekly")}
                        >
                            Weekly
                        </DropdownMenuCheckboxItem>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                        <DropdownMenuCheckboxItem
                            checked={timeFrame === "monthly"}
                            onCheckedChange={() => setTimeFrame("monthly")}
                        >
                            Monthly
                        </DropdownMenuCheckboxItem>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                        <DropdownMenuCheckboxItem
                            checked={timeFrame === "yearly"}
                            onCheckedChange={() => setTimeFrame("yearly")}
                        >
                            Yearly
                        </DropdownMenuCheckboxItem>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                        <DropdownMenuCheckboxItem
                            checked={timeFrame === "all_time"}
                            onCheckedChange={() => setTimeFrame("all_time")}
                        >
                            All Time
                        </DropdownMenuCheckboxItem>
                    </DropdownMenuItem>
                    
                </DropdownMenuGroup>
            </>
        )}

      </DropdownMenuContent>
    </DropdownMenu>
  );
}
