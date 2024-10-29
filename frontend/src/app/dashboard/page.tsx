import Link from "next/link";
import Navbar from "../components/navbar/Navbar";
import Widget from "../components/dashboard/widget";
import Widgets from "../components/dashboard/widgets";

export default function Dashboard() {
  return (
    <body>
      <Navbar />
      <div className="flex justify-center">
        <Widgets />
      </div>

    </body>
  );
}
