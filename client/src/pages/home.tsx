// Home page for authenticated users - Multi-campaign dashboard
// Based on blueprint: javascript_log_in_with_replit
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Users, Target, TrendingUp, Mail, User, LogOut } from "lucide-react";
import { useLocation } from "wouter";

export default function Home() {
  const { user, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const handleCreateCampaign = () => {
    setLocation("/create-campaign");
  };

  const handleViewCampaigns = () => {
    setLocation("/campaigns");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="bg-card/80 backdrop-blur-md border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <Mail className="text-primary-foreground text-lg" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">Campaign Platform</h1>
                <p className="text-xs text-muted-foreground">Your Dashboard</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {user?.profileImageUrl && (
                <img 
                  src={user.profileImageUrl} 
                  alt={`${user.firstName} ${user.lastName}`}
                  className="w-8 h-8 rounded-full object-cover"
                  data-testid="img-user-avatar"
                />
              )}
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-foreground" data-testid="text-user-name">
                  {user?.firstName || user?.lastName ? `${user.firstName} ${user.lastName}` : 'User'}
                </p>
                <p className="text-xs text-muted-foreground" data-testid="text-user-email">
                  {user?.email}
                </p>
              </div>
              <Button 
                onClick={handleLogout}
                variant="outline"
                size="sm"
                data-testid="button-logout"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Welcome Section */}
      <section className="bg-gradient-to-r from-primary/10 via-background to-secondary/10 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">
              Welcome back{user?.firstName && `, ${user.firstName}`}!
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Ready to create change? Manage your campaigns, track engagement, and mobilize your community.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={handleCreateCampaign}
                size="lg"
                data-testid="button-create-campaign"
              >
                <Plus className="mr-2 h-5 w-5" />
                Create New Campaign
              </Button>
              <Button 
                onClick={handleViewCampaigns}
                variant="outline"
                size="lg"
                data-testid="button-view-campaigns"
              >
                <Target className="mr-2 h-5 w-5" />
                View All Campaigns
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Dashboard Overview */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-foreground mb-8">Dashboard Overview</h2>
          
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">My Campaigns</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-my-campaigns">0</div>
                <p className="text-xs text-muted-foreground">Total campaigns created</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Reach</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-total-reach">0</div>
                <p className="text-xs text-muted-foreground">People reached across campaigns</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Impact Score</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-impact-score">0</div>
                <p className="text-xs text-muted-foreground">Campaign engagement rate</p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="grid md:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Plus className="mr-2 h-5 w-5 text-primary" />
                  Get Started
                </CardTitle>
                <CardDescription>
                  New to the platform? Start with these essential actions.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={handleCreateCampaign}
                  className="w-full justify-start"
                  variant="outline"
                  data-testid="button-create-first-campaign"
                >
                  <Target className="mr-2 h-4 w-4" />
                  Create Your First Campaign
                </Button>
                <Button 
                  onClick={handleViewCampaigns}
                  className="w-full justify-start"
                  variant="outline"
                  data-testid="button-explore-campaigns"
                >
                  <Users className="mr-2 h-4 w-4" />
                  Explore Public Campaigns
                </Button>
                <Button 
                  onClick={() => alert("Profile settings coming soon!")}
                  className="w-full justify-start"
                  variant="outline"
                  data-testid="button-setup-profile"
                >
                  <User className="mr-2 h-4 w-4" />
                  Complete Your Profile
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="mr-2 h-5 w-5 text-primary" />
                  Recent Activity
                </CardTitle>
                <CardDescription>
                  Your latest campaign activity and updates.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p className="text-sm">No activity yet</p>
                  <p className="text-xs">Create your first campaign to get started!</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}