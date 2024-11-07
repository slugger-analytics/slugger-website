import React, { useState } from "react";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { Input } from "@/app/components/ui/input"; // Assuming this is the Input without the label prop
import { Checkbox } from "@/app/components/ui/checkbox";

// Type for the EditWidgetDialog component props
type EditWidgetDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { title: string; description: string; deploymentLink: string; visibility: string }) => void;
};

export function EditWidgetDialog({ isOpen, onClose, onSave }: EditWidgetDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deploymentLink, setDeploymentLink] = useState("");
  const [visibility, setVisibility] = useState("Private");

  const handleSave = () => {
    console.log("Saving data:", { title, description, deploymentLink, visibility }); // Log when saving data
    onSave({ title, description, deploymentLink, visibility });
    onClose(); // Close the dialog after save
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Widget</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={30}
              placeholder="Enter title"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={100}
              placeholder="Enter description"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Deployment Link</label>
            <Input
              value={deploymentLink}
              onChange={(e) => setDeploymentLink(e.target.value)}
              maxLength={100}
              placeholder="Enter link"
            />
          </div>
          <div className="flex items-center space-x-3">
            <Checkbox
              checked={visibility === "Private"}
              onChange={() => setVisibility(visibility === "Private" ? "Public" : "Private")}
            />
            <span>{visibility === "Private" ? "Private" : "Public"}</span>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
