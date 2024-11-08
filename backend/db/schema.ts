import { pgTable, integer, varchar, text, timestamp, serial } from 'drizzle-orm/pg-core';

export const widgets = pgTable('widgets', {
    id: serial('widget_id').primaryKey(),
    name: varchar('widget_name').notNull(),
    description: text('description'),
    visbility: varchar('visibility'),
    status: varchar('status').default('pending'),
    createdAt: timestamp('created_at').defaultNow(),
    redirectLink: varchar('redirect_link'),
    imageUrl: varchar('image_url'),
    categoryIds: integer('category_ids').array()
});