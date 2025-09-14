import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Save, CheckCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { adminConfigFormSchema, type AdminConfigFormData } from "@/lib/validations";

interface CampaignConfig {
  title: string;
  tagline: string;
  subject: string;
  body: string;
  recipients: Array<{ name: string; email: string }>;
}

interface AdminFormProps {
  config?: CampaignConfig;
  csrfToken?: string | null;
}

export default function AdminForm({ config, csrfToken }: AdminFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<AdminConfigFormData>({
    resolver: zodResolver(adminConfigFormSchema),
    defaultValues: {
      title: config?.title || "",
      tagline: config?.tagline || "",
      subject: config?.subject || "",
      body: config?.body || "",
      recipients: config?.recipients?.map(r => `${r.name} <${r.email}>`).join('\n') || "",
    },
  });

  const configMutation = useMutation({
    mutationFn: async (data: AdminConfigFormData) => {
      // Parse recipients from textarea
      const recipientLines = data.recipients.split(/\r?\n/);
      const recipients = recipientLines
        .filter(line => line.trim())
        .map(line => {
          const match = line.trim().match(/^(.*?)\s*<(.+@.+)>$/);
          if (match) {
            return { name: match[1].trim(), email: match[2].trim() };
          } else {
            return { name: "", email: line.trim() };
          }
        });

      const configData = {
        title: data.title,
        tagline: data.tagline,
        subject: data.subject,
        body: data.body,
        recipients,
      };

      const response = await fetch('/api/admin/config', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || '',
        },
        body: JSON.stringify(configData),
      });
      
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/config"] });
      toast({
        title: "Configuration Saved",
        description: "Campaign settings have been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to save configuration. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AdminConfigFormData) => {
    configMutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium text-foreground">
                Campaign Title
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter campaign title"
                  className="form-input"
                  data-testid="input-title"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="tagline"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium text-foreground">
                Campaign Tagline
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter campaign tagline"
                  className="form-input"
                  data-testid="input-tagline"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="subject"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium text-foreground">
                Email Subject
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter email subject line"
                  className="form-input"
                  data-testid="input-subject"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="body"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium text-foreground">
                Email Template
              </FormLabel>
              <FormControl>
                <Textarea
                  rows={6}
                  placeholder="Enter email body template"
                  className="form-input"
                  data-testid="textarea-body"
                  {...field}
                />
              </FormControl>
              <p className="text-xs text-muted-foreground">Use {`{{name}}`} and {`{{postcode}}`} as placeholders</p>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="recipients"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium text-foreground">
                Recipients
              </FormLabel>
              <FormControl>
                <Textarea
                  rows={8}
                  placeholder="Enter recipients (one per line)"
                  className="form-input"
                  data-testid="textarea-recipients"
                  {...field}
                />
              </FormControl>
              <p className="text-xs text-muted-foreground">One per line: Name &lt;email@example.com&gt;</p>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="btn-primary w-full py-3 px-4 text-white font-medium rounded-lg"
          disabled={configMutation.isPending}
          data-testid="button-save"
        >
          {configMutation.isPending ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Configuration
            </>
          )}
        </Button>

        {configMutation.isSuccess && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-center text-green-800 dark:text-green-200">
              <CheckCircle className="mr-2 text-green-600 dark:text-green-400 h-5 w-5" />
              <span className="font-medium">Configuration saved successfully!</span>
            </div>
          </div>
        )}

        {configMutation.isError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center text-red-800 dark:text-red-200">
              <AlertTriangle className="mr-2 text-red-600 dark:text-red-400 h-5 w-5" />
              <span className="font-medium">Error saving configuration</span>
            </div>
          </div>
        )}
      </form>
    </Form>
  );
}
