import Link from "next/link";
import Navbar from "../components/navbar/Navbar";
import WidgetCard from "../components/dashboard/widget-card";

export default function Dashboard() {
  return (
    <body>
      <Navbar />
      <div className="m-20">
        <WidgetCard developerName="Widget Team 1" developerId="123" widgetName="Example Widget" description="This widget provides amazing insights for many baseball players." isFavorite={true}/>
        <WidgetCard developerName="Widget Team 1" developerId="123" widgetName="Example Widget" description="This widget provides amazing insights for many baseball players." imageUrl="/alpb-logo.png" isFavorite={false}/>
      </div>
    </body>
  );
}
