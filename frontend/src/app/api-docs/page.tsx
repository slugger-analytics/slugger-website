"use client";

import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import ProtectedRoute from "../components/ProtectedRoutes"; // Importing the ProtectedRoute component
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "../components/ui/sidebar";
import { AppSidebar } from "../components/app-sidebar";
import SyntaxHighlighter from "react-syntax-highlighter";
import { atomOneDark as markdownStyle } from "react-syntax-highlighter/dist/cjs/styles/hljs";
import MarkdownRenderer from "./markdown-renderer";

export default function APIDocs() {
  const [markdownContent, setMarkdownContent] = useState("");

  useEffect(() => {
    fetch("/APIDocs.md")
      .then((response) => response.text())
      .then((text) => setMarkdownContent(text));
  }, []);

  return (
    <ProtectedRoute>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <SidebarTrigger />
          <div className="p-10">
            <MarkdownRenderer content={markdownContent}></MarkdownRenderer>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ProtectedRoute>
  );
}
