import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { campaignConfigSchema, legacyEmailSubmissionSchema, createCampaignSchema, emailSubmissionRequestSchema } from "@shared/schema";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { z } from "zod";

// Admin authorization middleware - checks users.isAdmin flag from database
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  // Ensure we have an authenticated OIDC user
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ 
      success: false, 
      message: 'Authentication required for admin access' 
    });
  }

  // Get user ID from OIDC claims
  const userId = (req.user as any).claims?.sub;
  if (!userId) {
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid user authentication' 
    });
  }

  // Check if user has admin privileges from database
  storage.checkUserIsAdmin(userId)
    .then((isAdmin) => {
      if (!isAdmin) {
        return res.status(403).json({ 
          success: false, 
          message: 'Admin privileges required' 
        });
      }
      next();
    })
    .catch((error) => {
      console.error('Error checking admin status:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to verify admin privileges' 
      });
    });
}

// User ownership authorization middleware for campaign access
function requireCampaignAccess(req: Request, res: Response, next: NextFunction) {
  // Ensure we have an authenticated OIDC user
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ 
      success: false, 
      message: 'Authentication required for campaign access' 
    });
  }

  // Get user ID from OIDC claims
  const userId = (req.user as any).claims?.sub;
  if (!userId) {
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid user authentication' 
    });
  }

  // Check if user has admin privileges (admins can access all campaigns)
  storage.checkUserIsAdmin(userId)
    .then((isAdmin) => {
      if (isAdmin) {
        // Admin users have full access
        return next();
      }
      
      // For regular users, check specific campaign ownership
      // Note: In current single-campaign system, we can allow authenticated users to view config
      // This middleware is future-proofed for when campaigns move to database with proper ownership
      const campaignId = req.params.campaignId;
      
      if (campaignId) {
        // TODO: When campaigns are in database, check ownership:
        // storage.checkCampaignOwnership(userId, campaignId)
        // For now, authenticated users can access public campaigns
        return next();
      } else {
        // No specific campaign ID, allow access to global config for authenticated users
        return next();
      }
    })
    .catch((error) => {
      console.error('Error checking campaign access:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to verify campaign access' 
      });
    });
}


