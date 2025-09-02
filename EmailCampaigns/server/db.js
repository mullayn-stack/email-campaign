const { Pool, neonConfig } = require('@neondatabase/serverless');
const { drizzle } = require('drizzle-orm/neon-serverless');
const ws = require("ws");
const { pgTable, serial, varchar, timestamp, integer, text } = require('drizzle-orm/pg-core');

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Define schema inline to avoid TypeScript import issues
const emailSends = pgTable('email_sends', {
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

const campaignStats = pgTable('campaign_stats', {
  id: serial('id').primaryKey(),
  date: varchar('date', { length: 10 }).notNull(),
  totalSends: integer('total_sends').notNull().default(0),
  uniqueUsers: integer('unique_users').notNull().default(0),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

const schema = { emailSends, campaignStats };
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool, schema });

module.exports = { db, emailSends, campaignStats };