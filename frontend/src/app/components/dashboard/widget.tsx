import React, { useState, useEffect } from "react";
import { Button } from "../ui/button";
import Image from "next/image";
import { HeartIcon, HeartFilledIcon, AngleIcon } from "@radix-ui/react-icons";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { EditWidgetDialog } from "@/app/components/dialog/EditWidgetDialog"; // Import the dialog component

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

  const redirect = () => {
    // TODO implement this bryan
  };

  const handleSave = (data: { title: string; description: string; deploymentLink: string; visibility: string }) => {
    console.log("Saving widget:", data); // Log data when saving
    const updatedWidget = {
      developerIds,
      widgetId,
      widgetName: data.title,
      description: data.description,
      isFavorite,
      imageUrl,
      redirectUrl: data.deploymentLink,
    };
    onUpdateWidget(updatedWidget);
    setIsDialogOpen(false); // Close the dialog after save
  };

  // Log the dialog state when it changes
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
          <Button variant="outline" onClick={() => {
            console.log("Edit button clicked"); // Log when the Edit button is clicked
            setIsDialogOpen(true); // Open the dialog
          }}>
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
        />
      )}
    </Card>
  );
}
