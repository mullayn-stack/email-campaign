// Campaigns list page - Browse public campaigns
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Search, Mail, Users, ArrowRight, Eye, Target, Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";

interface Campaign {
  id: number;
  title: string;
  slug: string;
  tagline: string | null;
  subject: string;
  body: string;
  isPublic: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

export default function Campaigns() {
  const { user, isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: campaignsResponse, isLoading, error } = useQuery({
    queryKey: ["/api/campaigns"],
    queryFn: async () => {
      const res = await fetch("/api/campaigns");
      const data = await res.json();
      
      // Handle API errors gracefully
      if (!res.ok) {
        throw new Error(data.message || 'Failed to fetch campaigns');
      }
      
      // Ensure we always return an array
      return Array.isArray(data) ? data : [];
    },
  });

  // Ensure campaigns is always an array
  const campaigns = Array.isArray(campaignsResponse) ? campaignsResponse : [];

  const filteredCampaigns = campaigns.filter((campaign: Campaign) => 
    campaign.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (campaign.tagline && campaign.tagline.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleViewCampaign = (slug: string) => {
    setLocation(`/campaign/${slug}`);
  };

  const handleCreateCampaign = () => {
    if (isAuthenticated) {
      setLocation("/create-campaign");
    } else {
      window.location.href = "/api/login";
    }
  };

  const handleSignIn = () => {
    window.location.href = "/api/login";
  };

  const handleBackHome = () => {
    setLocation("/");
  };

  if (isLoading) {
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
                  <p className="text-xs text-muted-foreground">Browse Campaigns</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <Button onClick={handleBackHome} variant="outline" size="sm">
                  Back to Home
                </Button>
              </div>
            </div>
          </div>
        </nav>

        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading campaigns...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <nav className="bg-card/80 backdrop-blur-md border-b border-border sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                  <Mail className="text-primary-foreground text-lg" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-foreground">Campaign Platform</h1>
                  <p className="text-xs text-muted-foreground">Browse Campaigns</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <Button onClick={handleBackHome} variant="outline" size="sm">
                  Back to Home
                </Button>
              </div>
            </div>
          </div>
        </nav>

        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-center">Error Loading Campaigns</CardTitle>
              <CardDescription className="text-center">
                Unable to load campaigns. Please try again later.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => window.location.reload()} className="w-full">
                Retry
              </Button>
            </CardContent>
          </Card>
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
                <p className="text-xs text-muted-foreground">Browse Campaigns</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <>
                  {user?.profileImageUrl && (
                    <img 
                      src={user.profileImageUrl} 
                      alt={`${user.firstName} ${user.lastName}`}
                      className="w-8 h-8 rounded-full object-cover"
                      data-testid="img-user-avatar"
                    />
                  )}
                  <span className="text-sm text-muted-foreground" data-testid="text-user-name">
                    {user?.firstName} {user?.lastName}
                  </span>
                  <Button onClick={handleBackHome} variant="outline" size="sm" data-testid="button-back-home">
                    Dashboard
                  </Button>
                </>
              ) : (
                <>
                  <Button onClick={handleSignIn} variant="outline" size="sm" data-testid="button-signin">
                    Sign In
                  </Button>
                  <Button onClick={handleBackHome} variant="outline" size="sm" data-testid="button-back-home">
                    Home
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary/10 via-background to-secondary/10 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">
              Active Campaigns
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              Discover ongoing advocacy campaigns and join the movement for change. 
              Your voice matters – participate in campaigns that align with your values.
            </p>
            
            {isAuthenticated && (
              <Button 
                onClick={handleCreateCampaign}
                size="lg"
                data-testid="button-create-campaign-hero"
              >
                <Plus className="mr-2 h-5 w-5" />
                Create Your Campaign
              </Button>
            )}
          </div>

          {/* Search */}
          <div className="max-w-md mx-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search campaigns..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-campaigns"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Campaigns Grid */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {filteredCampaigns.length === 0 ? (
            <div className="text-center py-16">
              <Target className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {searchTerm ? "No campaigns found" : "No active campaigns"}
              </h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                {searchTerm 
                  ? "Try adjusting your search terms or browse all campaigns."
                  : "Be the first to create a campaign and start driving change in your community."
                }
              </p>
              {isAuthenticated ? (
                <Button onClick={handleCreateCampaign} data-testid="button-create-first-campaign">
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Campaign
                </Button>
              ) : (
                <Button onClick={handleSignIn} data-testid="button-signin-create">
                  Sign In to Create Campaign
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">
                    {searchTerm ? `Search Results (${filteredCampaigns.length})` : `${filteredCampaigns.length} Active Campaigns`}
                  </h2>
                  <p className="text-muted-foreground">
                    Join these campaigns to make your voice heard
                  </p>
                </div>
                {searchTerm && (
                  <Button 
                    onClick={() => setSearchTerm("")} 
                    variant="outline"
                    data-testid="button-clear-search"
                  >
                    Clear Search
                  </Button>
                )}
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCampaigns.map((campaign: Campaign) => (
                  <Card key={campaign.id} className="hover:shadow-lg transition-shadow duration-200">
                    <CardHeader>
                      <div className="flex justify-between items-start mb-2">
                        <Badge variant="secondary" className="mb-2">
                          Active
                        </Badge>
                        <div className="flex items-center text-xs text-muted-foreground">
                          <Users className="h-3 w-3 mr-1" />
                          Public
                        </div>
                      </div>
                      <CardTitle className="text-lg line-clamp-2" data-testid={`text-campaign-title-${campaign.id}`}>
                        {campaign.title}
                      </CardTitle>
                      {campaign.tagline && (
                        <CardDescription className="line-clamp-2" data-testid={`text-campaign-tagline-${campaign.id}`}>
                          {campaign.tagline}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="bg-secondary/30 rounded-lg p-3">
                          <p className="text-xs text-muted-foreground mb-1">Email Subject:</p>
                          <p className="text-sm font-medium line-clamp-2" data-testid={`text-campaign-subject-${campaign.id}`}>
                            {campaign.subject}
                          </p>
                        </div>
                        
                        <div className="bg-secondary/30 rounded-lg p-3">
                          <p className="text-xs text-muted-foreground mb-1">Message Preview:</p>
                          <p className="text-sm line-clamp-3" data-testid={`text-campaign-preview-${campaign.id}`}>
                            {campaign.body.slice(0, 120)}
                            {campaign.body.length > 120 && "..."}
                          </p>
                        </div>

                        <div className="flex justify-between items-center pt-2">
                          <div className="text-xs text-muted-foreground">
                            Created {new Date(campaign.createdAt).toLocaleDateString()}
                          </div>
                          <Button 
                            onClick={() => handleViewCampaign(campaign.slug)}
                            size="sm"
                            data-testid={`button-view-campaign-${campaign.id}`}
                          >
                            <Eye className="mr-2 h-3 w-3" />
                            Participate
                            <ArrowRight className="ml-2 h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* Call to Action */}
      {filteredCampaigns.length > 0 && !isAuthenticated && (
        <section className="bg-card/30 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              Ready to Create Your Own Campaign?
            </h2>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Join our community of advocates and start your own campaign to drive the change you want to see.
            </p>
            <Button onClick={handleSignIn} size="lg" data-testid="button-signup-cta">
              Get Started Today
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}