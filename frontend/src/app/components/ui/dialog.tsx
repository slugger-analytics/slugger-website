// ui/dialog.tsx
import * as React from "react";
import * as RadixDialog from "@radix-ui/react-dialog";

export const Dialog = ({ children, triggerText }: any) => {
  return (
    <RadixDialog.Root>
      <RadixDialog.Trigger asChild>
        <button className="button">{triggerText}</button>
      </RadixDialog.Trigger>
      <RadixDialog.Content className="dialog-content">
        {children}
      </RadixDialog.Content>
    </RadixDialog.Root>
  );
};

export const DialogContent = ({ children }: any) => {
  return (
    <RadixDialog.Content className="dialog-box">
      {children}
    </RadixDialog.Content>
  );
};

export const DialogFooter = ({ children }: any) => {
  return <div className="dialog-footer">{children}</div>;
};

export const DialogHeader = ({ children }: any) => {
  return <div className="dialog-header">{children}</div>;
};

export const DialogTitle = ({ children }: any) => {
  return <h2 className="dialog-title">{children}</h2>;
};
