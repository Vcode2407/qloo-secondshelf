import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';
export const demoQuota = sqliteTable('demo_quota', {
  bucket: text('bucket').notNull(), day: text('day').notNull(), used: integer('used').notNull(),
}, (table) => [primaryKey({columns: [table.bucket, table.day]})]);
export const demoDrafts = sqliteTable('demo_drafts', {
  id: text('id').primaryKey(), status: text('status').notNull(), expires: integer('expires').notNull(),
});
