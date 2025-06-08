interface LoadingProps {
  message?: string;
  size?: "sm" | "md" | "lg";
  fullScreen?: boolean;
}

export default function Loading({
  message = "Loading...",
  size = "md",
  fullScreen = false,
}: LoadingProps) {
  const sizeClasses = {
    sm: "w-12 h-12 text-2xl",
    md: "w-16 h-16 text-3xl",
    lg: "w-24 h-24 text-4xl",
  };

  const containerClasses = fullScreen
    ? "fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center"
    : "flex items-center justify-center py-12";

  return (
    <div className={containerClasses}>
      <div className="text-center">
        {/* Animated G with rotating ring */}
        <div className="relative inline-block mb-6">
          {/* Outer rotating ring */}
          <div
            className={`${sizeClasses[size]} border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin`}
          ></div>

          {/* Inner G logo */}
          <div
            className={`absolute inset-0 flex items-center justify-center ${sizeClasses[size]}`}
          >
            <div className="font-bold text-blue-600 animate-pulse">G</div>
          </div>
        </div>

        {/* Loading message */}
        <div className="space-y-2">
          <p className="text-lg font-semibold text-gray-900 animate-pulse">
            {message}
          </p>

          {/* Loading dots animation */}
          <div className="flex justify-center space-x-1">
            <div
              className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
              style={{ animationDelay: "0ms" }}
            ></div>
            <div
              className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
              style={{ animationDelay: "150ms" }}
            ></div>
            <div
              className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
              style={{ animationDelay: "300ms" }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
}
