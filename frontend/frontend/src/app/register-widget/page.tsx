// import { sql } from '@vercel/postgres';
import { WidgetForm } from "./WidgetForm";
import Navbar from "../components/navbar/Navbar";
import ProtectedRoute from "../components/ProtectedRoutes";

export default function Home() {
  return (
    <ProtectedRoute>
      <div>
        <Navbar initials={"DB"} />
        <div className="w-full flex justify-center">
          <div className="bg-gray-100 w-1/2 max-w-lg px-10 my-10 shadow-md rounded-lg">
            <div className="flex justify-center">
              <h1>Register a widget</h1>
            </div>
            <main className="flex justify-center w-full">
              <WidgetForm />
            </main>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
