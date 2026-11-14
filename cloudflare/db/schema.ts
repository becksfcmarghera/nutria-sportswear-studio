import {sqliteTable,text} from 'drizzle-orm/sqlite-core';
export const drafts=sqliteTable('drafts',{id:text('id').primaryKey(),created:text('created').notNull(),details:text('details').notNull(),files:text('files').notNull(),status:text('status').notNull().default('Nuova'),notes:text('notes').notNull().default('')});
export const photos=sqliteTable('photos',{id:text('id').primaryKey(),team:text('team').notNull(),key:text('key').notNull()});
