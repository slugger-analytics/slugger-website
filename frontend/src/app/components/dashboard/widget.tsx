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
import {
  HeartIcon,
  HeartFilledIcon,
  AngleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  OpenInNewWindowIcon,
} from "@radix-ui/react-icons"; // Radix UI icons
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
import { recordWidgetInteraction } from "@/api/widget";
import { prettyNumber } from "@based/pretty-number";
import { callGetWidgetCollaborators } from "@/app/hooks/use-query-widgets";
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
  categories,
  metrics,
}: WidgetProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false); // Local state for dialog visibility
  const [isExpanded, setIsExpanded] = useState(false); // Local state for description expansion
  const { toggleFavWidget } = useMutationWidgets(); // Custom hook for toggling favorites
  const favWidgets = useStore($favWidgetIds); // Global state for favorite widgets
  const { id: userId } = useStore($user);

  const router = useRouter();

  // Character limit for truncated description
  const CHAR_LIMIT = 111;
  const isLongDescription = description
    ? description.length > CHAR_LIMIT
    : false;
  const truncatedDescription =
    isLongDescription && description
      ? `${description.slice(0, CHAR_LIMIT)}...`
      : description;
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
      recordWidgetInteraction(id, parseInt(userId), "launch");
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
      categories,
      metrics,
    });
    // TODO make API call to get all widget collaborators
    callGetWidgetCollaborators(id);
    setIsDialogOpen(true);
  };

  return (
    <Card className="w-[300px] flex flex-col min-h-[400px]">
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
      <CardContent className="flex-grow">
        <CardTitle className="mb-2 text-lg">{name}</CardTitle>
        <div className="text-sm text-gray-500">
          {isExpanded ? description : truncatedDescription}
          {isLongDescription && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="mt-1 ml-1 p-0 h-auto text-xs text-gray-400 hover:text-gray-600"
            >
              {isExpanded ? (
                <span className="flex items-center">
                  Less <ChevronUpIcon className="ml-1" />
                </span>
              ) : (
                <span className="flex items-center">
                  More <ChevronDownIcon className="ml-1" />
                </span>
              )}
            </Button>
          )}
          <div className="flex flex-wrap gap-2 py-3">
            {categories.map((category) => (
              <CategoryTag
                key={category.name}
                categoryName={category.name}
                hexCode={category.hexCode}
              />
            ))}
          </div>
        </div>
        <CardDescription className="text-sm">
          
        </CardDescription>
      </CardContent>

      {/* Footer Section */}
      <CardFooter className="flex justify-between h-12 mt-auto">
        {/* Edit Button for Developers */}
        <div className="flex">
          {isDev ? (
            <Button variant="outline" size="sm" onClick={handleOpenDialog}>
              Edit
            </Button>
          ) : (
            <></>
          )}
        </div>
        <div className="flex">
          {/* <div className="flex flex-col gap-2"> */}
          {/* Launch Button */}
          <Button size="sm" className="ml-3" onClick={redirect}>
            Launch
            <div className="text-xs text-gray-500 w-5">
              {prettyNumber(metrics.allTimeLaunches, "number-short")}
            </div>
          </Button>
          {/* </div> */}

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
