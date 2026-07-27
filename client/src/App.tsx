import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { I18nProvider } from "@/contexts/I18nContext";
import Dashboard from "@/pages/Dashboard";
import Login from "@/pages/Login";
import { Loader2 } from "lucide-react";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, loading, isDemoMode, isGuest } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // In demo mode, guest mode, or authenticated — show the dashboard
  if (isDemoMode || isGuest || user) {
    return <Component />;
  }

  return <Redirect to="/login" />;
}

function Router() {
  const { isDemoMode, user, isGuest } = useAuth();
  return (
    <Switch>
      {/* Login route — redirect to / if already authenticated */}
      <Route path="/login">
        {isDemoMode || isGuest || user ? <Redirect to="/" /> : <Login />}
      </Route>
      {/* Single catch-all — wouter 3.x wildcard: /* matches / and any sub-path */}
      <Route path="/*">
        <ProtectedRoute component={Dashboard} />
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <I18nProvider>
          <AuthProvider>
            <TooltipProvider>
              <Toaster theme="dark" />
              <Router />
            </TooltipProvider>
          </AuthProvider>
        </I18nProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
