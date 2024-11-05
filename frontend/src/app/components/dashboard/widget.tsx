import React from "react";
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

type WidgetProps = {
  developerIds: string[];
  imageUrl?: string;
  avatarUrl?: string;
  widgetName: string;
  description: string;
  isFavorite: boolean;
  widgetId: string;
  redirectUrl: string
  isDev: boolean;
};

export default function Widget({
  developerIds,
  imageUrl,
  widgetName,
  description,
  isFavorite,
  widgetId,
  redirectUrl,
  isDev
}: WidgetProps) {

  const redirect = () => {
    // TODO implement this bryan
  }


  return (
    <Card className="w-[350px]">
      <CardHeader>
        <div className="flex items-center">
          <Avatar className="mr-5">
            <AvatarImage src="" alt={"TMP"} />
            <AvatarFallback>{"TMP"}</AvatarFallback>
          </Avatar>
          <CardTitle>{"TMP"}</CardTitle>
        </div>
      </CardHeader>
      <div className="flex justify-center bg-gray-50 w-full mb-5">
        <div className="h-[175px] py-5 flex justify-center items-center">
          {imageUrl ? (
            <Image src={imageUrl} alt={imageUrl} width="150" height="150" />
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
        {isDev && <Button variant="outline">Edit</Button>}
        <div>
          <Button className="ml-3" onClick={redirect}>Launch</Button>
          <Button variant="ghost">
            {isFavorite ? <HeartFilledIcon /> : <HeartIcon />}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
