import { z } from "zod";
import { createInsertSchema } from "drizzle-zod";
import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  boolean,
  serial,
  integer,
  unique,
} from "drizzle-orm/pg-core";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth - Keep existing varchar ID type
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  isAdmin: boolean("is_admin").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Campaigns table - Keep existing serial ID type
export const campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).unique().notNull(),
  tagline: text("tagline"),
  subject: varchar("subject", { length: 500 }).notNull(),
  body: text("body").notNull(),
  isPublic: boolean("is_public").default(true),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_campaigns_user").on(table.userId),
]);

export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = typeof campaigns.$inferInsert;

// Recipients table - Fix FK to be proper integer reference
export const recipients = pgTable("recipients", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").references(() => campaigns.id, { onDelete: "cascade" }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_recipients_campaign").on(table.campaignId),
  unique("unique_recipient_per_campaign").on(table.campaignId, table.email),
]);

export type Recipient = typeof recipients.$inferSelect;
export type InsertRecipient = typeof recipients.$inferInsert;

// Email submissions tracking - Fix FK to be proper integer reference
export const emailSubmissions = pgTable("email_submissions", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").references(() => campaigns.id, { onDelete: "cascade" }).notNull(),
  senderName: varchar("sender_name", { length: 255 }).notNull(),
  senderEmail: varchar("sender_email", { length: 255 }).notNull(),
  postcode: varchar("postcode", { length: 20 }),
  personalNote: text("personal_note"),
  submittedAt: timestamp("submitted_at").defaultNow(),
}, (table) => [
  index("idx_submissions_campaign").on(table.campaignId),
]);

export type EmailSubmission = typeof emailSubmissions.$inferSelect;
export type InsertEmailSubmission = typeof emailSubmissions.$inferInsert;

// Create schemas with drizzle-zod
export const campaignSchema = createInsertSchema(campaigns).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const recipientSchema = createInsertSchema(recipients).omit({
  id: true,
  campaignId: true,
  createdAt: true,
});

export const emailSubmissionSchema = createInsertSchema(emailSubmissions).omit({
  id: true,
  campaignId: true,
  submittedAt: true,
});

// Additional validation schemas
export const createCampaignSchema = campaignSchema.extend({
  recipients: z.array(recipientSchema).min(1, "At least one recipient is required")
});

export const updateCampaignSchema = createCampaignSchema.partial();

export const userRegistrationSchema = z.object({
  email: z.string().email("Invalid email address"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
});

// Legacy compatibility types for current single-campaign code
export interface LegacyRecipient {
  name: string;
  email: string;
}

export interface CampaignConfig {
  title: string;
  tagline: string;
  subject: string;
  body: string;
  recipients: LegacyRecipient[];
}

export const campaignConfigSchema = z.object({
  title: z.string().min(1, "Title is required"),
  tagline: z.string(),
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Body is required"),
  recipients: z.array(z.object({
    name: z.string(),
    email: z.string().email("Invalid email address")
  })).min(1, "At least one recipient is required")
});

// Proper email submission schema that matches the database schema
export const emailSubmissionRequestSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  postcode: z.string().optional(),
  personalNote: z.string().optional()
});

// Legacy schema for backwards compatibility
export const legacyEmailSubmissionSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  postcode: z.string().optional(),
  note: z.string().optional()
});

export const adminAuthSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required")
});

// Export types
export type CreateCampaign = z.infer<typeof createCampaignSchema>;
export type UpdateCampaign = z.infer<typeof updateCampaignSchema>;
export type UserRegistration = z.infer<typeof userRegistrationSchema>;
export type InsertCampaignConfig = z.infer<typeof campaignConfigSchema>;
export type EmailSubmissionRequest = z.infer<typeof emailSubmissionRequestSchema>;
export type LegacyEmailSubmission = z.infer<typeof legacyEmailSubmissionSchema>;
export type AdminAuth = z.infer<typeof adminAuthSchema>;