import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DailyTracker } from "@/components/DailyTracker";
import AuthPage from "@/pages/auth";
import ForgotPasswordPage from "@/pages/forgot-password";
import MobileLoginPage from "@/pages/mobile-login";
import NotFound from "@/pages/not-found";
import { useWebSocket } from "@/hooks/useWebSocket";
import { AuthProvider, useAuth } from "@/lib/auth";
import React from "react";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  React.useEffect(() => {
    // Only redirect if we're done loading and confirmed not authenticated
    if (!isLoading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [isAuthenticated, isLoading, navigate]);

  // Show loading during auth check
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show content if authenticated
  if (isAuthenticated) {
    return <>{children}</>;
  }

  // Show nothing while redirecting
  return null;
}

function Router() {
  useWebSocket();

  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/mobile-login" component={MobileLoginPage} />
      <Route path="/">
        {() => <ProtectedRoute><DailyTracker /></ProtectedRoute>}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;