export async function registerRoutes(app: Express): Promise<Server> {
  // Setup Replit Auth middleware - IMPORTANT: must be called first
  await setupAuth(app);

  // Replit Auth routes for user authentication
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Get campaign configuration - requires authentication and campaign access
  app.get('/api/config', requireCampaignAccess, async (req, res) => {
    try {
      const config = await storage.getCampaignConfig();
      res.json(config);
    } catch (error) {
      console.error('Error fetching config:', error);
      res.status(500).json({ message: 'Failed to fetch configuration' });
    }
  });

  // Admin status check - using OIDC authentication
  app.get('/api/admin/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const isAdmin = await storage.checkUserIsAdmin(userId);
      const user = await storage.getUser(userId);
      
      res.json({ 
        isAuthenticated: true,
        isAdmin,
        user: {
          id: user?.id,
          email: user?.email,
          firstName: user?.firstName,
          lastName: user?.lastName
        }
      });
    } catch (error) {
      console.error('Error checking admin status:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to check admin status' 
      });
    }
  });

  // Update campaign configuration (protected route) - using OIDC + admin check
  app.post('/api/admin/config', requireAdmin, async (req, res) => {
    try {
      const config = campaignConfigSchema.parse(req.body);
      const updatedConfig = await storage.updateCampaignConfig(config);
      res.json({ success: true, config: updatedConfig, message: 'Configuration updated successfully' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid configuration data', errors: error.errors });
      } else {
        console.error('Config update error:', error);
        res.status(500).json({ message: 'Failed to update configuration' });
      }
    }
  });

  // Admin stats endpoint - get platform statistics
  app.get('/api/admin/stats', requireAdmin, async (req: any, res) => {
    try {
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch admin statistics' 
      });
    }
  });

  // Admin campaigns endpoint - get all campaigns with user info
  app.get('/api/admin/campaigns', requireAdmin, async (req: any, res) => {
    try {
      const campaigns = await storage.getAllCampaignsWithUsers();
      res.json(campaigns);
    } catch (error) {
      console.error('Error fetching admin campaigns:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch campaigns' 
      });
    }
  });

  // Admin users endpoint - get all users
  app.get('/api/admin/users', requireAdmin, async (req: any, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error('Error fetching admin users:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch users' 
      });
    }
  });

  // Admin submissions endpoint - get all email submissions
  app.get('/api/admin/submissions', requireAdmin, async (req: any, res) => {
    try {
      const submissions = await storage.getAllEmailSubmissions();
      res.json(submissions);
    } catch (error) {
      console.error('Error fetching admin submissions:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch submissions' 
      });
    }
  });

  // Campaign CRUD operations
  // Create new campaign - authenticated users only
  app.post('/api/campaigns', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).claims.sub;
      
      // Validate request body using Zod schema
      const validatedData = createCampaignSchema.parse(req.body);
      
      const campaign = await storage.createCampaign(userId, validatedData);
      res.status(201).json({ success: true, campaign, message: 'Campaign created successfully' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Validation errors - return 400 with detailed error information
        res.status(400).json({ 
          success: false,
          message: 'Invalid campaign data', 
          errors: error.errors 
        });
      } else if (error instanceof Error) {
        // Handle specific error types
        if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
          // Slug uniqueness conflicts - return 409 with specific message
          res.status(409).json({ 
            success: false,
            message: 'Campaign slug already exists. Please choose a different slug.',
            errorType: 'SLUG_CONFLICT'
          });
        } else {
          console.error('Error creating campaign:', error);
          res.status(500).json({ 
            success: false,
            message: 'Failed to create campaign' 
          });
        }
      } else {
        console.error('Unknown error creating campaign:', error);
        res.status(500).json({ 
          success: false,
          message: 'Failed to create campaign' 
        });
      }
    }
  });

  // Get campaigns - public endpoint, shows public campaigns to everyone, all campaigns to admins
  app.get('/api/campaigns', async (req: any, res) => {
    try {
      let isAdmin = false;
      
      // Check if user is authenticated and admin
      if (req.isAuthenticated() && req.user) {
        const userId = req.user.claims.sub;
        isAdmin = await storage.checkUserIsAdmin(userId);
      }
      
      // Admins can see all campaigns, everyone else only sees public ones
      const filters = isAdmin ? {} : { isPublic: true };
      const campaigns = await storage.getCampaigns(filters);
      res.json(campaigns);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      res.status(500).json({ message: 'Failed to fetch campaigns' });
    }
  });

  // Get campaign by slug - public access for public campaigns
  app.get('/api/campaigns/slug/:slug', async (req: any, res) => {
    try {
      const { slug } = req.params;
      const campaign = await storage.getCampaignBySlug(slug);
      
      if (!campaign) {
        return res.status(404).json({ message: 'Campaign not found' });
      }
      
      // Check if campaign is public or user has access
      let hasAccess = campaign.isPublic;
      
      if (!hasAccess && req.isAuthenticated() && req.user) {
        const userId = req.user.claims.sub;
        const isAdmin = await storage.checkUserIsAdmin(userId);
        
        // User has access if they're admin or owner
        hasAccess = isAdmin || campaign.userId === userId;
      }
      
      if (!hasAccess) {
        return res.status(404).json({ message: 'Campaign not found' });
      }
      
      res.json(campaign);
    } catch (error) {
      console.error('Error fetching campaign by slug:', error);
      res.status(500).json({ message: 'Failed to fetch campaign' });
    }
  });

  // Get campaign recipients - public access for public campaigns
  app.get('/api/campaigns/:id/recipients', async (req: any, res) => {
    try {
      const campaignId = parseInt(req.params.id);
      const campaign = await storage.getCampaignById(campaignId);
      
      if (!campaign) {
        return res.status(404).json({ message: 'Campaign not found' });
      }
      
      // Check if campaign is public or user has access
      let hasAccess = campaign.isPublic;
      
      if (!hasAccess && req.isAuthenticated() && req.user) {
        const userId = req.user.claims.sub;
        const isAdmin = await storage.checkUserIsAdmin(userId);
        
        // User has access if they're admin or owner
        hasAccess = isAdmin || campaign.userId === userId;
      }
      
      if (!hasAccess) {
        return res.status(404).json({ message: 'Campaign not found' });
      }
      
      const recipients = await storage.getCampaignRecipients(campaignId);
      res.json(recipients);
    } catch (error) {
      console.error('Error fetching campaign recipients:', error);
      res.status(500).json({ message: 'Failed to fetch recipients' });
    }
  });

  // Submit email participation - public endpoint
  app.post('/api/campaigns/:id/submit', async (req: any, res) => {
    try {
      const campaignId = parseInt(req.params.id);
      const campaign = await storage.getCampaignById(campaignId);
      
      if (!campaign) {
        return res.status(404).json({ success: false, message: 'Campaign not found' });
      }
      
      if (!campaign.isPublic || !campaign.isActive) {
        return res.status(403).json({ success: false, message: 'Campaign is not available for participation' });
      }
      
      // Validate submission data using Zod schema
      const validatedData = emailSubmissionRequestSchema.parse(req.body);
      
      // Transform frontend fields to database schema fields
      const submissionData = {
        senderName: validatedData.name,
        senderEmail: validatedData.email,
        postcode: validatedData.postcode || null,
        personalNote: validatedData.personalNote || null,
      };
      
      const submission = await storage.createEmailSubmission(campaignId, submissionData);
      res.status(201).json({ success: true, submission, message: 'Email submission recorded' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          success: false,
          message: 'Invalid submission data', 
          errors: error.errors 
        });
      } else {
        console.error('Error recording email submission:', error);
        res.status(500).json({ success: false, message: 'Failed to record submission' });
      }
    }
  });

  // Get user's own campaigns - authenticated users only
  app.get('/api/campaigns/me', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const campaigns = await storage.getUserCampaigns(userId);
      res.json(campaigns);
    } catch (error) {
      console.error('Error fetching user campaigns:', error);
      res.status(500).json({ message: 'Failed to fetch user campaigns' });
    }
  });

  // Get campaign by slug - public access for public campaigns
  app.get('/api/campaigns/slug/:slug', async (req, res) => {
    try {
      const campaign = await storage.getCampaignBySlug(req.params.slug);
      if (!campaign) {
        return res.status(404).json({ message: 'Campaign not found' });
      }
      
      // Only show public campaigns or campaigns to authenticated owners/admins
      if (!campaign.isPublic && !req.isAuthenticated()) {
        return res.status(404).json({ message: 'Campaign not found' });
      }
      
      if (!campaign.isPublic && req.isAuthenticated()) {
        const userId = (req.user as any)?.claims?.sub;
        const isAdmin = await storage.checkUserIsAdmin(userId);
        if (campaign.userId !== userId && !isAdmin) {
          return res.status(404).json({ message: 'Campaign not found' });
        }
      }
      
      res.json(campaign);
    } catch (error) {
      console.error('Error fetching campaign by slug:', error);
      res.status(500).json({ message: 'Failed to fetch campaign' });
    }
  });

  // Generate mailto link - requires authentication and campaign access
  app.post('/api/generate-email', requireCampaignAccess, async (req, res) => {
    try {
      const { name, email, postcode, note } = legacyEmailSubmissionSchema.parse(req.body);
      const config = await storage.getCampaignConfig();

      // Build email body by replacing placeholders
      let body = config.body;
      body = body.replace(/{{name}}/g, name);
      body = body.replace(/{{postcode}}/g, postcode || '');
      
      if (note) {
        body += '\n\nP.S. ' + note;
      }

      // Create recipient email list
      const recipientEmails = config.recipients.map(r => r.email).join(',');
      
      // Generate mailto URL
      const subject = encodeURIComponent(config.subject);
      const encodedBody = encodeURIComponent(body);
      const mailtoUrl = `mailto:${recipientEmails}?subject=${subject}&body=${encodedBody}`;

      res.json({ 
        success: true, 
        mailtoUrl,
        recipientCount: config.recipients.length,
        message: 'Email ready to send'
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid form data', errors: error.errors });
      } else {
        console.error('Email generation error:', error);
        res.status(500).json({ message: 'Failed to generate email' });
      }
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
