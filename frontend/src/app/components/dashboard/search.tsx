import React from "react";
import { Input } from "../ui/input";
import { setWidgetQuery } from "@/lib/widgetStore";

export default function Search() {
  return (
    <Input
      type="text"
      placeholder="Search for widgets"
      className="w-1/3 max-w-72"
      onChange={(e) => setWidgetQuery(e.target.value)}
    />
  );
}
