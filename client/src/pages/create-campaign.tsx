// Campaign creation page for authenticated users
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Plus, Trash2, Target, Mail, User, Eye, AlertCircle, Copy, Check, AlertTriangle } from "lucide-react";
import { useLocation } from "wouter";
import { validateEmailAdvanced, findDuplicateEmails } from "@/lib/email-validation";
import { checkEmailLength } from "@/lib/email-utils";

interface Recipient {
  name: string;
  email: string;
  error?: string;
}

interface CampaignForm {
  title: string;
  slug: string;
  tagline: string;
  subject: string;
  body: string;
  isPublic: boolean;
  recipients: Recipient[];
}

export default function CreateCampaign() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location, setLocation] = useLocation();

  const [form, setForm] = useState<CampaignForm>({
    title: "",
    slug: "",
    tagline: "",
    subject: "",
    body: "Dear Representative,\n\nI am writing to urge you to [your message here].\n\nRegards,\n{{name}}\n{{postcode}}",
    isPublic: true,
    recipients: [{ name: "", email: "" }]
  });

  // Preview state
  const [previewData, setPreviewData] = useState({
    name: "Your Name",
    postcode: "12345"
  });

  // Copy state
  const [copiedRecipient, setCopiedRecipient] = useState<string | null>(null);

  const createCampaignMutation = useMutation({
    mutationFn: async (campaignData: CampaignForm) => {
      const response = await apiRequest("POST", "/api/campaigns", campaignData);
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Campaign Created!",
        description: "Your campaign has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      // TODO: Navigate to campaign details page when implemented
      setLocation("/");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create campaign",
        variant: "destructive",
      });
    },
  });

  // Auto-generate slug from title
  const handleTitleChange = (title: string) => {
    setForm(prev => ({
      ...prev,
      title,
      slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    }));
  };

  const copyEmailToClipboard = async (recipientName: string, recipientEmail: string) => {
    const body = form.body
      .replace(/{{name}}/g, previewData.name || "Your Name")
      .replace(/{{postcode}}/g, previewData.postcode || "12345");
    
    const emailContent = `To: ${recipientEmail}
Subject: ${form.subject}

${body}`;
    
    try {
      await navigator.clipboard.writeText(emailContent);
      setCopiedRecipient(recipientEmail);
      setTimeout(() => setCopiedRecipient(null), 2000);
      
      toast({
        title: "Email Copied!",
        description: `Email content for ${recipientName} has been copied to your clipboard`,
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Unable to copy to clipboard. Please try again.",
        variant: "destructive",
      });
    }
  };

  const addRecipient = () => {
    setForm(prev => ({
      ...prev,
      recipients: [...prev.recipients, { name: "", email: "" }]
    }));
  };

  const removeRecipient = (index: number) => {
    setForm(prev => ({
      ...prev,
      recipients: prev.recipients.filter((_, i) => i !== index)
    }));
  };

  const updateRecipient = (index: number, field: keyof Recipient, value: string) => {
    setForm(prev => {
      const updatedRecipients = prev.recipients.map((recipient, i) => {
        if (i === index) {
          const updated = { ...recipient, [field]: value };
          // Clear error when field is updated
          if (field === 'email' && value) {
            const validation = validateEmailAdvanced(value);
            updated.error = validation.valid ? undefined : validation.reason;
          } else if (field === 'email' && !value) {
            updated.error = undefined;
          }
          return updated;
        }
        return recipient;
      });
      return { ...prev, recipients: updatedRecipients };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check required fields
    if (!form.title.trim() || !form.subject.trim() || !form.body.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Check if any recipients have missing info
    if (form.recipients.some(r => !r.name.trim() || !r.email.trim())) {
      toast({
        title: "Validation Error", 
        description: "Please fill in all recipient information",
        variant: "destructive",
      });
      return;
    }

    // Validate all email addresses
    const invalidEmails = form.recipients.filter(r => {
      const validation = validateEmailAdvanced(r.email);
      return !validation.valid;
    });

    if (invalidEmails.length > 0) {
      toast({
        title: "Invalid Email Addresses",
        description: `Please fix the following emails: ${invalidEmails.map(r => r.email).join(', ')}`,
        variant: "destructive",
      });
      return;
    }

    // Check for duplicates
    const duplicates = findDuplicateEmails(form.recipients);
    if (duplicates.length > 0) {
      toast({
        title: "Duplicate Recipients",
        description: `The following email addresses are duplicated: ${duplicates.join(', ')}`,
        variant: "destructive",
      });
      return;
    }

    // Guard against no recipients
    if (form.recipients.length === 0) {
      toast({
        title: "No Recipients",
        description: "Please add at least one recipient for your campaign",
        variant: "destructive",
      });
      return;
    }

    createCampaignMutation.mutate(form);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>You need to be logged in to create campaigns</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => window.location.href = "/api/login"}
              className="w-full"
              data-testid="button-login-required"
            >
              Sign In to Continue
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="bg-card/80 backdrop-blur-md border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button 
                onClick={() => setLocation("/")}
                variant="ghost"
                size="sm"
                data-testid="button-back-home"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <Target className="text-primary-foreground text-lg" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">Create Campaign</h1>
                <p className="text-xs text-muted-foreground">Build Your Advocacy Campaign</p>
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
              <span className="text-sm text-muted-foreground" data-testid="text-user-name">
                {user?.firstName} {user?.lastName}
              </span>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Form Column */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="mr-2 h-5 w-5 text-primary" />
                  Campaign Details
                </CardTitle>
                <CardDescription>
                  Set up the basic information for your advocacy campaign
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Campaign Title *</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Stop Climate Change Action"
                    value={form.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    data-testid="input-campaign-title"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug">Campaign URL Slug</Label>
                  <Input
                    id="slug"
                    placeholder="auto-generated-from-title"
                    value={form.slug}
                    onChange={(e) => setForm(prev => ({ ...prev, slug: e.target.value }))}
                    data-testid="input-campaign-slug"
                  />
                  <p className="text-xs text-muted-foreground">
                    This will be your campaign URL: /campaign/{form.slug || 'your-slug'}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tagline">Campaign Tagline</Label>
                  <Input
                    id="tagline"
                    placeholder="Brief description of your campaign"
                    value={form.tagline}
                    onChange={(e) => setForm(prev => ({ ...prev, tagline: e.target.value }))}
                    data-testid="input-campaign-tagline"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="public"
                    checked={form.isPublic}
                    onCheckedChange={(checked) => setForm(prev => ({ ...prev, isPublic: checked }))}
                    data-testid="switch-campaign-public"
                  />
                  <Label htmlFor="public">Make campaign public</Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Public campaigns can be discovered and participated in by anyone
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Mail className="mr-2 h-5 w-5 text-primary" />
                  Email Content
                </CardTitle>
                <CardDescription>
                  Craft the email message that supporters will send
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="subject">Email Subject *</Label>
                  <Input
                    id="subject"
                    placeholder="e.g., Urgent: Support Climate Action"
                    value={form.subject}
                    onChange={(e) => setForm(prev => ({ ...prev, subject: e.target.value }))}
                    data-testid="input-email-subject"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="body">Email Body *</Label>
                  <Textarea
                    id="body"
                    placeholder="Write your email template..."
                    value={form.body}
                    onChange={(e) => setForm(prev => ({ ...prev, body: e.target.value }))}
                    rows={8}
                    data-testid="textarea-email-body"
                  />
                  <p className="text-xs text-muted-foreground">
                    Use {'{'}{'{}name}'} and {'{'}{'{}postcode}'} as placeholders for personalization
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="mr-2 h-5 w-5 text-primary" />
                  Recipients
                </CardTitle>
                <CardDescription>
                  Add the representatives or officials who will receive emails
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {form.recipients.map((recipient, index) => (
                  <div key={index} className="flex gap-2 items-end">
                    <div className="flex-1 space-y-2">
                      <Label htmlFor={`name-${index}`}>Name</Label>
                      <Input
                        id={`name-${index}`}
                        placeholder="Rep. John Doe"
                        value={recipient.name}
                        onChange={(e) => updateRecipient(index, 'name', e.target.value)}
                        data-testid={`input-recipient-name-${index}`}
                      />
                    </div>
                    <div className="flex-1 space-y-2">
                      <Label htmlFor={`email-${index}`}>Email</Label>
                      <div className="relative">
                        <Input
                          id={`email-${index}`}
                          type="email"
                          placeholder="john.doe@government.gov"
                          value={recipient.email}
                          onChange={(e) => updateRecipient(index, 'email', e.target.value)}
                          className={recipient.error ? "border-destructive pr-8" : ""}
                          data-testid={`input-recipient-email-${index}`}
                        />
                        {recipient.error && (
                          <AlertCircle className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-destructive" />
                        )}
                      </div>
                      {recipient.error && (
                        <p className="text-xs text-destructive">{recipient.error}</p>
                      )}
                    </div>
                    {form.recipients.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => removeRecipient(index)}
                        data-testid={`button-remove-recipient-${index}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                
                <Button 
                  type="button"
                  variant="outline"
                  onClick={addRecipient}
                  className="w-full"
                  data-testid="button-add-recipient"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Another Recipient
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Preview Column */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Eye className="mr-2 h-5 w-5 text-primary" />
                  Campaign Preview
                </CardTitle>
                <CardDescription>
                  See how your campaign will appear to supporters
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Preview Test Data */}
                <div className="p-3 bg-secondary/20 rounded-lg space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">Test with your details:</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="preview-name" className="text-xs">Your Name</Label>
                      <Input
                        id="preview-name"
                        placeholder="John Smith"
                        value={previewData.name}
                        onChange={(e) => setPreviewData(prev => ({ ...prev, name: e.target.value }))}
                        className="h-8 text-sm"
                        data-testid="input-preview-name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="preview-postcode" className="text-xs">Your Postcode</Label>
                      <Input
                        id="preview-postcode"
                        placeholder="12345"
                        value={previewData.postcode}
                        onChange={(e) => setPreviewData(prev => ({ ...prev, postcode: e.target.value }))}
                        className="h-8 text-sm"
                        data-testid="input-preview-postcode"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 border border-border rounded-lg bg-card">
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {form.title || "Your Campaign Title"}
                  </h3>
                  {form.tagline && (
                    <p className="text-muted-foreground mb-4">{form.tagline}</p>
                  )}
                  
                  <div className="bg-secondary/30 rounded-lg p-3 mb-4">
                    <p className="text-sm text-muted-foreground mb-1">Email Subject:</p>
                    <p className="font-medium">{form.subject || "Your email subject"}</p>
                  </div>

                  <div className="bg-secondary/30 rounded-lg p-3 mb-4">
                    <p className="text-sm text-muted-foreground mb-2">Email Body:</p>
                    <div className="text-sm leading-relaxed whitespace-pre-wrap">
                      {form.body
                        .replace(/{{name}}/g, previewData.name || "Your Name")
                        .replace(/{{postcode}}/g, previewData.postcode || "12345") || "Your email message..."}
                    </div>
                  </div>

                  {/* Email Length Warning */}
                  {(() => {
                    const body = form.body
                      .replace(/{{name}}/g, previewData.name || "Your Name")
                      .replace(/{{postcode}}/g, previewData.postcode || "12345");
                    const lengthCheck = checkEmailLength(form.subject, body);
                    
                    if (lengthCheck.isWarning || lengthCheck.isCritical) {
                      return (
                        <div className={`p-3 rounded-lg flex items-start space-x-2 ${
                          lengthCheck.isCritical ? 'bg-destructive/10 text-destructive' : 'bg-yellow-500/10 text-yellow-700'
                        }`}>
                          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                          <div className="text-xs">
                            <p className="font-medium">Length Warning</p>
                            <p>{lengthCheck.message}</p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Recipients:</p>
                    {form.recipients.filter(r => r.name && r.email).map((recipient, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-2">
                          <User className="h-3 w-3 text-muted-foreground" />
                          <span>{recipient.name}</span>
                          <span className="text-muted-foreground">({recipient.email})</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => copyEmailToClipboard(recipient.name, recipient.email)}
                          className="h-7 px-2"
                          data-testid={`button-copy-email-${index}`}
                        >
                          {copiedRecipient === recipient.email ? (
                            <Check className="h-3 w-3 text-green-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    ))}
                    {form.recipients.every(r => !r.name || !r.email) && (
                      <p className="text-sm text-muted-foreground">No recipients added yet</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <form onSubmit={handleSubmit}>
              <Card>
                <CardContent className="pt-6">
                  <Button 
                    type="submit" 
                    className="w-full" 
                    size="lg"
                    disabled={createCampaignMutation.isPending}
                    data-testid="button-create-campaign"
                  >
                    {createCampaignMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Creating Campaign...
                      </>
                    ) : (
                      <>
                        <Target className="mr-2 h-5 w-5" />
                        Create Campaign
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}