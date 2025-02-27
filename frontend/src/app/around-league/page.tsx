'use client'
import React, { useState, useEffect } from "react";
import AroundLeague from "@/app/components/AroundLeague";
import { AppSidebar } from "@/app/components/app-sidebar";
import { SidebarProvider } from "@/app/components/ui/sidebar";

const AroundLeaguePage = () => {
 return (
    <SidebarProvider>
      <div className="flex">
        <AppSidebar />
        <div className="container mx-auto p-8">
          <AroundLeague />
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AroundLeaguePage;