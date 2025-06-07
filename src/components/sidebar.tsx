"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  FileText,
  Users,
  BarChart3,
  Home,
  ChevronLeft,
  ChevronRight,
  Building2,
} from "lucide-react";

const navigationItems = [
  {
    title: "Dashboard",
    href: "/",
    icon: Home,
    description: "Overview and analytics",
  },
  {
    title: "Job Sheet Form",
    href: "/job-sheet-form",
    icon: FileText,
    description: "Create and manage job sheets",
  },
  {
    title: "Parties",
    href: "/parties",
    icon: Users,
    description: "Customer management",
  },
  {
    title: "Reports",
    href: "/admin/job-sheet-form",
    icon: BarChart3,
    description: "Analytics & reports",
  },
];

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isActivePath = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  };

  const renderNavigationItem = (item: any, key: string) => {
    const isActive = isActivePath(item.href);

    const linkContent = (
      <Link
        href={item.href}
        className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 group ${
          isActive
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-gray-700 hover:bg-gray-100 hover:text-primary"
        } ${isCollapsed ? "justify-center px-2" : ""}`}
      >
        <item.icon
          className={`h-5 w-5 ${isCollapsed ? "" : "flex-shrink-0"}`}
        />
        {!isCollapsed && <span className="flex-1">{item.title}</span>}
      </Link>
    );

    if (isCollapsed) {
      return (
        <Tooltip key={key} delayDuration={0}>
          <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
          <TooltipContent side="right" className="flex items-center gap-4">
            <div>
              <div className="font-medium">{item.title}</div>
              <div className="text-xs opacity-70">{item.description}</div>
            </div>
          </TooltipContent>
        </Tooltip>
      );
    }

    return linkContent;
  };

  return (
    <TooltipProvider>
      <div
        className={`relative bg-white border-r border-gray-200 transition-all duration-300 ${
          isCollapsed ? "w-20" : "w-64"
        } ${className}`}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex h-16 items-center justify-between px-4 border-b border-gray-200 bg-gray-50/50">
            {!isCollapsed && (
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary shadow-sm">
                  <Building2 className="h-5 w-5 text-primary-foreground" />
                </div>
                <div className="flex flex-col">
                  <span className="text-lg font-bold text-gray-900">
                    Ganpathi Overseas
                  </span>
                  <span className="text-xs text-gray-500 -mt-1">
                    Job Sheet Management
                  </span>
                </div>
              </div>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-100 shrink-0"
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto py-4">
            <div className={`space-y-1 ${isCollapsed ? "px-2" : "px-4"}`}>
              {navigationItems.map((item, index) =>
                renderNavigationItem(item, `nav-${index}`)
              )}
            </div>
          </div>

          {/* User Profile Section */}
          <div className="border-t border-gray-200 p-4 bg-gray-50/30">
            {!isCollapsed ? (
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src="/placeholder-avatar.jpg" />
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                    AS
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    Amrendra Singh
                  </div>
                  <div className="text-xs text-gray-500">Administrator</div>
                </div>
              </div>
            ) : (
              <div className="flex justify-center">
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      className="h-9 w-9 p-0 rounded-full hover:bg-gray-100"
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarImage src="/placeholder-avatar.jpg" />
                        <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                          AS
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <div className="space-y-1">
                      <div className="text-sm font-medium">Amrendra Singh</div>
                      <div className="text-xs opacity-70">Administrator</div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </div>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
