/**
 * Widget Component
 *
 * This component represents a single widget, displaying its information and providing actions
 * such as editing, launching, and favoriting. It uses `Card` as the container for a structured layout.
 * Developers (`isDev` users) can edit the widget details, and all users can toggle the favorite state.
 */

import React, { useEffect, useState } from "react";
import { Button } from "../ui/button"; // Styled button component
import Image from "next/image"; // Next.js image optimization component
import { HeartIcon, HeartFilledIcon, AngleIcon, ChevronDownIcon, ChevronUpIcon } from "@radix-ui/react-icons"; // Radix UI icons
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card"; // Card UI components
import EditWidgetDialog from "@/app/components/dialog/EditWidgetDialog"; // Widget edit dialog
import { WidgetType } from "@/data/types"; // Type definitions for widgets
import { useStore } from "@nanostores/react"; // Nanostores for state management
import { $favWidgetIds, $user, setTargetWidget } from "@/lib/store"; // Global state and actions
import useMutationWidgets from "@/app/hooks/use-mutation-widgets"; // Custom hook for widget mutations
import { Separator } from "../ui/separator";
import { generateToken } from "@/api/user";
import CategoryTag from "./category-tag";

/**
 * WidgetProps Interface
 *
 * @property {boolean} isDev - Indicates whether the user is a developer with edit permissions.
 * @property {boolean} isFavorite - Indicates if the widget is in the user's favorites.
 */
interface WidgetProps extends WidgetType {
  isDev: boolean;
  visibility: string;
  isFavorite: boolean;
}

/**
 * Widget Component
 *
 * @param {WidgetProps} props - Props containing widget data and user state.
 * @returns {JSX.Element} - The JSX representation of a widget.
 */
export default function Widget({
  id,
  name,
  description,
  imageUrl,
  isDev,
  visibility,
  redirectLink,
  publicId,
  restrictedAccess,
  categories
}: WidgetProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false); // Local state for dialog visibility
  const [isExpanded, setIsExpanded] = useState(false); // Local state for description expansion
  const { toggleFavWidget } = useMutationWidgets(); // Custom hook for toggling favorites
  const favWidgets = useStore($favWidgetIds); // Global state for favorite widgets
  const { id: userId } = useStore($user);

  const router = useRouter();

  // Character limit for truncated description
  const CHAR_LIMIT = 111;
  const isLongDescription = description ? description.length > CHAR_LIMIT : false;
  const truncatedDescription = isLongDescription && description
    ? `${description.slice(0, CHAR_LIMIT)}...`
    : description;

  useEffect(() => {
    console.log(categories);
  }, [categories]);

  /**
   * Handles widget redirection.
   * @TODO Implement redirect logic.
   */
  const redirect = async () => {
    if (redirectLink) {
      const url = new URL(redirectLink, window.location.origin);

      if (restrictedAccess) {
        const token = await generateToken(parseInt(userId), publicId);
        url.searchParams.set("alpb_token", token);
      }
      router.push(url.toString());
    } else {
      console.error("Redirect link is missing or invalid.");
    }
  };

  /**
   * Toggles the widget's favorite status.
   */
  const handleToggleFav = () => {
    toggleFavWidget(id);
  };

  /**
   * Opens the edit dialog for the widget.
   * Sets the target widget in global state and shows the dialog.
   */
  const handleOpenDialog = () => {
    setTargetWidget({
      id,
      name,
      description,
      imageUrl,
      visibility,
      redirectLink,
      publicId,
      restrictedAccess,
      categories
    });
    setIsDialogOpen(true);
  };

  return (
    <Card className="w-[300px]">
      {/* Image Section */}
      <div className="flex justify-center w-full mb-3">
        <div className="h-[150px] py-4 bg-gray-50 w-full flex justify-center items-center rounded-t-xl">
          {imageUrl && imageUrl !== "default" ? (
            <Image
              src={imageUrl}
              alt={name}
              width="130"
              height="130"
              className="rounded-full"
            />
          ) : (
            <AngleIcon className="size-8 fill-current text-gray-400" />
          )}
        </div>
      </div>

      {/* Content Section */}
      <CardContent>
        <CardTitle className="mb-2 text-lg">{name}</CardTitle>
        <CardDescription className="text-sm">
          {isExpanded ? description : truncatedDescription}
          {isLongDescription && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsExpanded(!isExpanded)}
              className="mt-1 ml-1 p-0 h-auto text-xs text-gray-400 hover:text-gray-600"
            >
              {isExpanded ? (
                <span className="flex items-center">Less <ChevronUpIcon className="ml-1" /></span>
              ) : (
                <span className="flex items-center">More <ChevronDownIcon className="ml-1" /></span>
              )}
            </Button>
          )}
          <div className="flex gap-2 py-3">
            {categories.map((category) => (
              <CategoryTag key={category.name} categoryName={category.name} hexCode={category.hexCode} />
            ))}
          </div>

        </CardDescription>
      </CardContent>

      {/* Footer Section */}
      <CardFooter className="flex justify-between h-12">
        {/* Edit Button for Developers */}
        {isDev ? (
          <Button variant="outline" size="sm" onClick={handleOpenDialog}>
            Edit
          </Button>
        ) : <div></div>}
        <div>
          {/* Launch Button */}
          <Button size="sm" className="ml-3" onClick={redirect}>
            Launch
          </Button>

          {/* Favorite Button */}
          <Button variant="ghost" size="sm" onClick={handleToggleFav}>
            {favWidgets.has(id) ? <HeartFilledIcon /> : <HeartIcon />}
          </Button>
        </div>
      </CardFooter>

      {/* Edit Dialog */}
      {isDialogOpen && (
        <EditWidgetDialog
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
        />
      )}
    </Card>
  );
}
