"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
  CreditCard,
  BarChart3,
  Settings,
  Menu,
  Home,
  Plus,
  History,
  Building2,
} from "lucide-react";

const navigationItems = [
  {
    title: "Dashboard",
    href: "/",
    icon: Home,
    description: "Overview and quick stats",
  },
  {
    title: "Job Sheets",
    href: "/job-sheet-form",
    icon: FileText,
    description: "Create and manage job sheets",
  },
  {
    title: "Parties",
    href: "/parties",
    icon: Users,
    description: "Manage customers and vendors",
  },
  {
    title: "Reports",
    href: "/admin/job-sheet-form",
    icon: BarChart3,
    description: "Analytics & Reports",
  },
];

export function Navbar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const isActivePath = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  };

  const NavLink = ({
    href,
    children,
    className = "",
    icon: Icon,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
    icon?: any;
  }) => (
    <Link
      href={href}
      className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground ${
        isActivePath(href)
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground"
      } ${className}`}
    >
      {Icon && <Icon className="w-4 h-4" />}
      {children}
    </Link>
  );

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Building2 className="w-6 h-6 text-primary" />
            <Link href="/" className="text-xl font-bold text-foreground">
              Ganpathi Overseas
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:gap-6">
            {navigationItems.map((item) => (
              <NavLink key={item.href} href={item.href} icon={item.icon}>
                {item.title}
              </NavLink>
            ))}

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <Button asChild size="sm">
                <Link href="/job-sheet-form">
                  <Plus className="w-4 h-4 mr-2" />
                  New Job
                </Link>
              </Button>
            </div>
          </div>

          {/* Mobile Menu */}
          <div className="md:hidden">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    Ganpathi Overseas
                  </SheetTitle>
                  <SheetDescription>
                    Job Sheet Management System
                  </SheetDescription>
                </SheetHeader>

                <div className="mt-6 space-y-4">
                  {/* Quick Action */}
                  <Button asChild className="w-full">
                    <Link
                      href="/job-sheet-form"
                      onClick={() => setIsOpen(false)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create New Job Sheet
                    </Link>
                  </Button>

                  {/* Navigation Items */}
                  <div className="space-y-2">
                    {navigationItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsOpen(false)}
                        className={`flex items-center gap-3 px-3 py-3 rounded-md transition-colors hover:bg-accent ${
                          isActivePath(item.href)
                            ? "bg-primary text-primary-foreground"
                            : "text-foreground hover:text-accent-foreground"
                        }`}
                      >
                        <item.icon className="w-5 h-5" />
                        <div>
                          <div className="font-medium">{item.title}</div>
                          <div className="text-xs opacity-70">
                            {item.description}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}
