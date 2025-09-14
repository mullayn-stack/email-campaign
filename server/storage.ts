import { 
  type CampaignConfig, 
  type Recipient,
  type InsertRecipient,
  type User,
  type UpsertUser,
  type Campaign,
  type InsertCampaign,
  type CreateCampaign,
  users,
  campaigns,
  recipients,
  emailSubmissions,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, gte, sql } from "drizzle-orm";
import * as fs from 'fs';
import * as path from 'path';
import * as bcrypt from 'bcrypt';

export interface IStorage {
  // User operations - IMPORTANT: required for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  checkUserIsAdmin(userId: string): Promise<boolean>;
  // Campaign operations - Multi-user campaign management
  createCampaign(userId: string, campaignData: CreateCampaign): Promise<Campaign>;
  getCampaigns(filters?: { isPublic?: boolean }): Promise<Campaign[]>;
  getCampaignById(id: number): Promise<Campaign | undefined>;
  getCampaignBySlug(slug: string): Promise<Campaign | undefined>;
  updateCampaign(id: number, userId: string, updates: Partial<InsertCampaign>): Promise<Campaign>;
  deleteCampaign(id: number, userId: string): Promise<void>;
  getUserCampaigns(userId: string): Promise<Campaign[]>;
  getCampaignRecipients(campaignId: number): Promise<Recipient[]>;
  createEmailSubmission(campaignId: number, submissionData: any): Promise<any>;
  // Admin operations - Platform management
  getAdminStats(): Promise<any>;
  getAllCampaignsWithUsers(): Promise<any[]>;
  getAllUsers(): Promise<User[]>;
  getAllEmailSubmissions(): Promise<any[]>;
  // Legacy campaign operations
  getCampaignConfig(): Promise<CampaignConfig>;
  updateCampaignConfig(config: CampaignConfig): Promise<CampaignConfig>;
  validateAdminCredentials(username: string, password: string): Promise<boolean>;
  // Password utilities
  hashPassword(password: string): Promise<string>;
}

export class MemStorage implements IStorage {
  private configPath: string;
  private defaultConfig: CampaignConfig;

  constructor() {
    this.configPath = path.join(process.cwd(), 'campaign-config.json');
    this.defaultConfig = {
      title: "Protect Our Community",
      tagline: "Tell your representatives to stop spreading misinformation and stand up for truth in our democracy.",
      subject: "Protect our community",
      body: "Dear Representative,\n\nI am writing to urge you to stop spreading misinformation and protect our community.\n\nRegards,\n{{name}}\n{{postcode}}",
      recipients: [
        { name: "Rep. Alexandra Chen", email: "alexandra.chen@house.gov" },
        { name: "Sen. Michael Rodriguez", email: "michael.rodriguez@senate.gov" },
        { name: "Rep. David Kim", email: "david.kim@house.gov" },
        { name: "Sen. Sarah Wilson", email: "sarah.wilson@senate.gov" }
      ]
    };

    // Initialize config file if it doesn't exist
    this.initializeConfig();
  }

  // User operations - IMPORTANT: required for Replit Auth
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.email,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async checkUserIsAdmin(userId: string): Promise<boolean> {
    const user = await this.getUser(userId);
    return user?.isAdmin || false;
  }

  private initializeConfig(): void {
    if (!fs.existsSync(this.configPath)) {
      fs.writeFileSync(this.configPath, JSON.stringify(this.defaultConfig, null, 2));
    }
  }

  async getCampaignConfig(): Promise<CampaignConfig> {
    try {
      const configData = fs.readFileSync(this.configPath, 'utf-8');
      return JSON.parse(configData);
    } catch (error) {
      console.error('Error reading campaign config:', error);
      return this.defaultConfig;
    }
  }

