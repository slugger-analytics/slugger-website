import Link from "next/link";
import Navbar from "../components/navbar/Navbar";
import Widget from "../components/dashboard/widget";
import Widgets from "../components/dashboard/widgets";
import Search from "../components/dashboard/search";

export default function Dashboard() {
  return (
    <body>
      <Navbar />
      {/* <Search /> */}
      <div className="flex justify-center">
        <Widgets />
      </div>
    </body>
  );
}
