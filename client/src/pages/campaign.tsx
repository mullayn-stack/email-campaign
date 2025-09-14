// Individual campaign page - Email sending functionality
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Mail, Users, ExternalLink, Send, User, Target, Copy, Check, AlertTriangle, Share2, QrCode, MessageCircle, Printer, FileText } from "lucide-react";
import { useLocation } from "wouter";
import { emailSubmissionRequestSchema, type EmailSubmissionRequest } from "@shared/schema";
import { checkEmailLength } from "@/lib/email-utils";
import { QRCodeSVG } from "qrcode.react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { SiX, SiFacebook, SiWhatsapp, SiLinkedin } from "react-icons/si";
import { generateLetterPDF, generateAddressLabelsPDF, downloadPDF } from "@/lib/pdf-utils";

import { Campaign as CampaignType, Recipient } from '@shared/schema';

// Using the proper type from shared schema
type EmailFormData = EmailSubmissionRequest;

// Social media share URLs
const getShareUrls = (url: string, title: string, tagline: string) => {
  const text = `${title}: ${tagline || 'Join this email advocacy campaign!'}`;
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(text);
  
  return {
    twitter: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    whatsapp: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
  };
};

export default function Campaign() {
  const [match, params] = useRoute("/campaign/:slug");
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [hasShared, setHasShared] = useState(false);
  const [showQR, setShowQR] = useState(false);

  // Load saved data from localStorage
  const getSavedUserData = () => {
    try {
      const saved = localStorage.getItem('campaignUserData');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          name: parsed.name || "",
          email: parsed.email || "",
          postcode: parsed.postcode || "",
          personalNote: ""  // Don't persist personal notes between campaigns
        };
      }
    } catch (error) {
      console.error('Error loading saved data:', error);
    }
    return {
      name: "",
      email: "",
      postcode: "",
      personalNote: ""
    };
  };

  // Form setup with validation
  const form = useForm<EmailFormData>({
    resolver: zodResolver(emailSubmissionRequestSchema),
    defaultValues: getSavedUserData(),
  });

  // Save user data to localStorage when form values change
  useEffect(() => {
    const subscription = form.watch((value) => {
      if (value.name || value.email || value.postcode) {
        try {
          localStorage.setItem('campaignUserData', JSON.stringify({
            name: value.name,
            email: value.email,
            postcode: value.postcode
          }));
        } catch (error) {
          console.error('Error saving data:', error);
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const slug = params?.slug;

  // Fetch campaign by slug
  const { data: campaign, isLoading: campaignLoading, error: campaignError } = useQuery<CampaignType>({
    queryKey: ["/api/campaigns/slug", slug],
    queryFn: async () => {
      const res = await fetch(`/api/campaigns/slug/${slug}`);
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Campaign not found');
      }
      
      return data;
    },
    enabled: !!slug,
  });

  // Fetch campaign recipients
  const { data: recipients = [], isLoading: recipientsLoading } = useQuery<Recipient[]>({
    queryKey: ["/api/campaigns", campaign?.id, "recipients"],
    queryFn: async () => {
      const res = await fetch(`/api/campaigns/${campaign.id}/recipients`);
      const data = await res.json();
      
      if (!res.ok) {
        return [];
      }
      
      return Array.isArray(data) ? data : [];
    },
    enabled: !!campaign?.id,
  });

  // Submit email submission for tracking
  const submitEmailMutation = useMutation({
    mutationFn: async (submissionData: EmailFormData) => {
      return apiRequest("POST", `/api/campaigns/${campaign.id}/submit`, submissionData);
    },
    onSuccess: () => {
      toast({
        title: "Email Sent!",
        description: "Your email has been sent to the representatives. Thank you for taking action!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns", campaign?.id, "submissions"] });
      
      // Reset form
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send email",
        variant: "destructive",
      });
    },
  });

  const handleBackToCampaigns = () => {
    setLocation("/campaigns");
  };

  const handleShare = (platform: string) => {
    const campaignUrl = `${window.location.origin}/campaign/${slug}`;
    const shareUrls = getShareUrls(campaignUrl, campaign?.title || '', campaign?.tagline || '');
    
    // Mark as shared
    setHasShared(true);
    
    // Open share URL
    if (platform in shareUrls) {
      window.open(shareUrls[platform as keyof typeof shareUrls], '_blank');
    }
    
    // Close dialog after a short delay
    setTimeout(() => {
      setShowShareDialog(false);
    }, 500);
  };

  const generateEmailBody = (recipient: Recipient) => {
    const formData = form.getValues();
    let body = campaign.body;
    
    // Replace template variables
    body = body.replace(/\{\{name\}\}/g, formData.name || "[Your Name]");
    body = body.replace(/\{\{postcode\}\}/g, formData.postcode || "[Your Postcode]");
    
    // Add personal note if provided
    if (formData.personalNote?.trim()) {
      // Find a good place to insert the personal note - after the first paragraph or greeting
      const paragraphs = body.split('\n\n');
      if (paragraphs.length > 1) {
        paragraphs.splice(1, 0, formData.personalNote.trim());
        body = paragraphs.join('\n\n');
      } else {
        body = body + '\n\n' + formData.personalNote.trim();
      }
    }
    
    return body;
  };

  const generateMailtoLink = (recipient: Recipient) => {
    const subject = encodeURIComponent(campaign.subject);
    const body = encodeURIComponent(generateEmailBody(recipient));
    return `mailto:${recipient.email}?subject=${subject}&body=${body}`;
  };

  const checkRecipientEmailLength = (recipient: Recipient) => {
    const body = generateEmailBody(recipient);
    return checkEmailLength(campaign.subject, body);
  };

  const handleFormSubmit = (formData: EmailFormData) => {
    // Show share dialog first if they haven't shared yet
    if (!hasShared && !showShareDialog) {
      setShowShareDialog(true);
      return;
    }
    
    handleSendEmails(formData);
  };

  const handleSendEmails = (formData: EmailFormData) => {
    // Check if campaign is active
    if (!campaign.isActive) {
      toast({
        title: "Campaign Inactive",
        description: "This campaign is no longer active and cannot accept submissions",
        variant: "destructive",
      });
      return;
    }

    // Check for email length issues
    const criticalRecipients = recipients.filter((r: Recipient) => {
      const check = checkRecipientEmailLength(r);
      return check.isCritical;
    });

    if (criticalRecipients.length > 0) {
      toast({
        title: "Email Too Long",
        description: "The email is too long for some recipients. Please use the copy button instead or shorten your message.",
        variant: "destructive",
      });
      return;
    }

    // Track the submission
    submitEmailMutation.mutate(formData);

    // Open email client for each recipient
    recipients.forEach((recipient: Recipient, index: number) => {
      setTimeout(() => {
        window.open(generateMailtoLink(recipient), '_blank');
      }, index * 500); // Stagger the email opens
    });
  };

  const copyEmailToClipboard = async (recipient: Recipient) => {
    const emailContent = `To: ${recipient.email}\nSubject: ${campaign.subject}\n\n${generateEmailBody(recipient)}`;
    
    try {
      await navigator.clipboard.writeText(emailContent);
      setCopiedEmail(recipient.email);
      setTimeout(() => setCopiedEmail(null), 2000);
      
      toast({
        title: "Email Copied!",
        description: "Email content has been copied to your clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Unable to copy to clipboard. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleGenerateLetterPDF = () => {
    if (!campaign || recipients.length === 0) {
      toast({
        title: "Cannot Generate PDF",
        description: "No campaign or recipients available",
        variant: "destructive",
      });
      return;
    }

    const formData = form.getValues();
    
    if (!formData.name || !formData.email) {
      toast({
        title: "Missing Information",
        description: "Please fill in your name and email before generating PDFs",
        variant: "destructive",
      });
      return;
    }

    try {
      const pdfData = {
        campaign: {
          title: campaign.title,
          subject: campaign.subject,
          body: campaign.body,
        },
        personalInfo: {
          name: formData.name,
          email: formData.email,
          postcode: formData.postcode,
          personalNote: formData.personalNote,
        },
        recipients: recipients,
      };

      const pdf = generateLetterPDF(pdfData);
      downloadPDF(pdf, `${campaign.slug}-letter.pdf`);
      
      toast({
        title: "PDF Generated!",
        description: "Your letter PDF has been downloaded",
      });
    } catch (error) {
      toast({
        title: "PDF Generation Failed",
        description: "Unable to generate the PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleGenerateAddressLabelsPDF = () => {
    if (!campaign || recipients.length === 0) {
      toast({
        title: "Cannot Generate Labels",
        description: "No campaign or recipients available",
        variant: "destructive",
      });
      return;
    }

    const formData = form.getValues();
    
    if (!formData.name || !formData.email) {
      toast({
        title: "Missing Information",
        description: "Please fill in your name and email before generating labels",
        variant: "destructive",
      });
      return;
    }

    try {
      const pdfData = {
        campaign: {
          title: campaign.title,
          subject: campaign.subject,
          body: campaign.body,
        },
        personalInfo: {
          name: formData.name,
          email: formData.email,
          postcode: formData.postcode,
          personalNote: formData.personalNote,
        },
        recipients: recipients,
      };

      const pdf = generateAddressLabelsPDF(pdfData);
      downloadPDF(pdf, `${campaign.slug}-address-labels.pdf`);
      
      toast({
        title: "Labels Generated!",
        description: "Your address labels PDF has been downloaded",
      });
    } catch (error) {
      toast({
        title: "Label Generation Failed",
        description: "Unable to generate the labels. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (campaignLoading) {
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
                  <p className="text-xs text-muted-foreground">Loading Campaign...</p>
                </div>
              </div>
              <Button onClick={handleBackToCampaigns} variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Campaigns
              </Button>
            </div>
          </div>
        </nav>

        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading campaign...</p>
          </div>
        </div>
      </div>
    );
  }

  if (campaignError || !campaign) {
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
                  <p className="text-xs text-muted-foreground">Campaign Not Found</p>
                </div>
              </div>
              <Button onClick={handleBackToCampaigns} variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Campaigns
              </Button>
            </div>
          </div>
        </nav>

        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-center">Campaign Not Found</CardTitle>
              <CardDescription className="text-center">
                The campaign you're looking for doesn't exist or is no longer available.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleBackToCampaigns} className="w-full">
                Browse Other Campaigns
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
                <p className="text-xs text-muted-foreground">Participate in Campaign</p>
              </div>
            </div>
            <Button onClick={handleBackToCampaigns} variant="outline" size="sm" data-testid="button-back-campaigns">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Campaigns
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary/10 via-background to-secondary/10 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Badge variant="secondary" className="mb-4">
                <Target className="w-3 h-3 mr-1" />
                Active Campaign
              </Badge>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4" data-testid="text-campaign-title">
              {campaign.title}
            </h1>
            {campaign.tagline && (
              <p className="text-xl text-muted-foreground mb-6 max-w-3xl mx-auto" data-testid="text-campaign-tagline">
                {campaign.tagline}
              </p>
            )}
            <div className="flex justify-center items-center space-x-6 text-sm text-muted-foreground">
              <div className="flex items-center">
                <Users className="w-4 h-4 mr-1" />
                {recipients.length} Recipients
              </div>
              <div className="flex items-center">
                <Mail className="w-4 h-4 mr-1" />
                Public Campaign
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Share Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Share2 className="mr-2 h-5 w-5 text-primary" />
              Share This Campaign
            </CardTitle>
            <CardDescription>
              Help spread the word by sharing this campaign with your network
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              {/* QR Code */}
              <div className="flex flex-col items-center space-y-4">
                <Button
                  onClick={() => setShowQR(!showQR)}
                  variant="outline"
                  className="w-full"
                  data-testid="button-toggle-qr"
                >
                  <QrCode className="mr-2 h-4 w-4" />
                  {showQR ? 'Hide' : 'Show'} QR Code
                </Button>
                {showQR && (
                  <div className="p-4 bg-white rounded-lg">
                    <QRCodeSVG
                      value={`${window.location.origin}/campaign/${slug}`}
                      size={200}
                      level="M"
                      includeMargin={true}
                    />
                  </div>
                )}
              </div>
              
              {/* Social Share Buttons */}
              <div className="space-y-4">
                <p className="text-sm font-medium text-muted-foreground">Share on social media:</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => handleShare('twitter')}
                    variant="outline"
                    className="flex items-center justify-center"
                    data-testid="button-share-twitter"
                  >
                    <SiX className="mr-2 h-4 w-4" />
                    X (Twitter)
                  </Button>
                  <Button
                    onClick={() => handleShare('facebook')}
                    variant="outline"
                    className="flex items-center justify-center"
                    data-testid="button-share-facebook"
                  >
                    <SiFacebook className="mr-2 h-4 w-4" />
                    Facebook
                  </Button>
                  <Button
                    onClick={() => handleShare('whatsapp')}
                    variant="outline"
                    className="flex items-center justify-center"
                    data-testid="button-share-whatsapp"
                  >
                    <SiWhatsapp className="mr-2 h-4 w-4" />
                    WhatsApp
                  </Button>
                  <Button
                    onClick={() => handleShare('linkedin')}
                    variant="outline"
                    className="flex items-center justify-center"
                    data-testid="button-share-linkedin"
                  >
                    <SiLinkedin className="mr-2 h-4 w-4" />
                    LinkedIn
                  </Button>
                </div>
                {hasShared && (
                  <p className="text-sm text-green-600 flex items-center">
                    <Check className="mr-1 h-3 w-3" />
                    Thanks for sharing!
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Email Form */}
          <div className="space-y-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <User className="mr-2 h-5 w-5 text-primary" />
                      Your Information
                    </CardTitle>
                    <CardDescription>
                      Provide your details to personalize the email message
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Your Name *</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="John Smith"
                                data-testid="input-sender-name"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Your Email *</FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder="john@example.com"
                                data-testid="input-sender-email"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="postcode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Postcode (Optional)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="12345"
                              data-testid="input-sender-postcode"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="personalNote"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Personal Note (Optional)</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Add your personal message to make the email more impactful..."
                              rows={3}
                              data-testid="textarea-personal-note"
                              {...field}
                            />
                          </FormControl>
                          <p className="text-xs text-muted-foreground">
                            This will be added to the template message
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Send className="mr-2 h-5 w-5 text-primary" />
                      Send Emails
                    </CardTitle>
                    <CardDescription>
                      Send emails to all {recipients.length} recipients
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      type="submit"
                      className="w-full" 
                      size="lg"
                      disabled={
                        submitEmailMutation.isPending || 
                        !campaign.isActive ||
                        !form.formState.isValid ||
                        !form.watch("name") ||
                        !form.watch("email")
                      }
                      data-testid="button-send-emails"
                    >
                      {submitEmailMutation.isPending ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                          Sending...
                        </>
                      ) : !campaign.isActive ? (
                        <>
                          <Mail className="mr-2 h-5 w-5" />
                          Campaign Inactive
                        </>
                      ) : (
                        <>
                          <Mail className="mr-2 h-5 w-5" />
                          Send to All Recipients
                          <ExternalLink className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      {!campaign.isActive 
                        ? "This campaign is no longer active"
                        : "This will open your email client with pre-filled messages"
                      }
                    </p>
                  </CardContent>
                </Card>

                {/* Physical Mail Options */}
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Printer className="mr-2 h-5 w-5 text-primary" />
                      Physical Mail
                    </CardTitle>
                    <CardDescription>
                      Generate PDFs for printing and postal mail
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button 
                      type="button"
                      onClick={handleGenerateLetterPDF}
                      className="w-full" 
                      variant="outline"
                      disabled={
                        !campaign.isActive ||
                        !form.watch("name") ||
                        !form.watch("email")
                      }
                      data-testid="button-generate-letter-pdf"
                    >
                      <FileText className="mr-2 h-5 w-5" />
                      Generate Letter PDF
                    </Button>
                    
                    <Button 
                      type="button"
                      onClick={handleGenerateAddressLabelsPDF}
                      className="w-full" 
                      variant="outline"
                      disabled={
                        !campaign.isActive ||
                        !form.watch("name") ||
                        !form.watch("email")
                      }
                      data-testid="button-generate-labels-pdf"
                    >
                      <Printer className="mr-2 h-5 w-5" />
                      Generate Address Labels
                    </Button>
                    
                    <p className="text-xs text-muted-foreground text-center">
                      Fill in your details above, then generate PDFs for printing.
                      The letter includes your personalized message and the labels
                      are formatted for standard address label sheets.
                    </p>
                  </CardContent>
                </Card>
              </form>
            </Form>
          </div>

          {/* Preview and Recipients */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Email Preview</CardTitle>
                <CardDescription>
                  See how your email will look to recipients
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-secondary/30 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground mb-2">Subject:</p>
                  <p className="font-medium" data-testid="text-email-subject">{campaign.subject}</p>
                </div>

                <div className="bg-secondary/30 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground mb-2">Message:</p>
                  <div className="text-sm leading-relaxed whitespace-pre-wrap" data-testid="text-email-preview">
                    {recipients.length > 0 ? generateEmailBody(recipients[0]) : campaign.body
                      .replace(/\{\{name\}\}/g, form.watch("name") || "[Your Name]")
                      .replace(/\{\{postcode\}\}/g, form.watch("postcode") || "[Your Postcode]")
                    }
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recipients ({recipients.length})</CardTitle>
                <CardDescription>
                  Representatives who will receive your email
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recipientsLoading ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">Loading recipients...</p>
                  </div>
                ) : recipients.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    No recipients found for this campaign
                  </p>
                ) : (
                  <div className="space-y-3">
                    {recipients.map((recipient: Recipient) => (
                      <div key={recipient.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                        <div>
                          <p className="font-medium" data-testid={`text-recipient-name-${recipient.id}`}>
                            {recipient.name}
                          </p>
                          <p className="text-sm text-muted-foreground" data-testid={`text-recipient-email-${recipient.id}`}>
                            {recipient.email}
                          </p>
                        </div>
                        <Button
                          onClick={() => copyEmailToClipboard(recipient)}
                          variant="outline"
                          size="sm"
                          data-testid={`button-copy-email-${recipient.id}`}
                        >
                          {copiedEmail === recipient.email ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Share2 className="mr-2 h-5 w-5 text-primary" />
              Share Before Sending
            </DialogTitle>
            <DialogDescription>
              Help amplify this campaign by sharing it with your network before sending your emails. The more people who participate, the stronger our collective voice!
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => handleShare('twitter')}
                variant="outline"
                className="flex items-center justify-center"
              >
                <SiX className="mr-2 h-4 w-4" />
                X (Twitter)
              </Button>
              <Button
                onClick={() => handleShare('facebook')}
                variant="outline"
                className="flex items-center justify-center"
              >
                <SiFacebook className="mr-2 h-4 w-4" />
                Facebook
              </Button>
              <Button
                onClick={() => handleShare('whatsapp')}
                variant="outline"
                className="flex items-center justify-center"
              >
                <SiWhatsapp className="mr-2 h-4 w-4" />
                WhatsApp
              </Button>
              <Button
                onClick={() => handleShare('linkedin')}
                variant="outline"
                className="flex items-center justify-center"
              >
                <SiLinkedin className="mr-2 h-4 w-4" />
                LinkedIn
              </Button>
            </div>
          </div>
          
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              onClick={() => {
                setShowShareDialog(false);
                // Continue with email sending
                const formData = form.getValues();
                handleSendEmails(formData);
              }}
              variant="outline"
              className="w-full sm:w-auto"
              data-testid="button-skip-share"
            >
              Skip & Send Emails
            </Button>
            <Button
              onClick={() => {
                toast({
                  title: "Share First",
                  description: "Click on any social platform above to share the campaign",
                });
              }}
              className="w-full sm:w-auto"
              disabled={!hasShared}
              data-testid="button-continue-after-share"
            >
              I've Shared, Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}