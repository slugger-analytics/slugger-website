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
import { $activeCategoryIds, $filters, addFilter, removeFilter } from "@/lib/store";
import { useState, useEffect } from "react";

function CategoriesDropdown() {
  const filters = useStore($filters);
  const activeCategories = useStore($activeCategoryIds);

  // useEffect(() => {

  // }, []);

  // const toggleFavsFilter = () => {

  // }
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="mx-3">
          Categories
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuLabel>Categories</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <DropdownMenuCheckboxItem
              //checked={}
              //onCheckedChange={}
            >
              Favorites
            </DropdownMenuCheckboxItem>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem>
            heyyy
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default CategoriesDropdown;
