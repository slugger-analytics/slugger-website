"use client";
import React, { useState, useEffect } from "react";
import AroundLeague from "@/app/components/AroundLeague";
import { AppSidebar } from "@/app/components/app-sidebar";
import { SidebarProvider } from "@/app/components/ui/sidebar";

const AroundLeaguePage = () => {
  const [year, setYear] = useState("");
  return (
    <SidebarProvider>
      <AppSidebar />
      <div className="flex flex-col justify-center items-center w-full">
        <h1 className="text-3xl font-bold">{`${year} ALPB Standings`}</h1>
        <AroundLeague setYear={setYear}/>
      </div>
    </SidebarProvider>
  );
};

export default AroundLeaguePage;
