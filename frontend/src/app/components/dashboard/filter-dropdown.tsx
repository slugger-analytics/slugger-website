import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuSeparator,
} from "@/app/components/ui/dropdown-menu";
import { MixerVerticalIcon } from "@radix-ui/react-icons";
import { Button } from "../ui/button";
import { useStore } from "@nanostores/react";
import {
  $filters,
  $categories,
  $activeCategoryIds,
  addCategoryId,
  removeCategoryId,
  $filtersVersion,
} from "@/lib/widgetStore";
import { useState, useEffect } from "react";
import { Check } from "lucide-react";

function FilterDropdown() {
  // Local state to track whether the "Favorites" filter is active
  const [favsFilterActive, setFavsFilterActive] = useState(false);
  // Accessing the shared state using nanostores
  const filters = useStore($filters);
  const categories = useStore($categories);
  const activeCategoryIds = useStore($activeCategoryIds);
  const filtersVersion = useStore($filtersVersion);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (filters.has("favorites")) {
      setFavsFilterActive(true);
    }
  }, [filters]);

  const toggleCategoryFilter = (categoryId: number) => {
    if (activeCategoryIds.has(categoryId)) {
      removeCategoryId(categoryId);
    } else {
      addCategoryId(categoryId);
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button className="mx-3">
          <MixerVerticalIcon className="size-6" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-56">
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
