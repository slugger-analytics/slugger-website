import React, { useState, useEffect } from "react";
import { Button } from "../ui/button";
import Image from "next/image";
import { HeartIcon, HeartFilledIcon, AngleIcon } from "@radix-ui/react-icons";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/app/components/ui/avatar";
import EditWidgetDialog from "@/app/components/dialog/EditWidgetDialog"; // Import the dialog component
import { WidgetType } from "@/data/types";
import { useStore } from "@nanostores/react";
import { $targetWidget, setTargetWidget } from "@/lib/store";

interface WidgetProps extends WidgetType {
  isDev: boolean;
  onUpdateWidget: () => void;
  visibility: string;
}

export default function Widget({
  id,
  name,
  description,
  imageUrl,
  isDev,
  onUpdateWidget,
  visibility,
  redirectLink,
}: WidgetProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const isFavorite = true; // TODO: add functionality to change this

  // Function to handle widget redirection
  const redirect = () => {
    // TODO implement this bryan
  };

  const handleOpenDialog = () => {
    setTargetWidget({
      id,
      name,
      description,
      imageUrl,
      visibility,
      redirectLink,
    });
    setIsDialogOpen(true);
  };

  return (
    <Card className="w-[350px]">
      <CardHeader>
        <div className="flex items-center">
          <Avatar className="mr-5">
            <AvatarImage src={imageUrl || ""} alt={name} />
            <AvatarFallback>{name.charAt(0)}</AvatarFallback>
          </Avatar>
          <CardTitle>{name}</CardTitle>
        </div>
      </CardHeader>
      <div className="flex justify-center bg-gray-50 w-full mb-5">
        <div className="h-[175px] py-5 flex justify-center items-center">
          {imageUrl ? (
            <Image src={imageUrl} alt={name} width="150" height="150" />
          ) : (
            <AngleIcon className="size-10 fill-current text-gray-400" />
          )}
        </div>
      </div>
      <CardContent>
        <CardTitle className="mb-3">{name}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardContent>
      <CardFooter className="flex justify-between">
        {isDev && (
          <Button variant="outline" onClick={handleOpenDialog}>
            Edit
          </Button>
        )}
        <div>
          <Button className="ml-3" onClick={redirect}>
            Launch
          </Button>
          <Button variant="ghost">
            {isFavorite ? <HeartFilledIcon /> : <HeartIcon />}
          </Button>
        </div>
      </CardFooter>

      {/* Conditionally render the dialog */}
      {isDialogOpen && (
        <EditWidgetDialog
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          onSave={onUpdateWidget}
        />
      )}
    </Card>
  );
}
