import { WidgetForm } from "./WidgetForm"; // Importing the WidgetForm component
import ProtectedRoute from "../components/ProtectedRoutes"; // Importing the ProtectedRoute component
import { SidebarInset, SidebarProvider, SidebarTrigger } from "../components/ui/sidebar";
import { AppSidebar } from "../components/app-sidebar";

export default function Home() {
  return (
    <ProtectedRoute role="widget developer">
        <SidebarProvider>
        {" "}
        {/* Ensures the route is protected and only accessible to authorized users */}
        <AppSidebar />
        <SidebarInset>
          <SidebarTrigger />
          <div>
            <div className="w-full flex justify-center">
              {" "}
              {/* Centering the content horizontally */}
              <div className="bg-gray-100 w-1/2 max-w-lg px-10 my-10 shadow-md rounded-lg">
                {" "}
                {/* Styling the container */}
                <div className="flex justify-center">
                  {" "}
                  {/* Centering the heading */}
                  <h1>Register a widget</h1> {/* Page heading */}
                </div>
                <main className="flex justify-center w-full">
                  {" "}
                  {/* Centering the form */}
                  <WidgetForm />{" "}
                  {/* WidgetForm component for registering a widget */}
                </main>
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>

    </ProtectedRoute>
  );
}
