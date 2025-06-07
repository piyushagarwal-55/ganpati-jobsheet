"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  FileText,
  Users,
  BarChart3,
  Home,
  Plus,
  Building2,
  Menu,
  DollarSign,
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
    description: "Create and manage jobs",
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
    description: "Analytics & insights",
  },
];

const quickActions = [
  {
    title: "New Job Sheet",
    href: "/job-sheet-form",
    icon: Plus,
    color: "bg-primary hover:bg-primary/90",
  },
  {
    title: "Party Balance",
    href: "/parties",
    icon: DollarSign,
    color: "bg-success hover:bg-success/90",
  },
];

export function MobileNav() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const isActivePath = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="lg:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-80 bg-sidebar text-sidebar-foreground"
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-sidebar-foreground">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Building2 className="h-4 w-4 text-primary-foreground" />
            </div>
            Ganpathi Overseas
          </SheetTitle>
          <SheetDescription className="text-sidebar-muted">
            Job Management System
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Quick Actions */}
          <div>
            <h3 className="px-2 mb-3 text-xs font-semibold text-sidebar-muted uppercase tracking-wider">
              Quick Actions
            </h3>
            <div className="space-y-2">
              {quickActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  onClick={() => setIsOpen(false)}
                >
                  <Button
                    className={`w-full justify-start h-9 text-white ${action.color}`}
                  >
                    <action.icon className="mr-2 h-4 w-4" />
                    {action.title}
                  </Button>
                </Link>
              ))}
            </div>
          </div>

          {/* Navigation Items */}
          <div>
            <h3 className="px-2 mb-3 text-xs font-semibold text-sidebar-muted uppercase tracking-wider">
              Navigation
            </h3>
            <div className="space-y-1">
              {navigationItems.map((item) => {
                const isActive = isActivePath(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-3 transition-all duration-200 ${
                      isActive
                        ? "bg-sidebar-accent text-white shadow-md"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/10 hover:text-sidebar-accent"
                    }`}
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    <div className="flex flex-col">
                      <span className="font-medium">{item.title}</span>
                      <span className="text-xs opacity-70">
                        {item.description}
                      </span>
                    </div>
                    {isActive && (
                      <div className="ml-auto h-2 w-2 rounded-full bg-white" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
