import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { I18nProvider } from "@/contexts/I18nContext";
import Dashboard from "@/pages/Dashboard";
import DeviceManagement from "@/pages/DeviceManagement";
import AIConfig from "@/pages/AIConfig";
import FaceLibrary from "@/pages/FaceLibrary";
import Playback from "@/pages/Playback";
import VehicleManagement from "@/pages/VehicleManagement";
import SystemConfig from "@/pages/SystemConfig";
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

      {/* Protected routes — all views rendered inside Dashboard layout */}
      <Route path="/" >
        <ProtectedRoute component={Dashboard} />
      </Route>
      <Route path="/events">
        <ProtectedRoute component={Dashboard} />
      </Route>
      <Route path="/cameras">
        <ProtectedRoute component={Dashboard} />
      </Route>
      <Route path="/playback">
        <ProtectedRoute component={Dashboard} />
      </Route>
      <Route path="/alerts">
        <ProtectedRoute component={Dashboard} />
      </Route>
      <Route path="/automations">
        <ProtectedRoute component={Dashboard} />
      </Route>
      <Route path="/ai-config">
        <ProtectedRoute component={Dashboard} />
      </Route>
      <Route path="/semantic-search">
        <ProtectedRoute component={Dashboard} />
      </Route>
      <Route path="/ai-summary">
        <ProtectedRoute component={Dashboard} />
      </Route>
      <Route path="/frequencia">
        <ProtectedRoute component={Dashboard} />
      </Route>
      <Route path="/person-timeline">
        <ProtectedRoute component={Dashboard} />
      </Route>
      <Route path="/visitor-invite">
        <ProtectedRoute component={Dashboard} />
      </Route>
      <Route path="/vehicle-access">
        <ProtectedRoute component={Dashboard} />
      </Route>
      <Route path="/elevator">
        <ProtectedRoute component={Dashboard} />
      </Route>
      <Route path="/devices">
        <ProtectedRoute component={Dashboard} />
      </Route>
      <Route path="/ai-box">
        <ProtectedRoute component={Dashboard} />
      </Route>
      <Route path="/face-library">
        <ProtectedRoute component={Dashboard} />
      </Route>
      <Route path="/vehicles">
        <ProtectedRoute component={Dashboard} />
      </Route>
      <Route path="/system-config">
        <ProtectedRoute component={Dashboard} />
      </Route>
      <Route path="/user-admin">
        <ProtectedRoute component={Dashboard} />
      </Route>
      <Route path="/audit-log">
        <ProtectedRoute component={Dashboard} />
      </Route>
      <Route path="/settings">
        <ProtectedRoute component={Dashboard} />
      </Route>

      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
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
