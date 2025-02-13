"use client";

import { Dispatch, SetStateAction, useState } from "react";
import { CategoryType } from "@/data/types";
import { Button } from "../ui/button";
import CategoryTag from "./category-tag";

interface CategorySelectorProps {
  categories: CategoryType[];
  selectedCategories: CategoryType[];
  categoriesToAdd: Set<CategoryType>;
  categoriesToRemove: Set<CategoryType>;
  setCategoriesToAdd: Dispatch<SetStateAction<Set<CategoryType>>>;
  setCategoriesToRemove: Dispatch<SetStateAction<Set<CategoryType>>>;
}

export default function CategorySelector({
  categories,
  selectedCategories,
  categoriesToAdd,
  categoriesToRemove,
  setCategoriesToAdd,
  setCategoriesToRemove,
}: CategorySelectorProps) {
  const isSelected = (category: CategoryType) => {
    return (
      (selectedCategories.some((selected) => selected.name === category.name) ||
        categoriesToAdd.has(category)) &&
      !categoriesToRemove.has(category)
    );
  };

  const handleClick = (category: CategoryType) => {
    const inSelected = selectedCategories.some((c) => c.name === category.name);
    const inToAdd = categoriesToAdd.has(category);
    const inToRemove = categoriesToRemove.has(category);

    if (inSelected) {
      if (inToRemove) {
        // Undo removal
        setCategoriesToRemove((prev) => {
          const newSet = new Set(prev);
          newSet.delete(category);
          return newSet;
        });
      } else {
        // Mark for removal
        setCategoriesToRemove((prev) => new Set(prev).add(category));
      }
    } else {
      if (inToAdd) {
        // Undo addition
        setCategoriesToAdd((prev) => {
          const newSet = new Set(prev);
          newSet.delete(category);
          return newSet;
        });
      } else {
        // Mark for addition
        setCategoriesToAdd((prev) => new Set(prev).add(category));
      }
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((category) => (
        <CategoryTag
          categoryName={category.name}
          hexCode={category.hexCode}
          key={category.name}
          style={{
            fontSize: "14px",
            border: isSelected(category) ? "2px solid gray" : "2px solid white",
            cursor: "pointer",
          }}
          onClick={() => handleClick(category)}
        ></CategoryTag>
      ))}
    </div>
  );
}
