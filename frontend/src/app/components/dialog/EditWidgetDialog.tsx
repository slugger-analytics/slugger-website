import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/app/components/ui/alert-dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Checkbox } from "../ui/checkbox";
import { useEffect, useState } from "react";
import { useStore } from "@nanostores/react";
import {
  $categories,
  $targetWidget,
  $targetWidgetCollaborators,
} from "@/lib/widgetStore";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import useMutationWidgets from "@/app/hooks/use-mutation-widgets";
import IconSelector from "./IconSelector";
import { Eye, EyeOff } from "lucide-react";
import { Separator } from "../ui/separator";
import { useToast } from "@/hooks/use-toast";
import { ClipboardIcon } from "lucide-react";
import CategorySelector from "../dashboard/category-selector";
import { CategoryType } from "@/data/types";
import { addWidgetCollaborator, getWidgetCollaborators, getWidgetTeamAccess, updateWidgetTeamAccess } from "@/api/widget";
import { getTeams } from "@/api/teams";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/app/components/ui/accordion";

interface EditWidgetDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Team {
  team_id: string;
  team_name: string;
}

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
  const [targetWidgetCategories, setTargetWidgetCategories] = useState(
    targetWidget.categories,
  );
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [isLoadingTeams, setIsLoadingTeams] = useState(false);

  const { editWidget, handleDeleteWidget } = useMutationWidgets(); // Hook for editing widgets
  const [visible, setVisible] = useState(false);
  const categories = useStore($categories);
  const [categoriesToAdd, setCategoriesToAdd] = useState(
    new Set<CategoryType>(),
  );
  const [categoriesToRemove, setCategoriesToRemove] = useState(
    new Set<CategoryType>(),
  );
  const collaborators = useStore($targetWidgetCollaborators);

  const { toast } = useToast();

  const [newCollaboratorEmail, setNewCollaboratorEmail] = useState("");
  const [isAddingCollaborator, setIsAddingCollaborator] = useState(false);

  // Fetch teams when dialog opens
  useEffect(() => {
    if (isOpen) {
      const fetchTeams = async () => {
        setIsLoadingTeams(true);
        try {
          const teamsData = await getTeams();
          setTeams(teamsData);
        } catch (error) {
          console.error("Error fetching teams:", error);
          toast({
            title: "Error loading teams",
            description: "Could not load teams. Please try again later.",
            variant: "destructive",
          });
        } finally {
          setIsLoadingTeams(false);
        }
      };

      fetchTeams();
    }
  }, [isOpen, toast]);

  // Fetch widget team access when dialog opens or when teams are loaded
  useEffect(() => {
    if (isOpen && targetWidget.id && teams.length > 0) {
      const fetchTeamAccess = async () => {
        try {

          const teamIds = await getWidgetTeamAccess(targetWidget.id);

          
          if (Array.isArray(teamIds) && teamIds.length > 0) {
            setSelectedTeamIds(teamIds);
            
          } else {
            setSelectedTeamIds([]);
          }
        } catch (error) {
          console.error("Error fetching widget team access:", error);
          // Don't show error toast since this might be a new widget or widget without team access yet
          setSelectedTeamIds([]);
        }
      };

      fetchTeamAccess();
    }
  }, [isOpen, targetWidget.id, teams, toast]);

  // Update local state when the target widget changes
  useEffect(() => {
    if (targetWidget.id) {
      setName(targetWidget.name || "");
      setDescription(targetWidget.description || "");
      setDeploymentLink(targetWidget.redirectLink || "");
      
      // Ensure visibility is properly capitalized
      const visibilityValue = targetWidget.visibility || "Private";
      setVisibility(
        visibilityValue.charAt(0).toUpperCase() + visibilityValue.slice(1).toLowerCase()
      );
      
      setImageUrl(targetWidget.imageUrl || "default");
      setRestrictedAccess(targetWidget.restrictedAccess);
      setTargetWidgetCategories(targetWidget.categories);
      
      // Reset team selection when widget changes
      setSelectedTeamIds([]);
    }
  }, [targetWidget]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedTeamIds([]);
    }
  }, [isOpen]);

  /**
   * Handles saving the updated widget details.
   * Calls the `editWidget` mutation and closes the dialog on success.
   */
  const handleSave = async () => {
    try {      
      const updatedCategories = [
        ...targetWidget.categories.filter((cat) => {
          const matchingCategory = Array.from(categoriesToRemove).find(
            (c) => c.id === cat.id,
          );
          return !matchingCategory; // Keep categories that aren't in categoriesToRemove
        }),
        ...(categoriesToAdd ? Array.from(categoriesToAdd) : []),
      ];

      await editWidget(
        {
          id: targetWidget.id,
          name,
          description,
          redirectLink: deploymentLink,
          visibility,
          imageUrl,
          publicId: targetWidget.publicId,
          restrictedAccess,
          categories: updatedCategories,
          metrics: targetWidget.metrics,
        },
        {
          categoriesToAdd,
          categoriesToRemove,
        },
      );

      // Update team access if the widget is private
      if (visibility === "Private" && targetWidget.id) {
        
        try {
          // Pass the raw team IDs without any conversion
          await updateWidgetTeamAccess(targetWidget.id, selectedTeamIds);
        } catch (teamError) {
          console.error("Error updating team access:", teamError);
          toast({
            title: "Error updating team access",
            description: "Widget information was saved, but team access could not be updated.",
            variant: "destructive",
          });
        }
      }

      toast({
        title: "Widget updated",
        description: "Widget information has been updated successfully.",
      });
      
      onClose(); // Close the dialog after saving
    } catch (error) {
      console.error("Error updating widget:", error);
      toast({
        title: "Error updating widget",
        description: "There was a problem updating the widget. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSetVisibility = (newVisibility: string) => {
    setVisibility(newVisibility);
    if (newVisibility === "Private") {
      setRestrictedAccess(true);
    }
  };

  const handleTeamSelection = (teamId: any) => {
    
    setSelectedTeamIds(prev => {
      // Direct comparison without type conversion to handle UUIDs properly
      const isSelected = prev.includes(teamId);
      
      if (isSelected) {
        // Remove team from selection
        const newSelection = prev.filter(id => id !== teamId);
        return newSelection;
      } else {
        // Add team to selection
        const newSelection = [...prev, teamId];
        return newSelection;
      }
    });
  };

  const handleAddCollaborator = async () => {
    if (!newCollaboratorEmail) return;

    setIsAddingCollaborator(true);
    try {
      // Add user as collaborator
      await addWidgetCollaborator(
        Number(targetWidget.id),
        newCollaboratorEmail,
      );

      // Refresh collaborators list
      const updatedCollaborators = await getWidgetCollaborators(
        Number(targetWidget.id),
      );
      $targetWidgetCollaborators.set(updatedCollaborators);

      // Clear input
      setNewCollaboratorEmail("");

      toast({
        title: "Collaborator added successfully!",
      });
    } catch (error) {
      toast({
        title: "Error adding collaborator",
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsAddingCollaborator(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-h-[90vh] overflow-y-auto rounded-scrollbar">
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
            <Label className="block mb-2">Visibility</Label>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="visibility-private"
                  checked={visibility === "Private"}
                  onChange={() => handleSetVisibility("Private")}
                  className="h-4 w-4"
                />
                <Label htmlFor="visibility-private">Private</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="visibility-public"
                  checked={visibility === "Public"}
                  onChange={() => handleSetVisibility("Public")}
                  className="h-4 w-4"
                />
                <Label htmlFor="visibility-public">Public</Label>
              </div>
            </div>
          </div>

          {/* Team Access Section (only shown when visibility is Private) */}
          {visibility === "Private" && (
            <div className="mt-4">
              <Label className="block mb-2">Team Access</Label>
              <div className="border rounded-md p-3 max-h-40 overflow-y-auto">
                {isLoadingTeams ? (
                  <div className="flex justify-center py-2">Loading teams...</div>
                ) : teams.length === 0 ? (
                  <div className="text-center py-2 text-gray-500">No teams available</div>
                ) : (
                  <div className="space-y-2">
                    {/* Debug info */}
                    <div className="text-xs text-gray-500 mb-2">
                      Selected team IDs: {selectedTeamIds.join(', ') || 'None'}
                    </div>
                    
                    {teams.map((team) => {
                      // Use the raw team_id value without conversion
                      const teamId = team.team_id;
                      const isChecked = selectedTeamIds.includes(teamId);
                     
                      return (
                        <div key={teamId} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`team-${teamId}`}
                            checked={isChecked}
                            onChange={() => {
                              handleTeamSelection(teamId);
                            }}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          <Label htmlFor={`team-${teamId}`}>
                            {team.team_name}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Select which teams can access this private widget
              </p>
            </div>
          )}

          <div>
            <div>
              <Label className="pr-3">Restricted Access</Label>
              <a
                className="text-xs text-blue-600 hover:text-blue-500 text-decoration-line: underline"
                href="/api-docs"
              >
                Learn more
              </a>
            </div>
            <div className="flex items-center space-x-4 mt-2">
              <Checkbox
                id="restricted-access"
                checked={restrictedAccess || visibility === "Private"}
                disabled={visibility === "Private"}
                onCheckedChange={(checked) => 
                  setRestrictedAccess(checked === true)
                }
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
          <Separator></Separator>
          <div>
            <Label>Add Collaborator</Label>
            <div className="flex items-center gap-2 mt-2">
              <Input
                placeholder="Enter email address"
                value={newCollaboratorEmail}
                onChange={(e) => setNewCollaboratorEmail(e.target.value)}
              />
              <Button
                variant="outline"
                onClick={handleAddCollaborator}
                disabled={isAddingCollaborator}
              >
                {isAddingCollaborator ? (
                  <div className="animate-spin">⌛</div>
                ) : (
                  "Add"
                )}
              </Button>
            </div>
          </div>
          <Separator className="my-4" />
          <div>
            <Label>Widget Collaborators</Label>
            <div className="mt-2 space-y-2">
              {collaborators.map((collaborator) => (
                <div
                  key={collaborator.user_id}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded-md"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {collaborator.email}
                    </span>
                    <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded-full">
                      {collaborator.role}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <Separator className="my-4" />
          <div>
            <Accordion type="single" collapsible>
              <AccordionItem value="item-1">
                <AccordionTrigger className="text-[#EF4444]">
                  Danger Zone
                </AccordionTrigger>
                <AccordionContent>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive">Delete widget</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Are sure you want to delete this widget?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction asChild>
                          <Button
                            className="bg-[#EF4444] hover:bg-[#f05454]"
                            onClick={() => handleDeleteWidget(targetWidget.id)}
                          >
                            Permanently delete
                          </Button>
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
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
