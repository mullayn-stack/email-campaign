import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { BarChart3, Users, Mail, Megaphone, Settings, Shield, ArrowLeft, Plus, Eye, Edit, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isAdmin: boolean;
  createdAt: string;
}

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
  userId: string;
  user?: User;
}

interface EmailSubmission {
  id: number;
  campaignId: number;
  senderName: string;
  senderEmail: string;
  postcode: string | null;
  personalNote: string | null;
  createdAt: string;
  campaign?: Campaign;
}

interface AdminStats {
  totalUsers: number;
  totalCampaigns: number;
  publicCampaigns: number;
  totalSubmissions: number;
  recentSubmissions: number;
}

interface AdminStatus {
  isAuthenticated: boolean;
  isAdmin: boolean;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

export default function Admin() {
  const [, setLocation] = useLocation();

  // Check admin status
  const { data: adminStatus, isLoading: statusLoading, error: statusError } = useQuery<AdminStatus>({
    queryKey: ["/api/admin/status"],
    retry: false,
  });

  // Fetch admin stats
  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    enabled: adminStatus?.isAdmin,
  });

  // Fetch all campaigns for admin
  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery<Campaign[]>({
    queryKey: ["/api/admin/campaigns"],
    enabled: adminStatus?.isAdmin,
  });

  // Fetch all users for admin
  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    enabled: adminStatus?.isAdmin,
  });

  // Fetch recent submissions
  const { data: recentSubmissions = [], isLoading: submissionsLoading } = useQuery<EmailSubmission[]>({
    queryKey: ["/api/admin/submissions"],
    enabled: adminStatus?.isAdmin,
  });

  if (statusLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Checking admin access...</p>
        </div>
      </div>
    );
  }

  if (statusError || !adminStatus?.isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md">
          <Shield className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Authentication Required</h1>
          <p className="text-muted-foreground mb-6">
            Please log in to access the admin dashboard.
          </p>
          <div className="space-x-4">
            <Button onClick={() => setLocation("/")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Home
            </Button>
            <Button onClick={() => window.location.href = "/auth/login"} variant="outline">
              Sign In
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!adminStatus?.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md">
          <Shield className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Admin Access Required</h1>
          <p className="text-muted-foreground mb-6">
            You don't have permission to access the admin dashboard.
          </p>
          <Button onClick={() => setLocation("/")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setLocation("/")}
                data-testid="button-back-home"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-2xl font-bold flex items-center">
                  <Shield className="mr-2 h-6 w-6 text-primary" />
                  Admin Dashboard
                </h1>
                <p className="text-muted-foreground">
                  Manage campaigns, users, and platform analytics
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="flex items-center">
                <Users className="mr-1 h-3 w-3" />
                {adminStatus.user?.firstName} {adminStatus.user?.lastName}
              </Badge>
              <Badge variant="default">Admin</Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" data-testid="tab-overview">
              <BarChart3 className="mr-2 h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="campaigns" data-testid="tab-campaigns">
              <Megaphone className="mr-2 h-4 w-4" />
              Campaigns
            </TabsTrigger>
            <TabsTrigger value="users" data-testid="tab-users">
              <Users className="mr-2 h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="submissions" data-testid="tab-submissions">
              <Mail className="mr-2 h-4 w-4" />
              Submissions
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="stat-total-users">
                    {statsLoading ? "..." : stats?.totalUsers || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Registered platform users
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
                  <Megaphone className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="stat-total-campaigns">
                    {statsLoading ? "..." : stats?.totalCampaigns || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {stats?.publicCampaigns || 0} public campaigns
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Email Submissions</CardTitle>
                  <Mail className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="stat-total-submissions">
                    {statsLoading ? "..." : stats?.totalSubmissions || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {stats?.recentSubmissions || 0} in last 7 days
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Platform Health</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">Good</div>
                  <p className="text-xs text-muted-foreground">
                    All systems operational
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Email Submissions</CardTitle>
                <CardDescription>
                  Latest email advocacy submissions across all campaigns
                </CardDescription>
              </CardHeader>
              <CardContent>
                {submissionsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">Loading submissions...</p>
                  </div>
                ) : recentSubmissions.length === 0 ? (
                  <div className="text-center py-8">
                    <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No submissions yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentSubmissions.slice(0, 5).map((submission) => (
                      <div key={submission.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{submission.senderName}</p>
                          <p className="text-sm text-muted-foreground">{submission.senderEmail}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">Campaign: {submission.campaign?.title}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(submission.createdAt)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Campaigns Tab */}
          <TabsContent value="campaigns" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Campaign Management</h2>
                <p className="text-muted-foreground">Manage all campaigns across the platform</p>
              </div>
              <Button data-testid="button-create-campaign" onClick={() => setLocation("/create-campaign")}>
                <Plus className="mr-2 h-4 w-4" />
                Create Campaign
              </Button>
            </div>

            <Card>
              <CardContent>
                {campaignsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">Loading campaigns...</p>
                  </div>
                ) : campaigns.length === 0 ? (
                  <div className="text-center py-8">
                    <Megaphone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No campaigns found</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Campaign</TableHead>
                        <TableHead>Creator</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {campaigns.map((campaign) => (
                        <TableRow key={campaign.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium" data-testid={`campaign-title-${campaign.id}`}>
                                {campaign.title}
                              </p>
                              <p className="text-sm text-muted-foreground">{campaign.tagline}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-sm">{campaign.user?.firstName} {campaign.user?.lastName}</p>
                              <p className="text-xs text-muted-foreground">{campaign.user?.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <Badge variant={campaign.isPublic ? "default" : "secondary"}>
                                {campaign.isPublic ? "Public" : "Private"}
                              </Badge>
                              <Badge variant={campaign.isActive ? "default" : "destructive"}>
                                {campaign.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>{formatDate(campaign.createdAt)}</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                data-testid={`button-view-campaign-${campaign.id}`}
                                onClick={() => setLocation(`/campaign/${campaign.slug}`)}
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                data-testid={`button-edit-campaign-${campaign.id}`}
                                onClick={() => setLocation(`/edit-campaign/${campaign.id}`)}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold">User Management</h2>
              <p className="text-muted-foreground">Manage platform users and permissions</p>
            </div>

            <Card>
              <CardContent>
                {usersLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">Loading users...</p>
                  </div>
                ) : users.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No users found</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead>Campaigns</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium" data-testid={`user-name-${user.id}`}>
                                {user.firstName} {user.lastName}
                              </p>
                              <p className="text-xs text-muted-foreground">ID: {user.id}</p>
                            </div>
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Badge variant={user.isAdmin ? "default" : "secondary"}>
                              {user.isAdmin ? "Admin" : "User"}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(user.createdAt)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {campaigns.filter(c => c.userId === user.id).length} campaigns
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Submissions Tab */}
          <TabsContent value="submissions" className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold">Email Submissions</h2>
              <p className="text-muted-foreground">Track email advocacy submissions and engagement</p>
            </div>

            <Card>
              <CardContent>
                {submissionsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">Loading submissions...</p>
                  </div>
                ) : recentSubmissions.length === 0 ? (
                  <div className="text-center py-8">
                    <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No submissions found</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sender</TableHead>
                        <TableHead>Campaign</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Personal Note</TableHead>
                        <TableHead>Submitted</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentSubmissions.map((submission) => (
                        <TableRow key={submission.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium" data-testid={`submission-sender-${submission.id}`}>
                                {submission.senderName}
                              </p>
                              <p className="text-sm text-muted-foreground">{submission.senderEmail}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="link" 
                              className="p-0 h-auto text-left"
                              onClick={() => setLocation(`/campaign/${submission.campaign?.slug}`)}
                            >
                              {submission.campaign?.title}
                              <ExternalLink className="ml-1 h-3 w-3" />
                            </Button>
                          </TableCell>
                          <TableCell>
                            {submission.postcode ? (
                              <Badge variant="outline">{submission.postcode}</Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {submission.personalNote ? (
                              <div className="max-w-xs truncate" title={submission.personalNote}>
                                {submission.personalNote}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>{formatDate(submission.createdAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}