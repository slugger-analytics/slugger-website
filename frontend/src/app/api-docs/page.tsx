"use client";

import React, { useState, useEffect } from "react";
import ProtectedRoute from "../components/ProtectedRoutes"; // Importing the ProtectedRoute component
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "../components/ui/sidebar";
import { AppSidebar } from "../components/app-sidebar";
import MarkdownRenderer from "./markdown-renderer";
import MarkdownContent from "./markdown-content";

export default function APIDocs() {
  const [markdownContent, setMarkdownContent] = useState("");

  useEffect(() => {
    fetch("/APIDocs.md")
      .then((response) => response.text())
      .then((text) => setMarkdownContent(text));
    const hash = window.location.hash;
    if (hash) {
      const element = document.querySelector(hash);
      element?.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  return (
    <ProtectedRoute>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <SidebarTrigger />
          <div className="p-10">
            <h1 className="m-0">SLUGGER API Documentation</h1>
            <MarkdownContent />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ProtectedRoute>
  );
}
