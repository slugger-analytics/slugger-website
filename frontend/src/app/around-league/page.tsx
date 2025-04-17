"use client";
import React, { useState, useEffect } from "react";
import Standings from "@/app/around-league/Standings";
import { AppSidebar } from "@/app/components/app-sidebar";
import { SidebarProvider } from "@/app/components/ui/sidebar";
import StatLeaders from "./StatLeaders";

const AroundLeaguePage = () => {
  const [year, setYear] = useState("");
  return (
    <SidebarProvider>
      <AppSidebar />
      <div className="flex flex-col justify-center items-center w-full">
        <h1 className="text-3xl font-bold mb-5">{`${year} Standings`}</h1>
        <Standings setYear={setYear}/>
        <h1 className="text-3xl font-bold mb-5">{`${year} Stat Leaders`}</h1>
        <StatLeaders setYear={setYear}/>
      </div>
    </SidebarProvider>
  );
};

export default AroundLeaguePage;
