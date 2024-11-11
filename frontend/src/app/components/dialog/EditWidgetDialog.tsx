import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/app/components/ui/alert-dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Checkbox } from "../ui/checkbox";
import { useState } from "react";
import { updateWidget } from "@/api/widget"; 
import { useStore } from "@nanostores/react";
import { $targetWidget } from "@/lib/store";

interface EditWidgetDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

const EditWidgetDialog: React.FC<EditWidgetDialogProps> = ({ isOpen, onClose, onSave }) => {
  const targetWidget = useStore($targetWidget);
  const [name, setName] = useState(targetWidget.name || "");
  const [description, setDescription] = useState(targetWidget.description || "");
  const [deploymentLink, setDeploymentLink] = useState(targetWidget.redirectLink || "");
  const [visibility, setVisibility] = useState(targetWidget.visibility || "Private");

  const handleSave = async () => {
    console.log("saving w/ new name:", name)
    try {
      await updateWidget({ id: targetWidget.id, name, description, redirectLink: deploymentLink, visibility}); 
      onClose(); 
      onSave();
    } catch (error) {
      console.error("Error updating widget:", error);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Edit Widget</AlertDialogTitle>
          <AlertDialogDescription>
            Update the widget's details below and save your changes.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          {/* Title Input */}
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 30))}
              placeholder="Widget Title"
              maxLength={30}
            />
          </div>

          {/* Description Input */}
          <div>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 100))}
              placeholder="Widget Description"
              maxLength={100}
            />
          </div>

          {/* Deployment Link Input */}
          <div>
            <Label htmlFor="deploymentLink">Deployment Link</Label>
            <Input
              id="deploymentLink"
              value={deploymentLink}
              onChange={(e) => setDeploymentLink(e.target.value.slice(0, 100))}
              placeholder="https://example.com"
              maxLength={100}
            />
          </div>

          {/* Visibility Options */}
          <div>
            <Label>Visibility</Label>
            <div className="flex items-center space-x-4 mt-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="visibility-private"
                  checked={visibility === "Private"}
                  onCheckedChange={() => setVisibility("Private")}
                />
                <Label htmlFor="visibility-private">Private</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="visibility-public"
                  checked={visibility === "Public"}
                  onCheckedChange={() => setVisibility("Public")}
                />
                <Label htmlFor="visibility-public">Public</Label>
              </div>
            </div>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleSave}>Save</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default EditWidgetDialog;
