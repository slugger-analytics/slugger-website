"use client";

import React from "react";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Button } from "../ui/button";
import { useRouter } from "next/navigation";

export default function RegisterWidget() {
  const router = useRouter();

  const handleClick = () => {
    router.push("/register-widget");
  };

  return (
    <Card>
      <CardHeader>{"Don't see any widgets?"}</CardHeader>
      <CardContent className="flex justify-center">
        <Button onClick={handleClick}>Register a widget</Button>
      </CardContent>
    </Card>
  );
}
