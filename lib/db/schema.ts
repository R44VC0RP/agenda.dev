import { pgTable, text, timestamp, boolean, integer, primaryKey } from "drizzle-orm/pg-core";


export const oauthApplications = pgTable("oauth_applications", {
	id: text('id').primaryKey(),
	name: text('name'),
	icon: text('icon'),
	metadata: text('metadata'),
	clientId: text('client_id').unique(),
	clientSecret: text('client_secret'),
	redirectURLs: text('redirect_u_r_ls'),
	type: text('type'),
	disabled: boolean('disabled'),
	userId: text('user_id'),
	createdAt: timestamp('created_at'),
	updatedAt: timestamp('updated_at')
});

export const oauthAccessTokens = pgTable("oauth_access_tokens", {
	id: text('id').primaryKey(),
	accessToken: text('access_token').unique(),
	refreshToken: text('refresh_token').unique(),
	accessTokenExpiresAt: timestamp('access_token_expires_at'),
	refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
	clientId: text('client_id'),
	userId: text('user_id'),
	scopes: text('scopes'),
	createdAt: timestamp('created_at'),
	updatedAt: timestamp('updated_at')
});

export const oauthConsents = pgTable("oauth_consents", {
	id: text('id').primaryKey(),
	clientId: text('client_id'),
	userId: text('user_id'),
	scopes: text('scopes'),
	createdAt: timestamp('created_at'),
	updatedAt: timestamp('updated_at'),
	consentGiven: boolean('consent_given')
});

export const users = pgTable("users", {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    emailVerified: boolean('email_verified').notNull(),
    image: text('image'),
    stripeCustomerId: text('stripe_customer_id'),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull()
});

export const userSettings = pgTable("user_settings", {
    userId: text('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
    reminderMinutes: integer('reminder_minutes').notNull().default(30),
    aiSuggestedReminders: boolean('ai_suggested_reminders').notNull().default(false),
    weeklyReview: boolean('weekly_review').notNull().default(false),
    timezone: text('timezone').notNull().default('UTC'),
    showInputAtBottom: boolean('show_input_at_bottom').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const sessions = pgTable("sessions", {
    id: text('id').primaryKey(),
    expiresAt: timestamp('expires_at').notNull(),
    token: text('token').notNull().unique(),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' })
});

export const accounts = pgTable("accounts", {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at'),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull()
});

export const verifications = pgTable("verifications", {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at'),
    updatedAt: timestamp('updated_at')
});

export const workspaces = pgTable("workspaces", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const workspaceMembers = pgTable("workspace_members", {
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
    role: text("role", { enum: ["owner", "member"] }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
    primaryKey({ columns: [t.workspaceId, t.userId] }),
]);

export const todos = pgTable("todos", {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    completed: boolean('completed').notNull().default(false),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    dueDate: text('due_date'),
    urgency: integer('urgency').notNull().default(1),
});

export const comments = pgTable("comments", {
    id: text('id').primaryKey(),
    text: text('text').notNull(),
    todoId: text('todo_id').notNull().references(() => todos.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const reminders = pgTable("reminders", {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    todoId: text('todo_id').notNull().references(() => todos.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description').notNull(),
    reminderTime: timestamp('reminder_time').notNull(),
    message: text('message').notNull(),
    summary: text('summary').notNull(),
    status: text('status', { enum: ['pending', 'sent', 'cancelled'] }).notNull().default('pending'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const subscriptions = pgTable("subscriptions", {
    id: text('id').primaryKey(),
    plan: text('plan').notNull(),
    referenceId: text('reference_id').notNull(),           // user-ID or org-ID
    stripeCustomerId: text('stripe_customer_id'),
    stripeSubscriptionId: text('stripe_subscription_id'),
    status: text('status').notNull(),                      // active, trialing, canceled…
    periodStart: timestamp('period_start'),
    periodEnd: timestamp('period_end'),
    cancelAtPeriodEnd: boolean('cancel_at_period_end'),
    seats: integer('seats'),
    trialStart: timestamp('trial_start'),
    trialEnd: timestamp('trial_end'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  });