  async updateCampaignConfig(config: CampaignConfig): Promise<CampaignConfig> {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
      return config;
    } catch (error) {
      console.error('Error writing campaign config:', error);
      throw new Error('Failed to save configuration');
    }
  }

  // Campaign operations - Multi-user campaign management
  async createCampaign(userId: string, campaignData: CreateCampaign): Promise<Campaign> {
    const slug = campaignData.slug || campaignData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    
    // Use database transaction for atomic campaign+recipients creation
    return await db.transaction(async (tx) => {
      // Create the campaign
      const [campaign] = await tx
        .insert(campaigns)
        .values({
          userId,
          title: campaignData.title,
          slug,
          tagline: campaignData.tagline || null,
          subject: campaignData.subject,
          body: campaignData.body,
          isPublic: campaignData.isPublic ?? true,
          isActive: true,
        })
        .returning();

      // Add recipients
      if (campaignData.recipients && campaignData.recipients.length > 0) {
        const recipientValues: InsertRecipient[] = campaignData.recipients.map((recipient) => ({
          campaignId: campaign.id,
          name: recipient.name,
          email: recipient.email,
        }));
        
        await tx.insert(recipients).values(recipientValues);
      }

      return campaign;
    });
  }

  async getCampaigns(filters?: { isPublic?: boolean }): Promise<Campaign[]> {
    if (filters?.isPublic !== undefined) {
      return await db
        .select()
        .from(campaigns)
        .where(eq(campaigns.isPublic, filters.isPublic))
        .orderBy(desc(campaigns.createdAt));
    }
    
    return await db
      .select()
      .from(campaigns)
      .orderBy(desc(campaigns.createdAt));
  }

  async getCampaignById(id: number): Promise<Campaign | undefined> {
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, id));
    return campaign;
  }

  async getCampaignBySlug(slug: string): Promise<Campaign | undefined> {
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.slug, slug));
    return campaign;
  }

  async updateCampaign(id: number, userId: string, updates: Partial<InsertCampaign>): Promise<Campaign> {
    const [campaign] = await db
      .update(campaigns)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(and(eq(campaigns.id, id), eq(campaigns.userId, userId)))
      .returning();
      
    if (!campaign) {
      throw new Error('Campaign not found or unauthorized');
    }
    
    return campaign;
  }

  async deleteCampaign(id: number, userId: string): Promise<void> {
    const result = await db
      .delete(campaigns)
      .where(and(eq(campaigns.id, id), eq(campaigns.userId, userId)));
      
    // Note: Recipients will be deleted automatically due to CASCADE foreign key
  }

  async getUserCampaigns(userId: string): Promise<Campaign[]> {
    return await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.userId, userId))
      .orderBy(desc(campaigns.createdAt));
  }

  async getCampaignRecipients(campaignId: number): Promise<Recipient[]> {
    return await db
      .select()
      .from(recipients)
      .where(eq(recipients.campaignId, campaignId));
  }

  async createEmailSubmission(campaignId: number, submissionData: any): Promise<any> {
    const [submission] = await db
      .insert(emailSubmissions)
      .values({
        campaignId,
        senderName: submissionData.senderName,
        senderEmail: submissionData.senderEmail,
        postcode: submissionData.postcode,
        personalNote: submissionData.personalNote,
      })
      .returning();
    
    return submission;
  }

  // Admin operations - Platform management
  async getAdminStats(): Promise<any> {
    // Get counts for different entities using sql count function
    const [userCountResult] = await db.select({ count: sql<number>`count(*)` }).from(users);
    const [campaignCountResult] = await db.select({ count: sql<number>`count(*)` }).from(campaigns);
    const [publicCampaignCountResult] = await db.select({ count: sql<number>`count(*)` }).from(campaigns).where(eq(campaigns.isPublic, true));
    const [submissionCountResult] = await db.select({ count: sql<number>`count(*)` }).from(emailSubmissions);
    
    // Get recent submissions (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const [recentSubmissionsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(emailSubmissions)
      .where(gte(emailSubmissions.createdAt, sevenDaysAgo));
    
    return {
      totalUsers: userCountResult?.count || 0,
      totalCampaigns: campaignCountResult?.count || 0,
      publicCampaigns: publicCampaignCountResult?.count || 0,
      totalSubmissions: submissionCountResult?.count || 0,
      recentSubmissions: recentSubmissionsResult?.count || 0,
    };
  }

  async getAllCampaignsWithUsers(): Promise<any[]> {
    const result = await db
      .select({
        id: campaigns.id,
        title: campaigns.title,
        slug: campaigns.slug,
        tagline: campaigns.tagline,
        subject: campaigns.subject,
        body: campaigns.body,
        isPublic: campaigns.isPublic,
        isActive: campaigns.isActive,
        createdAt: campaigns.createdAt,
        userId: campaigns.userId,
        user: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          isAdmin: users.isAdmin,
          createdAt: users.createdAt,
        }
      })
      .from(campaigns)
      .leftJoin(users, eq(campaigns.userId, users.id))
      .orderBy(desc(campaigns.createdAt));
    
    return result;
  }

  async getAllUsers(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt));
  }

  async getAllEmailSubmissions(): Promise<any[]> {
    const result = await db
      .select({
        id: emailSubmissions.id,
        campaignId: emailSubmissions.campaignId,
        senderName: emailSubmissions.senderName,
        senderEmail: emailSubmissions.senderEmail,
        postcode: emailSubmissions.postcode,
        personalNote: emailSubmissions.personalNote,
        createdAt: emailSubmissions.createdAt,
        campaign: {
          id: campaigns.id,
          title: campaigns.title,
          slug: campaigns.slug,
        }
      })
      .from(emailSubmissions)
      .leftJoin(campaigns, eq(emailSubmissions.campaignId, campaigns.id))
      .orderBy(desc(emailSubmissions.createdAt));
    
    return result;
  }

  async validateAdminCredentials(username: string, password: string): Promise<boolean> {
    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;
    
    if (!adminUsername || !adminPassword) {
      console.error('SECURITY ERROR: ADMIN_USERNAME and ADMIN_PASSWORD environment variables must be set');
      throw new Error('Admin credentials not configured. Set ADMIN_USERNAME and ADMIN_PASSWORD environment variables.');
    }
    
    // Check username first
    if (username !== adminUsername) {
      return false;
    }
    
    // Check if the stored password is already a bcrypt hash (starts with $2a$, $2b$, or $2y$)
    if (adminPassword.match(/^\$2[ayb]\$\d{2}\$/)) {
      // Password is already hashed, use bcrypt.compare
      return await bcrypt.compare(password, adminPassword);
    } else {
      // SECURITY WARNING: Password is stored in plaintext
      console.warn('SECURITY WARNING: Admin password is stored in plaintext. Please hash it with bcrypt and update ADMIN_PASSWORD environment variable.');
      console.warn('You can use the hashPassword method to generate a secure hash.');
      
      // For backwards compatibility, still allow plaintext comparison but warn about it
      return password === adminPassword;
    }
  }

  async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }
}

export const storage = new MemStorage();