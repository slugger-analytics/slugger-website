import React from "react";
import { Input } from "../ui/input";

export default function Search() {
  return (
    <div>
      <Input
        type="text"
        placeholder="Search by Widget Name"
        className="w-1/3"
      />
    </div>
  );
}
