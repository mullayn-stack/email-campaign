// Landing page for logged-out users - Multi-campaign platform overview
// Based on blueprint: javascript_log_in_with_replit
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Users, Target, Shield, Mail, Eye, MessageCircle } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

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
                <p className="text-xs text-muted-foreground">Build Advocacy Campaigns</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button 
                onClick={handleLogin}
                variant="outline"
                data-testid="button-login-nav"
              >
                Sign In
              </Button>
              <Button 
                onClick={handleLogin}
                data-testid="button-signup-nav"
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/10"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9ImhzbCgyMjEgODMlIDUzJSAvIDAuMDMpIiBmaWxsLXJ1bGU9Im5vbnplcm8iPjxjaXJjbGUgY3g9IjMwIiBjeT0iMzAiIHI9IjQiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-40"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-foreground mb-8 leading-tight">
              Build Powerful
              <span className="text-primary block">Campaign Platform</span>
            </h1>
            
            <p className="text-xl sm:text-2xl text-muted-foreground mb-8 leading-relaxed max-w-3xl mx-auto">
              Create targeted email advocacy campaigns, contact representatives, and mobilize your community for change. 
              Join thousands of advocates making their voices heard.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button 
                onClick={handleLogin}
                size="lg" 
                className="text-lg px-8 py-4"
                data-testid="button-get-started"
              >
                Create Your Campaign <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                onClick={() => window.location.href = "/campaigns"}
                variant="outline"
                size="lg" 
                className="text-lg px-8 py-4"
                data-testid="button-browse-campaigns"
              >
                Browse Campaigns <Eye className="ml-2 h-5 w-5" />
              </Button>
            </div>

            <div className="flex flex-wrap justify-center gap-6">
              <div className="flex items-center space-x-2 text-muted-foreground">
                <Users className="text-primary h-4 w-4" />
                <span>Multi-Campaign Support</span>
              </div>
              <div className="flex items-center space-x-2 text-muted-foreground">
                <Target className="text-primary h-4 w-4" />
                <span>Targeted Advocacy</span>
              </div>
              <div className="flex items-center space-x-2 text-muted-foreground">
                <Shield className="text-primary h-4 w-4" />
                <span>Secure & Private</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-card/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Everything You Need for Effective Advocacy
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              From campaign creation to community mobilization, our platform provides all the tools you need to create meaningful change.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center border-border bg-background">
              <CardHeader>
                <div className="mx-auto mb-4 p-3 bg-blue-100 dark:bg-blue-900 rounded-full w-fit">
                  <Target className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <CardTitle className="text-foreground">Create Campaigns</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Build custom email campaigns with targeted messaging. Choose your recipients, 
                  customize your message, and launch campaigns that drive action.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center border-border bg-background">
              <CardHeader>
                <div className="mx-auto mb-4 p-3 bg-green-100 dark:bg-green-900 rounded-full w-fit">
                  <Users className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <CardTitle className="text-foreground">Mobilize Community</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Share your campaigns publicly and encourage community participation. 
                  Track engagement, amplify your message, and build momentum together.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center border-border bg-background">
              <CardHeader>
                <div className="mx-auto mb-4 p-3 bg-purple-100 dark:bg-purple-900 rounded-full w-fit">
                  <Shield className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                </div>
                <CardTitle className="text-foreground">Secure & Private</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Your data is protected with enterprise-grade security. Control campaign visibility, 
                  manage privacy settings, and advocate with confidence.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-background">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              How It Works
            </h2>
            <p className="text-xl text-muted-foreground">
              Get started with advocacy in just a few simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="mx-auto mb-6 w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-2xl font-bold">
                1
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-4">Sign Up & Create</h3>
              <p className="text-muted-foreground">
                Create your account and build your first campaign with our intuitive campaign builder. 
                Add recipients, craft your message, and set campaign settings.
              </p>
            </div>

            <div className="text-center">
              <div className="mx-auto mb-6 w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-2xl font-bold">
                2
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-4">Share & Mobilize</h3>
              <p className="text-muted-foreground">
                Publish your campaign for others to participate, or keep it private for your organization. 
                Share the campaign link and watch your community take action.
              </p>
            </div>

            <div className="text-center">
              <div className="mx-auto mb-6 w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-2xl font-bold">
                3
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-4">Track & Impact</h3>
              <p className="text-muted-foreground">
                Monitor campaign engagement, track participation, and measure your impact. 
                Use analytics to optimize future campaigns and drive greater change.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-primary/10 via-background to-secondary/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-6">
            Ready to Make a Difference?
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of advocates who are already creating change through targeted campaigns. 
            Start building your campaign today and mobilize your community for action.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={handleLogin}
              size="lg" 
              className="text-lg px-8 py-4"
              data-testid="button-start-campaign"
            >
              Start Your First Campaign
            </Button>
            <Button 
              onClick={handleLogin}
              variant="outline" 
              size="lg"
              className="text-lg px-8 py-4"
              data-testid="button-learn-more"
            >
              <MessageCircle className="mr-2 h-5 w-5" />
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Mail className="text-primary-foreground text-sm" />
              </div>
              <span className="text-lg font-bold text-foreground">Campaign Platform</span>
            </div>
            <p className="text-muted-foreground">
              Empowering communities to create meaningful change through targeted advocacy campaigns.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}