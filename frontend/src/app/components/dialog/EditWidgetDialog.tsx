/**
 * EditWidgetDialog Component
 *
 * A dialog for editing widget details. It allows users to update a widget's title, description,
 * deployment link, and visibility. Changes are saved via the `editWidget` mutation, and the dialog
 * can be closed using the `onClose` callback.
 */

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/app/components/ui/alert-dialog"; // UI components for the alert dialog
import { Input } from "../ui/input"; // Input component
import { Label } from "../ui/label"; // Label component
import { Checkbox } from "../ui/checkbox"; // Checkbox component
import { useEffect, useState } from "react"; // React state management
import { useStore } from "@nanostores/react"; // Hook to access nanostores
import { $categories, $targetWidget } from "@/lib/store"; // Store to manage the target widget being edited
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import useMutationWidgets from "@/app/hooks/use-mutation-widgets"; // Hook for widget mutations
import IconSelector from "./IconSelector";
import { Eye, EyeOff } from "lucide-react";
import { Separator } from "../ui/separator";
import { useToast } from "@/hooks/use-toast";
import { ClipboardIcon } from "lucide-react";
import CategorySelector from "../dashboard/category-selector";
import { CategoryType } from "@/data/types";

/**
 * Props for the EditWidgetDialog component.
 * @property {boolean} isOpen - Whether the dialog is open.
 * @property {() => void} onClose - Callback to close the dialog.
 */
interface EditWidgetDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * EditWidgetDialog Component
 *
 * @param {EditWidgetDialogProps} props - Props for the component.
 * @returns {JSX.Element} - The JSX representation of the dialog.
 */
const EditWidgetDialog: React.FC<EditWidgetDialogProps> = ({
  isOpen,
  onClose,
}) => {
  // Access the target widget from the store
  const targetWidget = useStore($targetWidget);

  // Local state for widget fields
  const [name, setName] = useState(targetWidget.name || "");
  const [description, setDescription] = useState(
    targetWidget.description || "",
  );
  const [deploymentLink, setDeploymentLink] = useState(
    targetWidget.redirectLink || "",
  );
  const [visibility, setVisibility] = useState(
    targetWidget.visibility || "Private",
  );
  const [imageUrl, setImageUrl] = useState(targetWidget.imageUrl || "default");
  const [restrictedAccess, setRestrictedAccess] = useState(
    targetWidget.restrictedAccess,
  );
  const [targetWidgetCategories, setTargetWidgetCategories] = useState(targetWidget.categories);

  const { editWidget } = useMutationWidgets(); // Hook for editing widgets
  const [visible, setVisible] = useState(false);
  const categories = useStore($categories);
  const [categoriesToAdd, setCategoriesToAdd] = useState(new Set<CategoryType>());
  const [categoriesToRemove, setCategoriesToRemove] = useState(new Set<CategoryType>());

  const { toast } = useToast();

  /**
   * Handles saving the updated widget details.
   * Calls the `editWidget` mutation and closes the dialog on success.
   */
  const handleSave = async () => {
    try {
      await editWidget({
        id: targetWidget.id,
        name,
        description,
        redirectLink: deploymentLink,
        visibility,
        imageUrl,
        publicId: targetWidget.publicId,
        restrictedAccess,
        categories
      }, {categoriesToAdd, categoriesToRemove});
      onClose(); // Close the dialog after saving
    } catch (error) {
      console.error("Error updating widget:", error);
    }
  };

  const handleSetVisibility = (newVisibility: string) => {
    setVisibility(newVisibility);
    if (newVisibility === "Private") {
      setRestrictedAccess(true);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle>Edit Widget</AlertDialogTitle>
          <AlertDialogDescription>
            {/* {"Update the widget's details below and save your changes."} */}
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
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 500))}
              placeholder="Brief description of your widget"
              maxLength={500}
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

          <div>
            <Label>Icon</Label>
            <IconSelector setImgUrl={setImageUrl} imgUrl={imageUrl} />
          </div>
          <div>
            <Label htmlFor="tags">Tags</Label>
            <CategorySelector
              categories={categories}
              selectedCategories={targetWidgetCategories}
              categoriesToAdd={categoriesToAdd}
              categoriesToRemove={categoriesToRemove}
              setCategoriesToAdd={setCategoriesToAdd}
              setCategoriesToRemove={setCategoriesToRemove}
            ></CategorySelector>
          </div>
          <Separator></Separator>
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
                  onCheckedChange={() => handleSetVisibility("Public")}
                />
                <Label htmlFor="visibility-public">Public</Label>
              </div>
            </div>
          </div>

          <div>
            <Label>Restricted Access</Label>
            <div className="flex items-center space-x-4 mt-2">
              <Checkbox
                id="restricted-access"
                checked={restrictedAccess}
                disabled={visibility === "Private"}
                onCheckedChange={() => setRestrictedAccess((prev) => !prev)}
              />
              <Label htmlFor="restricted-access">
                Generate validation tokens
              </Label>
            </div>
          </div>
          <div>
            <Label>widget_id</Label>
            <div className="flex items-center space-x-2 mt-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setVisible(!visible)}
              >
                {visible ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </Button>
              <div className="w-80 py-2 bg-gray-50 rounded-lg border border-gray-200 break-all text-sm font-mono text-center text-gray-700">
                {visible
                  ? targetWidget.publicId
                  : "••••••••••••••••••••••••••••••••••••"}
              </div>
              <Button
                variant="secondary"
                className="flex items-center gap-2"
                onClick={() => {
                  navigator.clipboard.writeText(targetWidget.publicId);
                  toast({
                    title: "widgetId copied successfully!",
                  });
                }}
              >
                <ClipboardIcon className="h-5 w-5" />
              </Button>
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
