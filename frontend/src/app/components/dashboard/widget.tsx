import React, { useState, useEffect } from "react";
import { Button } from "../ui/button";
import Image from "next/image";
import { HeartIcon, HeartFilledIcon, AngleIcon } from "@radix-ui/react-icons";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import EditWidgetDialog from "@/app/components/dialog/EditWidgetDialog"; // Import the dialog component
import { updateWidget } from "@/api/widget"; // Import updateWidget function

type WidgetProps = {
  developerIds: string[];
  imageUrl?: string;
  widgetName: string;
  description: string;
  isFavorite: boolean;
  widgetId: string;
  redirectUrl: string;
  isDev: boolean;
  onUpdateWidget: (updatedWidget: {
    developerIds: string[];
    widgetId: string;
    widgetName: string;
    description: string;
    isFavorite: boolean;
    imageUrl?: string;
    redirectUrl: string;
  }) => void;
};

export default function Widget({
  developerIds,
  imageUrl,
  widgetName,
  description,
  isFavorite,
  widgetId,
  redirectUrl,
  isDev,
  onUpdateWidget,
}: WidgetProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [visibility, setVisibility] = useState("Private"); // Set default visibility as "Private"

  // Function to handle widget redirection
  const redirect = () => {
    // TODO implement this bryan
  };

  // Handle save action in the EditWidgetDialog
  const handleSave = async (data: { title: string; description: string; deploymentLink: string; visibility: string }) => {
    const updatedWidget = {
      developerIds,
      widgetId,
      widgetName: data.title,
      description: data.description,
      isFavorite,
      imageUrl,
      redirectUrl: data.deploymentLink,
    };

    // Update widget using the updateWidget API function
    try {
      await updateWidget(updatedWidget); // Call the API to update the widget in the backend
      onUpdateWidget(updatedWidget); // Call parent handler to update the widget in the parent component's state
      setIsDialogOpen(false); // Close the dialog after saving
    } catch (error) {
      console.error("Error updating widget:", error);
    }
  };

  useEffect(() => {
    console.log("Dialog state after update:", isDialogOpen);
  }, [isDialogOpen]);

  return (
    <Card className="w-[350px]">
      <CardHeader>
        <div className="flex items-center">
          <Avatar className="mr-5">
            <AvatarImage src={imageUrl || ""} alt={widgetName} />
            <AvatarFallback>{widgetName.charAt(0)}</AvatarFallback>
          </Avatar>
          <CardTitle>{widgetName}</CardTitle>
        </div>
      </CardHeader>
      <div className="flex justify-center bg-gray-50 w-full mb-5">
        <div className="h-[175px] py-5 flex justify-center items-center">
          {imageUrl ? (
            <Image src={imageUrl} alt={widgetName} width="150" height="150" />
          ) : (
            <AngleIcon className="size-10 fill-current text-gray-400" />
          )}
        </div>
      </div>
      <CardContent>
        <CardTitle className="mb-3">{widgetName}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardContent>
      <CardFooter className="flex justify-between">
        {isDev && (
          <Button variant="outline" onClick={() => setIsDialogOpen(true)}>
            Edit
          </Button>
        )}
        <div>
          <Button className="ml-3" onClick={redirect}>Launch</Button>
          <Button variant="ghost">{isFavorite ? <HeartFilledIcon /> : <HeartIcon />}</Button>
        </div>
      </CardFooter>

      {/* Conditionally render the dialog */}
      {isDialogOpen && (
        <EditWidgetDialog
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          onSave={handleSave}
          initialData={{ 
            id: widgetId, // Pass the widget id to the dialog
            title: widgetName, 
            description, 
            deploymentLink: redirectUrl, 
            visibility 
          }}
        />
      )}
    </Card>
  );
}
