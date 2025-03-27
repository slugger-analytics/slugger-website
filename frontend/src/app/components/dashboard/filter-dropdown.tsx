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
import { MixerVerticalIcon } from "@radix-ui/react-icons"; // Icon used for the dropdown trigger
import { Button } from "../ui/button"; // Button component (not currently used but imported for possible extension)
import { useStore } from "@nanostores/react"; // React hook for accessing nanostores
import {
  $filters,
  addFilter,
  removeFilter,
  $categories,
  $activeCategoryIds,
  addCategoryId,
  removeCategoryId,
  $filtersVersion,
} from "@/lib/store"; // Nanostores state and actions for filters
import { useState, useEffect } from "react"; // React hooks for managing component state and lifecycle
import { Check } from "lucide-react";

/**
 * FilterDropdown Component
 *
 * @returns {JSX.Element} - A dropdown menu with filter options.
 */
function FilterDropdown() {
  // Local state to track whether the "Favorites" filter is active
  const [favsFilterActive, setFavsFilterActive] = useState(false);
  // Accessing the shared state using nanostores
  const filters = useStore($filters);
  const categories = useStore($categories);
  const activeCategoryIds = useStore($activeCategoryIds);
  const filtersVersion = useStore($filtersVersion);
  const [isOpen, setIsOpen] = useState(false);

  /**
   * Sync local state with the global filters state.
   * If "favorites" is present in the global filters, mark it as active locally.
   */
  useEffect(() => {
    if (filters.has("favorites")) {
      setFavsFilterActive(true);
    }
  }, [filters]); // Runs whenever the `filters` state changes

  /**
   * Toggles a category filter.
   * Adds or removes the category ID from active categories.
   */
  const toggleCategoryFilter = (categoryId: number) => {
    if (activeCategoryIds.has(categoryId)) {
      removeCategoryId(categoryId);
    } else {
      addCategoryId(categoryId);
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      {/* Dropdown trigger button with an icon */}
      <DropdownMenuTrigger asChild>
        <button className="mx-3">
          <MixerVerticalIcon className="size-6" />
        </button>
      </DropdownMenuTrigger>

      {/* Dropdown menu content */}
      <DropdownMenuContent className="w-56">
        {/* Categories filter section */}
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-2 py-1.5 text-sm font-semibold">
            Categories
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {categories.map((category) => (
            <Button
              variant="ghost"
              key={category.id}
              className="w-full flex justify-start"
              onClick={() => toggleCategoryFilter(category.id)}
            >
              <div className="w-4">
                {activeCategoryIds.has(category.id) ? <Check /> : <></>}
              </div>
              {category.name}
            </Button>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default FilterDropdown;
