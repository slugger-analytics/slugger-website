// ui/checkbox.tsx
import * as React from "react";
import * as RadixCheckbox from "@radix-ui/react-checkbox";
import { CheckIcon } from "@radix-ui/react-icons"; // Optional icon

export const Checkbox = ({ label, checked, onChange }: any) => {
  return (
    <div className="flex items-center space-x-2">
      <RadixCheckbox.Root
        checked={checked}
        onCheckedChange={onChange}
        className="radix-checkbox"
      >
        <RadixCheckbox.Indicator>
          <CheckIcon />
        </RadixCheckbox.Indicator>
      </RadixCheckbox.Root>
      {label && <span>{label}</span>}
    </div>
  );
};
