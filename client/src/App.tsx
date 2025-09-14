import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Navigation from "@/components/navigation";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import Admin from "@/pages/admin";
import CreateCampaign from "@/pages/create-campaign";
import Campaigns from "@/pages/campaigns";
import Campaign from "@/pages/campaign";
import WhacAMoleGame from "@/pages/whac-a-mole";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <>
      <Navigation />
      <Switch>
        {isLoading || !isAuthenticated ? (
          <Route path="/" component={Landing} />
        ) : (
          <>
            <Route path="/" component={Home} />
            <Route path="/create-campaign" component={CreateCampaign} />
            {/* Future authenticated routes will go here */}
          </>
        )}
        <Route path="/campaigns" component={Campaigns} />
        <Route path="/campaign/:slug" component={Campaign} />
        <Route path="/game" component={WhacAMoleGame} />
        <Route path="/admin" component={Admin} />
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
