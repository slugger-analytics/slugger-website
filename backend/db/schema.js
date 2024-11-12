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

export const users = pgTable('users', {
    id: serial('user_id').primaryKey(),
    cognitoUser: varchar('cognito_user').notNull(),
    email: varchar('email').notNull(),
    firstName: varchar('first_name'),
    latName: varchar('last_name'),
    createdAt: timestamp('created_at').defaultNow(),
    role: varchar('role').notNull(),
    favWidgetsIds: integer('fav_widgets_ids').array(),
});