import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Mail, User, MapPin, MessageCircle, Send, CheckCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { campaignFormSchema, type CampaignFormData } from "@/lib/validations";

interface CampaignConfig {
  title: string;
  tagline: string;
  subject: string;
  body: string;
  recipients: Array<{ name: string; email: string }>;
}

interface CampaignFormProps {
  config?: CampaignConfig;
}

export default function CampaignForm({ config }: CampaignFormProps) {
  const [charCount, setCharCount] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const { toast } = useToast();

  const form = useForm<CampaignFormData>({
    resolver: zodResolver(campaignFormSchema),
    defaultValues: {
      name: "",
      email: "",
      postcode: "",
      note: "",
    },
  });

  const emailMutation = useMutation({
    mutationFn: async (data: CampaignFormData) => {
      const response = await apiRequest("POST", "/api/generate-email", data);
      return response.json();
    },
    onSuccess: (data) => {
      setShowSuccess(true);
      toast({
        title: "Email Ready!",
        description: "Your email client should open with the message pre-filled.",
      });
      
      // Open mailto link
      if (data.mailtoUrl) {
        window.location.href = data.mailtoUrl;
      }

      // Hide success message after 5 seconds
      setTimeout(() => {
        setShowSuccess(false);
      }, 5000);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to generate email. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CampaignFormData) => {
    emailMutation.mutate(data);
  };

  const handleNoteChange = (value: string) => {
    setCharCount(value.length);
    return value;
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium text-foreground flex items-center">
                <User className="text-primary mr-2 h-4 w-4" />
                Full Name
                <span className="text-destructive ml-1">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter your full name"
                  className="form-input"
                  data-testid="input-name"
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
              <FormLabel className="text-sm font-medium text-foreground flex items-center">
                <Mail className="text-primary mr-2 h-4 w-4" />
                Email Address
                <span className="text-destructive ml-1">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="your.email@example.com"
                  className="form-input"
                  data-testid="input-email"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="postcode"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium text-foreground flex items-center">
                <MapPin className="text-primary mr-2 h-4 w-4" />
                ZIP/Postal Code
                <span className="text-muted-foreground text-xs ml-2">(helps identify your representatives)</span>
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., 12345 or A1A 1A1"
                  className="form-input"
                  data-testid="input-postcode"
                  {...field}
                />
              </FormControl>
              <p className="text-xs text-muted-foreground">Optional but recommended for more targeted outreach</p>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="note"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium text-foreground flex items-center">
                <MessageCircle className="text-primary mr-2 h-4 w-4" />
                Personal Note
                <span className="text-muted-foreground text-xs ml-2">(optional)</span>
              </FormLabel>
              <FormControl>
                <Textarea
                  rows={4}
                  placeholder="Add a personal message to make your email more impactful..."
                  className="form-input resize-vertical"
                  maxLength={500}
                  data-testid="textarea-note"
                  {...field}
                  onChange={(e) => {
                    const value = handleNoteChange(e.target.value);
                    field.onChange(value);
                  }}
                />
              </FormControl>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Personal stories make emails more powerful</span>
                <span className={charCount > 400 ? (charCount > 500 ? "text-red-600" : "text-yellow-600") : ""}>
                  {charCount}/500
                </span>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Success Message */}
        {showSuccess && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-center text-green-800 dark:text-green-200">
              <CheckCircle className="mr-2 text-green-600 dark:text-green-400 h-5 w-5" />
              <span className="font-medium">Email ready!</span>
            </div>
            <p className="text-green-700 dark:text-green-300 text-sm mt-1">
              Your email client should open with the message pre-filled. Please review and click send.
            </p>
          </div>
        )}

        <Button
          type="submit"
          className="btn-primary w-full py-4 px-6 text-white font-semibold rounded-lg"
          disabled={emailMutation.isPending}
          data-testid="button-send"
        >
          {emailMutation.isPending ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Generating Email...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Open Email Client & Send Message
            </>
          )}
        </Button>

        <div className="text-center pt-4 border-t border-border">
          <p className="text-sm text-muted-foreground mb-2">
            <span className="inline-block">🔒</span>
            Your information is never stored or shared
          </p>
          <div className="flex justify-center space-x-4 text-xs text-muted-foreground">
            <span>🔒 Secure</span>
            <span>📧 Private</span>
            <span>⚡ Fast</span>
          </div>
        </div>
      </form>
    </Form>
  );
}
