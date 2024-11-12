import React, { useEffect } from "react";
import { Input } from "../ui/input";
import { useState } from "react";
import { useStore } from "@nanostores/react";
import { setWidgetQuery } from "@/lib/store";

export default function Search() {
  return (
    <Input
      type="text"
      placeholder="Search for widgets"
      className="w-1/3 max-w-72 mt-10"
      onChange={(e) => setWidgetQuery(e.target.value)}
    />
  );
}
