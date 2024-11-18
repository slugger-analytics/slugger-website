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
import { MixerVerticalIcon } from "@radix-ui/react-icons";
import { Button } from "../ui/button";
import { useStore } from "@nanostores/react";
import { $filters, addFilter, removeFilter } from "@/lib/store";
import { useState, useEffect } from "react";
import CategoriesDropdown from "./categories-dropdown";

function FilterDropdown() {
  const [favsFilterActive, setFavsFilterActive] = useState(false);
  const filters = useStore($filters);

  useEffect(() => {
    if (filters.has("favorites")) {
      setFavsFilterActive(true);
    }
  }, [filters]);

  const toggleFavsFilter = () => {
    if (filters.has("favorites")) {
      removeFilter("favorites");
      setFavsFilterActive(false);
    } else {
      addFilter("favorites");
      setFavsFilterActive(true);
    }
  }
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="mx-3">
          <MixerVerticalIcon className="size-6" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuLabel>Filters</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <DropdownMenuCheckboxItem
              checked={favsFilterActive}
              onCheckedChange={toggleFavsFilter}
            >
              Favorites
            </DropdownMenuCheckboxItem>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem>
            {/* <CategoriesDropdown /> */}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default FilterDropdown;
