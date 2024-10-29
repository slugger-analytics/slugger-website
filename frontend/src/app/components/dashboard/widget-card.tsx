import React from "react";
import { Button } from "../ui/button";
import Image from "next/image";
import { HeartIcon, HeartFilledIcon } from "@radix-ui/react-icons";
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
} from "@/app/components/ui/avatar"

type WidgetProps = {
  developerName: string;
  developerId: string;
  imageUrl?: string;
  avatarUrl?: string;
  widgetName: string;
  description: string;
  isFavorite: boolean;
};

export default function WidgetCard({
  developerName,
  developerId,
  imageUrl,
  widgetName,
  description,
  isFavorite,
}: WidgetProps) {

  return (
    <Card className="w-[350px]">
      <CardHeader>
        <div className="flex items-center">
          <Avatar className="mr-5">
            <AvatarImage src="" alt={developerName} />
            <AvatarFallback>{developerName[0]}</AvatarFallback>
          </Avatar>
          <CardTitle>{developerName}</CardTitle>
        </div>

      </CardHeader>
        <div className="flex justify-center bg-gray-50 w-full mb-5">
          {
            imageUrl ?
            <Image
              src={imageUrl}
              alt="ALPB logo"
              width="150"
              height="150"
              className="py-5"
            />
            : <div className="h-[150px] py-5"></div>
          }
        </div>
      <CardContent>
        <CardDescription>{description}</CardDescription>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline">Edit</Button>
        <div>
          <Button className="ml-3">Launch</Button>
          <Button variant="ghost" >
            {
              isFavorite ? <HeartFilledIcon />
              : <HeartIcon />
            }

          </Button>
        </div>

      </CardFooter>
    </Card>
  );
}
