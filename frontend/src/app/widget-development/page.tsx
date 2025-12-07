"use client";

import { useState, useEffect } from "react";
import { AppSidebar } from "@/app/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/app/components/ui/sidebar";
import ProtectedRoute from "../components/ProtectedRoutes";
import { fetchAllDevelopersWithWidgets } from "@/api/developer";
import { DeveloperWithWidgets } from "@/data/types";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
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
} from "../components/ui/alert-dialog";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { deleteUser } from "@/api/user";
import { useToast } from "@/hooks/use-toast";

export default function WidgetDevelopmentPage() {
  const [developers, setDevelopers] = useState<DeveloperWithWidgets[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Track current widget index for each developer
  const [widgetIndices, setWidgetIndices] = useState<Record<number, number>>({});
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);
  const { toast } = useToast();

  // Fetch all developers with their widgets
  useEffect(() => {
    const loadDevelopers = async () => {
      try {
        setLoading(true);
        const data = await fetchAllDevelopersWithWidgets();
        setDevelopers(data);
        // Initialize widget indices to 0 for all developers
        const initialIndices: Record<number, number> = {};
        data.forEach((dev: DeveloperWithWidgets) => {
          initialIndices[dev.user_id] = 0;
        });
        setWidgetIndices(initialIndices);
      } catch (error) {
        console.error("Error fetching developers:", error);
        setError("Error loading developers and widgets");
      } finally {
        setLoading(false);
      }
    };

    loadDevelopers();
  }, []);

  const handlePreviousWidget = (developerId: number, totalWidgets: number) => {
    setWidgetIndices((prev) => ({
      ...prev,
      [developerId]: prev[developerId] > 0 ? prev[developerId] - 1 : totalWidgets - 1,
    }));
  };

  const handleNextWidget = (developerId: number, totalWidgets: number) => {
    setWidgetIndices((prev) => ({
      ...prev,
      [developerId]: prev[developerId] < totalWidgets - 1 ? prev[developerId] + 1 : 0,
    }));
  };

  const handleDeleteDeveloper = async (userId: number, email: string) => {
    setDeletingUserId(userId);
    try {
      await deleteUser(userId);

      toast({
        title: "Developer deleted",
        description: `${email} has been permanently deleted.`,
        variant: "success",
      });

      // Remove the developer from the list
      setDevelopers((prev) => prev.filter((dev) => dev.user_id !== userId));
    } catch (error: any) {
      toast({
        title: "Deletion failed",
        description: error.message || "There was a problem deleting the developer.",
        variant: "destructive",
      });
    } finally {
      setDeletingUserId(null);
    }
  };

  return (
    <ProtectedRoute role="admin">
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <SidebarTrigger />
          <div className="container mx-auto p-8">
            <h1 className="text-3xl mb-8 text-center">Widget Development</h1>

            {error && (
              <p className="text-center text-red-600 mb-4 font-semibold">
                {error}
              </p>
            )}

            {loading ? (
              <p className="text-center text-gray-600">Loading developers and widgets...</p>
            ) : developers.length === 0 ? (
              <p className="text-center text-gray-600">
                No widget developers found.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {developers.map((developer) => {
                  const currentIndex = widgetIndices[developer.user_id] || 0;
                  const hasWidgets = developer.widgets && developer.widgets.length > 0;
                  const currentWidget = hasWidgets && developer.widgets ? developer.widgets[currentIndex] : null;

                  return (
                    <Card
                      key={developer.user_id}
                      className="p-6 bg-white rounded-lg shadow-md border border-gray-200 flex flex-col"
                    >
                      <div className="mb-4 pb-4 border-b border-gray-200">
                        <div className="flex justify-between items-start">
                          <div className="flex-grow">
                            <h2 className="text-xl font-bold text-gray-800">
                              {developer.first_name} {developer.last_name}
                            </h2>
                            <p className="text-gray-600 text-sm mt-1">{developer.email}</p>
                          </div>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                disabled={deletingUserId === developer.user_id}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Developer Account?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete {developer.first_name} {developer.last_name} ({developer.email})?
                                  This action cannot be undone and will permanently delete their account and all associated data.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteDeveloper(developer.user_id, developer.email)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete Developer
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>

                      {hasWidgets && currentWidget ? (
                        <div className="flex flex-col flex-grow">
                          <div className="flex justify-between items-center mb-3">
                            <h3 className="text-sm font-semibold text-gray-700">
                              Widget {currentIndex + 1} of {developer.widgets!.length}
                            </h3>
                            {developer.widgets!.length > 1 && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handlePreviousWidget(developer.user_id, developer.widgets!.length)}
                                  className="h-8 w-8 p-0"
                                >
                                  <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleNextWidget(developer.user_id, developer.widgets!.length)}
                                  className="h-8 w-8 p-0"
                                >
                                  <ChevronRight className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </div>

                          <div className="p-4 bg-gray-50 rounded-md border border-gray-200 flex-grow">
                            <h4 className="font-semibold text-gray-800 mb-3 text-lg">
                              {currentWidget.widget_name}
                            </h4>
                            <div className="space-y-2 text-sm">
                              <p className="text-gray-600">
                                <span className="font-medium">Visibility:</span>{" "}
                                <span
                                  className={
                                    currentWidget.visibility === "public"
                                      ? "text-green-600 font-semibold"
                                      : "text-orange-600 font-semibold"
                                  }
                                >
                                  {currentWidget.visibility}
                                </span>
                              </p>
                              <p className="text-gray-600">
                                <span className="font-medium">Status:</span>{" "}
                                <span
                                  className={
                                    currentWidget.status === "approved"
                                      ? "text-green-600 font-semibold"
                                      : currentWidget.status === "pending"
                                      ? "text-yellow-600 font-semibold"
                                      : "text-red-600 font-semibold"
                                  }
                                >
                                  {currentWidget.status}
                                </span>
                              </p>
                              {currentWidget.teams && currentWidget.teams.length > 0 ? (
                                <div className="mt-3">
                                  <p className="font-medium text-gray-700 mb-1">Teams:</p>
                                  <ul className="list-disc list-inside ml-2">
                                    {currentWidget.teams.map((team) => (
                                      <li key={team.team_id} className="text-gray-600">
                                        {team.team_name}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ) : (
                                <p className="text-gray-500 mt-3 italic">
                                  No team restrictions
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-500 italic">No widgets created yet</p>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ProtectedRoute>
  );
}
