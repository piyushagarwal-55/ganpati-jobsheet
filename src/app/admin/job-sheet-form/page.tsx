import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { adminAuthAction } from "@/app/actions";
import {
  Lock,
  FileText,
  TrendingUp,
  BarChart3,
  Shield,
  Settings,
  Star,
  Sparkles,
  CheckCircle,
} from "lucide-react";
import { cookies } from "next/headers";
import JobSheetAdminDashboard from "@/components/job-sheet-admin-dashboard";

export default async function AdminJobSheetPage() {
  const cookieStore = cookies();
  const isAuthenticated = cookieStore.get("admin-auth")?.value === "true";

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[70vh] py-8">
        <div className="w-full max-w-md">
          {/* Header Section */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl shadow-sm mb-6 border border-blue-200">
              <BarChart3 className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              Reports Dashboard
            </h1>
            <p className="text-gray-600">
              Access comprehensive business reports and analytics
            </p>
          </div>

          {/* Authentication Card */}
          <Card className="shadow-lg border border-gray-200 bg-white/90 backdrop-blur-sm">
            <CardHeader className="text-center pb-6">
              <div className="flex items-center justify-center w-12 h-12 bg-gray-50 rounded-lg mb-4 mx-auto border border-gray-200">
                <Lock className="w-5 h-5 text-gray-600" />
              </div>
              <CardTitle className="text-xl font-semibold text-gray-800">
                Secure Access
              </CardTitle>
              <p className="text-sm text-gray-600 mt-2">
                Enter your admin credentials to continue
              </p>
            </CardHeader>
            <CardContent className="pt-0">
              <form action={adminAuthAction as any} className="space-y-6">
                <div className="space-y-2">
                  <Label
                    htmlFor="passcode"
                    className="text-sm font-medium text-gray-700"
                  >
                    Admin Passcode
                  </Label>
                  <Input
                    id="passcode"
                    name="passcode"
                    type="password"
                    placeholder="Enter your admin passcode"
                    required
                    className="h-11 border-gray-200 focus:border-blue-400 focus:ring-blue-400 focus:ring-2 focus:ring-opacity-20 rounded-lg transition-all"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                >
                  Access Reports Dashboard
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Features Section */}
          <div className="grid grid-cols-3 gap-4 mt-8">
            <div className="text-center">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mx-auto mb-2 border border-blue-100">
                <FileText className="w-5 h-5 text-blue-500" />
              </div>
              <p className="text-xs text-gray-600 font-medium">Job Reports</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center mx-auto mb-2 border border-green-100">
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-xs text-gray-600 font-medium">Analytics</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center mx-auto mb-2 border border-purple-100">
                <BarChart3 className="w-5 h-5 text-purple-500" />
              </div>
              <p className="text-xs text-gray-600 font-medium">Insights</p>
            </div>
          </div>

          {/* Security Notice */}
          <div className="mt-8 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center border border-gray-200">
                <Shield className="w-4 h-4 text-gray-600" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-800">
                  Secure Access
                </h4>
                <p className="text-xs text-gray-600">
                  Your data is protected with advanced security measures
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <JobSheetAdminDashboard />
    </div>
  );
}
