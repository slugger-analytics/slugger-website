import React, { useEffect, useState } from "react";
import { Button } from "../ui/button";
import Image from "next/image";
import {
  HeartIcon,
  HeartFilledIcon,
  AngleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@radix-ui/react-icons";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardTitle,
} from "@/app/components/ui/card";
import EditWidgetDialog from "@/app/components/dialog/EditWidgetDialog";
import { WidgetType } from "@/data/types";
import { useStore } from "@nanostores/react";
import { $favWidgetIds, setTargetWidget } from "@/lib/widgetStore";
import { $user } from "@/lib/userStore";
import useMutationWidgets from "@/app/hooks/use-mutation-widgets";
import { generateToken } from "@/api/user";
import CategoryTag from "./category-tag";
import { recordWidgetInteraction } from "@/api/widget";
import { prettyNumber } from "@based/pretty-number";
import { callGetWidgetCollaborators } from "@/app/hooks/use-query-widgets";

interface WidgetProps extends WidgetType {
  isDev: boolean;
  visibility: string;
  isFavorite: boolean;
}

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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const { toggleFavWidget } = useMutationWidgets();
  const favWidgets = useStore($favWidgetIds);
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

  const handleToggleFav = () => {
    toggleFavWidget(id);
  };

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
        <CardDescription className="text-sm"></CardDescription>
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
          {/* Launch Button */}
          <Button size="sm" className="ml-3" onClick={redirect}>
            Launch
            <div className="text-xs text-gray-500 w-5">
              {prettyNumber(metrics.allTimeLaunches, "number-short")}
            </div>
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
