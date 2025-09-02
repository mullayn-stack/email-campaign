import { pgTable, serial, varchar, timestamp, integer, boolean, text } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Email sends tracking table
export const emailSends = pgTable('email_sends', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  postcode: varchar('postcode', { length: 10 }),
  personalNote: text('personal_note'),
  recipientCount: integer('recipient_count').notNull(),
  campaignTitle: varchar('campaign_title', { length: 255 }).notNull(),
  userAgent: varchar('user_agent', { length: 500 }),
  ipAddress: varchar('ip_address', { length: 45 }),
  sentAt: timestamp('sent_at').defaultNow().notNull(),
});

// Campaign analytics summary table
export const campaignStats = pgTable('campaign_stats', {
  id: serial('id').primaryKey(),
  date: varchar('date', { length: 10 }).notNull(), // YYYY-MM-DD
  totalSends: integer('total_sends').notNull().default(0),
  uniqueUsers: integer('unique_users').notNull().default(0),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type EmailSend = typeof emailSends.$inferSelect;
export type InsertEmailSend = typeof emailSends.$inferInsert;
export type CampaignStat = typeof campaignStats.$inferSelect;
export type InsertCampaignStat = typeof campaignStats.$inferInsert;