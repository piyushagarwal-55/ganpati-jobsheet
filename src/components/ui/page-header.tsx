import React from "react";
import { LucideIcon } from "lucide-react";

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  lastUpdated?: Date;
  iconColor?: string;
  children?: React.ReactNode;
}

export function PageHeader({
  title,
  description,
  icon: Icon,
  lastUpdated,
  iconColor = "text-blue-600",
  children,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
      <div className="space-y-1">
        <div className="flex items-center gap-4">
          {Icon && (
            <div
              className={`p-3 rounded-2xl bg-gradient-to-br from-white to-gray-50 border border-gray-200/60 shadow-lg ${iconColor}`}
            >
              <Icon className="w-8 h-8" />
            </div>
          )}
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent tracking-tight">
              {title}
            </h1>
            {description && (
              <p className="text-gray-600 text-lg font-medium mt-1">
                {description}
              </p>
            )}
          </div>
        </div>
        {lastUpdated && (
          <p className="text-sm text-gray-500 ml-16">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        )}
      </div>

      {children && <div className="flex items-center gap-4">{children}</div>}
    </div>
  );
}
