import {
  pgTable,
  serial,
  text,
  integer,
  bigint,
  real,
  boolean,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const orderStatusEnum = pgEnum("order_status", [
  "PENDING",
  "RECEIVED",
  "CANCELED",
  "TIMEOUT",
  "FINISHED",
  "BANNED",
]);

export const transactionStatusEnum = pgEnum("transaction_status", [
  "pending",
  "completed",
  "failed",
  "expired",
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "qris",
  "bni_va",
  "bri_va",
  "cimb_niaga_va",
  "permata_va",
  "maybank_va",
  "sampoerna_va",
  "bnc_va",
  "atm_bersama_va",
  "artha_graha_va",
]);

// ─── Users ────────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  telegramId: bigint("telegram_id", { mode: "number" }).notNull().unique(),
  username: text("username"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  balance: real("balance").notNull().default(0), // balance in IDR
  isBlocked: boolean("is_blocked").notNull().default(false),
  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── Top-up Transactions ──────────────────────────────────────────────────────

export const topupTransactions = pgTable("topup_transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  orderId: text("order_id").notNull().unique(), // our internal order ID
  amount: integer("amount").notNull(), // IDR amount before fee
  fee: integer("fee").notNull().default(0),
  totalPayment: integer("total_payment").notNull(), // IDR amount user pays
  paymentMethod: paymentMethodEnum("payment_method").notNull(),
  paymentNumber: text("payment_number"), // QRIS string or VA number
  status: transactionStatusEnum("status").notNull().default("pending"),
  expiredAt: timestamp("expired_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Number Orders (5sim) ─────────────────────────────────────────────────────

export const numberOrders = pgTable("number_orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  fivesimOrderId: bigint("fivesim_order_id", { mode: "number" }),
  phone: text("phone"),
  country: text("country").notNull(),
  operator: text("operator").notNull().default("any"),
  product: text("product").notNull(),
  priceRub: real("price_rub").notNull(), // price from 5sim in RUB
  priceIdr: integer("price_idr").notNull(), // price charged in IDR
  status: orderStatusEnum("status").notNull().default("PENDING"),
  smsCode: text("sms_code"),
  smsText: text("sms_text"),
  smsSender: text("sms_sender"),
  expires: timestamp("expires"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── Settings ─────────────────────────────────────────────────────────────────

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── Type exports ─────────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type TopupTransaction = typeof topupTransactions.$inferSelect;
export type NewTopupTransaction = typeof topupTransactions.$inferInsert;
export type NumberOrder = typeof numberOrders.$inferSelect;
export type NewNumberOrder = typeof numberOrders.$inferInsert;
export type Setting = typeof settings.$inferSelect;
