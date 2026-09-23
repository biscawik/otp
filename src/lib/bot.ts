/**
 * Telegram Bot logic using grammy
 */
import { Bot, Context, InlineKeyboard, session, SessionFlavor } from "grammy";
import { db } from "@/db";
import { users, numberOrders, topupTransactions } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import {
  getProducts,
  buyNumber,
  checkOrder,
  cancelOrder,
  finishOrder,
  rubToIdr,
  getProfile,
  getCheapestOption,
} from "@/lib/fivesim";
import {
  createTransaction,
  PAYMENT_METHOD_LABELS,
  buildPaymentUrl,
  type PaymentMethod,
} from "@/lib/pakasir";

// ─── Session ──────────────────────────────────────────────────────────────────

interface SessionData {
  step?: string;
  selectedCountry?: string;
  selectedProduct?: string;
  selectedOperator?: string;
  selectedPriceRub?: number;
  topupAmount?: number;
  topupMethod?: PaymentMethod;
  orderId?: number;
}

type MyContext = Context & SessionFlavor<SessionData>;

// ─── Popular services list ────────────────────────────────────────────────────

export const POPULAR_SERVICES = [
  { name: "WhatsApp", key: "whatsapp" },
  { name: "Telegram", key: "telegram" },
  { name: "Instagram", key: "instagram" },
  { name: "Facebook", key: "facebook" },
  { name: "TikTok", key: "tiktok" },
  { name: "Gmail / Google", key: "google" },
  { name: "Twitter / X", key: "twitter" },
  { name: "Shopee", key: "shopee" },
  { name: "Tokopedia", key: "tokopedia" },
  { name: "GoPay", key: "gopay" },
  { name: "OVO", key: "ovo" },
  { name: "Grab", key: "grab" },
  { name: "Gojek", key: "gojek" },
];

export const POPULAR_COUNTRIES = [
  { name: "🇮🇩 Indonesia", key: "indonesia" },
  { name: "🇲🇾 Malaysia", key: "malaysia" },
  { name: "🇵🇭 Philippines", key: "philippines" },
  { name: "🇻🇳 Vietnam", key: "vietnam" },
  { name: "🇹🇭 Thailand", key: "thailand" },
  { name: "🇮🇳 India", key: "india" },
  { name: "🇺🇸 USA", key: "usa" },
  { name: "🇬🇧 UK", key: "england" },
  { name: "🇷🇺 Russia", key: "russia" },
  { name: "🇩🇪 Germany", key: "germany" },
];

export const TOPUP_AMOUNTS = [5000, 10000, 25000, 50000, 100000, 200000];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRupiah(amount: number): string {
  return `Rp ${amount.toLocaleString("id-ID")}`;
}

async function getOrCreateUser(ctx: MyContext) {
  const tgId = ctx.from?.id;
  if (!tgId) throw new Error("No telegram ID");

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.telegramId, tgId))
    .limit(1);

  if (existing.length > 0) return existing[0];

  const [created] = await db
    .insert(users)
    .values({
      telegramId: tgId,
      username: ctx.from?.username ?? null,
      firstName: ctx.from?.first_name ?? null,
      lastName: ctx.from?.last_name ?? null,
      balance: 0,
    })
    .returning();

  return created;
}

// ─── Main keyboard ────────────────────────────────────────────────────────────

function mainKeyboard() {
  return new InlineKeyboard()
    .text("📱 Beli Nomor OTP", "buy_number")
    .text("💰 Top Up Saldo", "topup")
    .row()
    .text("📋 Riwayat Order", "history")
    .text("👛 Cek Saldo", "balance")
    .row()
    .text("❓ Bantuan", "help");
}

// ─── Build bot ────────────────────────────────────────────────────────────────

let botInstance: Bot<MyContext> | null = null;

export function getBot(): Bot<MyContext> {
  if (botInstance) return botInstance;

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN not set");

  const bot = new Bot<MyContext>(token);

  bot.use(
    session({
      initial: (): SessionData => ({}),
      getSessionKey: (ctx) => `session_${ctx.from?.id}`,
    })
  );

  // ─── /start ──────────────────────────────────────────────────────────────

  bot.command("start", async (ctx) => {
    const user = await getOrCreateUser(ctx);
    const name = ctx.from?.first_name ?? "Pengguna";

    await ctx.reply(
      `👋 Halo, *${name}*!\n\n` +
        `Selamat datang di *OTP Bot* 🤖\n` +
        `Dapatkan nomor virtual untuk verifikasi SMS dengan mudah dan cepat.\n\n` +
        `💳 Saldo kamu: *${formatRupiah(user.balance)}*\n\n` +
        `Pilih menu di bawah:`,
      { parse_mode: "Markdown", reply_markup: mainKeyboard() }
    );
  });

  // ─── /balance ─────────────────────────────────────────────────────────────

  bot.command("balance", async (ctx) => {
    const user = await getOrCreateUser(ctx);
    await ctx.reply(
      `💳 *Saldo Kamu*\n\n` +
        `Saldo tersedia: *${formatRupiah(user.balance)}*`,
      { parse_mode: "Markdown" }
    );
  });

  // ─── /help ────────────────────────────────────────────────────────────────

  bot.command("help", async (ctx) => {
    await ctx.reply(
      `*🤖 OTP Bot - Bantuan*\n\n` +
        `*Cara menggunakan:*\n` +
        `1. Top up saldo kamu\n` +
        `2. Pilih layanan & negara\n` +
        `3. Dapatkan nomor virtual\n` +
        `4. Tunggu kode OTP masuk\n` +
        `5. Selesai! 🎉\n\n` +
        `*Perintah:*\n` +
        `/start - Menu utama\n` +
        `/balance - Cek saldo\n` +
        `/history - Riwayat order\n` +
        `/help - Bantuan\n\n` +
        `*Kontak:* @admin`,
      { parse_mode: "Markdown" }
    );
  });

  // ─── Callback: balance ────────────────────────────────────────────────────

  bot.callbackQuery("balance", async (ctx) => {
    await ctx.answerCallbackQuery();
    const user = await getOrCreateUser(ctx);
    await ctx.editMessageText(
      `💳 *Saldo Kamu*\n\nSaldo tersedia: *${formatRupiah(user.balance)}*`,
      {
        parse_mode: "Markdown",
        reply_markup: new InlineKeyboard()
          .text("💰 Top Up", "topup")
          .text("🔙 Menu", "main_menu"),
      }
    );
  });

  // ─── Callback: help ───────────────────────────────────────────────────────

  bot.callbackQuery("help", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(
      `*🤖 OTP Bot - Bantuan*\n\n` +
        `*Cara menggunakan:*\n` +
        `1️⃣ Top up saldo\n` +
        `2️⃣ Pilih layanan (WA, TG, dll)\n` +
        `3️⃣ Pilih negara nomor\n` +
        `4️⃣ Konfirmasi & dapatkan nomor\n` +
        `5️⃣ Salin nomor, masukkan di app\n` +
        `6️⃣ Klik cek OTP saat kode terkirim\n\n` +
        `*Pembayaran:* QRIS, BNI VA, BRI VA, dll\n` +
        `*Sumber nomor:* 5sim.net`,
      {
        parse_mode: "Markdown",
        reply_markup: new InlineKeyboard().text("🔙 Menu Utama", "main_menu"),
      }
    );
  });

  // ─── Callback: main_menu ──────────────────────────────────────────────────

  bot.callbackQuery("main_menu", async (ctx) => {
    await ctx.answerCallbackQuery();
    const user = await getOrCreateUser(ctx);
    ctx.session = {};
    await ctx.editMessageText(
      `🏠 *Menu Utama*\n\n💳 Saldo: *${formatRupiah(user.balance)}*\n\nPilih menu:`,
      { parse_mode: "Markdown", reply_markup: mainKeyboard() }
    );
  });

  // ─── Callback: buy_number ─────────────────────────────────────────────────

  bot.callbackQuery("buy_number", async (ctx) => {
    await ctx.answerCallbackQuery();
    ctx.session = {};

    const kb = new InlineKeyboard();
    POPULAR_SERVICES.forEach((s, i) => {
      kb.text(s.name, `service_${s.key}`);
      if ((i + 1) % 2 === 0) kb.row();
    });
    kb.row().text("🔙 Menu Utama", "main_menu");

    await ctx.editMessageText(
      `📱 *Pilih Layanan*\n\nPilih layanan yang ingin diverifikasi:`,
      { parse_mode: "Markdown", reply_markup: kb }
    );
  });

  // ─── Callback: service_* ─────────────────────────────────────────────────

  bot.callbackQuery(/^service_(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const product = ctx.match[1];
    ctx.session.selectedProduct = product;

    const serviceName =
      POPULAR_SERVICES.find((s) => s.key === product)?.name ?? product;

    const kb = new InlineKeyboard();
    POPULAR_COUNTRIES.forEach((c, i) => {
      kb.text(c.name, `country_${c.key}`);
      if ((i + 1) % 2 === 0) kb.row();
    });
    kb.row().text("🔙 Layanan", "buy_number");

    await ctx.editMessageText(
      `🌍 *Pilih Negara*\n\nLayanan: *${serviceName}*\nPilih negara:`,
      { parse_mode: "Markdown", reply_markup: kb }
    );
  });

  // ─── Callback: country_* ─────────────────────────────────────────────────

  bot.callbackQuery(/^country_(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const country = ctx.match[1];
    ctx.session.selectedCountry = country;

    const product = ctx.session.selectedProduct!;
    const serviceName =
      POPULAR_SERVICES.find((s) => s.key === product)?.name ?? product;
    const countryName =
      POPULAR_COUNTRIES.find((c) => c.key === country)?.name ?? country;

    await ctx.editMessageText(
      `⏳ Mengecek ketersediaan nomor untuk *${serviceName}* di *${countryName}*...`,
      { parse_mode: "Markdown" }
    );

    try {
      const option = await getCheapestOption(country, product);

      if (!option || option.count === 0) {
        await ctx.editMessageText(
          `❌ *Maaf, nomor tidak tersedia*\n\nTidak ada nomor tersedia untuk *${serviceName}* di *${countryName}* saat ini.\n\nCoba pilih negara atau layanan lain.`,
          {
            parse_mode: "Markdown",
            reply_markup: new InlineKeyboard()
              .text("🔄 Ganti Negara", `service_${product}`)
              .text("🔙 Layanan", "buy_number"),
          }
        );
        return;
      }

      const priceIdr = rubToIdr(option.price);
      ctx.session.selectedOperator = option.operator;
      ctx.session.selectedPriceRub = option.price;

      const user = await getOrCreateUser(ctx);

      await ctx.editMessageText(
        `✅ *Konfirmasi Order*\n\n` +
          `📱 Layanan: *${serviceName}*\n` +
          `🌍 Negara: *${countryName}*\n` +
          `📡 Operator: *${option.operator}*\n` +
          `💰 Harga: *${formatRupiah(priceIdr)}*\n` +
          `📦 Stok: *${option.count} nomor*\n\n` +
          `💳 Saldo kamu: *${formatRupiah(user.balance)}*\n` +
          `${user.balance >= priceIdr ? "✅ Saldo mencukupi" : "❌ Saldo tidak mencukupi"}`,
        {
          parse_mode: "Markdown",
          reply_markup:
            user.balance >= priceIdr
              ? new InlineKeyboard()
                  .text("✅ Beli Sekarang", `confirm_buy`)
                  .row()
                  .text("💰 Top Up Dulu", "topup")
                  .text("🔙 Batal", "buy_number")
              : new InlineKeyboard()
                  .text("💰 Top Up Saldo", "topup")
                  .text("🔙 Batal", "buy_number"),
        }
      );
    } catch {
      await ctx.editMessageText(
        `❌ Gagal cek ketersediaan. Coba lagi nanti.`,
        {
          reply_markup: new InlineKeyboard().text("🔙 Menu", "main_menu"),
        }
      );
    }
  });

  // ─── Callback: confirm_buy ────────────────────────────────────────────────

  bot.callbackQuery("confirm_buy", async (ctx) => {
    await ctx.answerCallbackQuery("⏳ Memproses...");

    const { selectedCountry, selectedProduct, selectedOperator, selectedPriceRub } =
      ctx.session;

    if (!selectedCountry || !selectedProduct || !selectedOperator || !selectedPriceRub) {
      await ctx.editMessageText("❌ Sesi expired. Mulai ulang.", {
        reply_markup: new InlineKeyboard().text("🔙 Menu", "main_menu"),
      });
      return;
    }

    const user = await getOrCreateUser(ctx);
    const priceIdr = rubToIdr(selectedPriceRub);

    if (user.balance < priceIdr) {
      await ctx.editMessageText(
        `❌ *Saldo Tidak Mencukupi*\n\nSaldo: *${formatRupiah(user.balance)}*\nDibutuhkan: *${formatRupiah(priceIdr)}*`,
        {
          parse_mode: "Markdown",
          reply_markup: new InlineKeyboard()
            .text("💰 Top Up", "topup")
            .text("🔙 Menu", "main_menu"),
        }
      );
      return;
    }

    await ctx.editMessageText("⏳ *Membeli nomor...*", {
      parse_mode: "Markdown",
    });

    try {
      const order = await buyNumber(
        selectedCountry,
        selectedOperator,
        selectedProduct
      );

      // Deduct balance
      await db
        .update(users)
        .set({ balance: user.balance - priceIdr, updatedAt: new Date() })
        .where(eq(users.id, user.id));

      // Save order
      const [dbOrder] = await db
        .insert(numberOrders)
        .values({
          userId: user.id,
          fivesimOrderId: order.id,
          phone: order.phone,
          country: selectedCountry,
          operator: order.operator,
          product: selectedProduct,
          priceRub: selectedPriceRub,
          priceIdr,
          status: "PENDING",
          expires: order.expires ? new Date(order.expires) : null,
        })
        .returning();

      ctx.session.orderId = dbOrder.id;

      const serviceName =
        POPULAR_SERVICES.find((s) => s.key === selectedProduct)?.name ??
        selectedProduct;

      await ctx.editMessageText(
        `✅ *Nomor Berhasil Didapatkan!*\n\n` +
          `📱 Layanan: *${serviceName}*\n` +
          `📞 Nomor: \`${order.phone}\`\n` +
          `⏰ Expires: *20 menit*\n\n` +
          `➡️ Masukkan nomor ini di *${serviceName}*\n` +
          `📨 Lalu klik *Cek OTP* setelah SMS terkirim`,
        {
          parse_mode: "Markdown",
          reply_markup: new InlineKeyboard()
            .text("📨 Cek OTP", `check_otp_${dbOrder.id}`)
            .row()
            .text("❌ Batalkan", `cancel_order_${dbOrder.id}`)
            .text("🔙 Menu", "main_menu"),
        }
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      await ctx.editMessageText(
        `❌ *Gagal membeli nomor*\n\n${msg}\n\nSaldo tidak dipotong.`,
        {
          parse_mode: "Markdown",
          reply_markup: new InlineKeyboard().text("🔙 Menu", "main_menu"),
        }
      );
    }
  });

  // ─── Callback: check_otp_* ────────────────────────────────────────────────

  bot.callbackQuery(/^check_otp_(\d+)$/, async (ctx) => {
    await ctx.answerCallbackQuery("⏳ Mengecek OTP...");
    const dbOrderId = parseInt(ctx.match[1]);

    const [dbOrder] = await db
      .select()
      .from(numberOrders)
      .where(eq(numberOrders.id, dbOrderId))
      .limit(1);

    if (!dbOrder?.fivesimOrderId) {
      await ctx.reply("❌ Order tidak ditemukan.");
      return;
    }

    try {
      const order = await checkOrder(dbOrder.fivesimOrderId);
      const serviceName =
        POPULAR_SERVICES.find((s) => s.key === dbOrder.product)?.name ??
        dbOrder.product;

      if (order.sms && order.sms.length > 0) {
        const sms = order.sms[order.sms.length - 1];

        await db
          .update(numberOrders)
          .set({
            status: "RECEIVED",
            smsCode: sms.code,
            smsText: sms.text,
            smsSender: sms.sender,
            updatedAt: new Date(),
          })
          .where(eq(numberOrders.id, dbOrderId));

        await ctx.editMessageText(
          `🎉 *OTP Diterima!*\n\n` +
            `📱 Layanan: *${serviceName}*\n` +
            `📞 Nomor: \`${dbOrder.phone}\`\n` +
            `📨 Pengirim: *${sms.sender}*\n` +
            `🔑 Kode OTP: *\`${sms.code}\`*\n\n` +
            `📄 SMS lengkap:\n_${sms.text}_`,
          {
            parse_mode: "Markdown",
            reply_markup: new InlineKeyboard()
              .text("✅ Selesai", `finish_order_${dbOrderId}`)
              .row()
              .text("📱 Beli Nomor Lagi", "buy_number")
              .text("🔙 Menu", "main_menu"),
          }
        );
      } else {
        const statusMap: Record<string, string> = {
          PENDING: "⏳ Menunggu SMS...",
          RECEIVED: "✅ SMS Diterima",
          CANCELED: "❌ Dibatalkan",
          TIMEOUT: "⏰ Timeout",
          BANNED: "🚫 Banned",
        };

        await ctx.editMessageText(
          `📭 *OTP Belum Masuk*\n\n` +
            `📱 Layanan: *${serviceName}*\n` +
            `📞 Nomor: \`${dbOrder.phone}\`\n` +
            `📊 Status: ${statusMap[order.status] ?? order.status}\n\n` +
            `_Pastikan kamu sudah kirim kode verifikasi ke nomor ini_`,
          {
            parse_mode: "Markdown",
            reply_markup: new InlineKeyboard()
              .text("🔄 Cek Lagi", `check_otp_${dbOrderId}`)
              .row()
              .text("❌ Batalkan", `cancel_order_${dbOrderId}`)
              .text("🔙 Menu", "main_menu"),
          }
        );
      }
    } catch {
      await ctx.reply("❌ Gagal cek OTP. Coba lagi.");
    }
  });

  // ─── Callback: finish_order_* ─────────────────────────────────────────────

  bot.callbackQuery(/^finish_order_(\d+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const dbOrderId = parseInt(ctx.match[1]);

    const [dbOrder] = await db
      .select()
      .from(numberOrders)
      .where(eq(numberOrders.id, dbOrderId))
      .limit(1);

    if (dbOrder?.fivesimOrderId) {
      try {
        await finishOrder(dbOrder.fivesimOrderId);
      } catch {
        // ignore
      }
      await db
        .update(numberOrders)
        .set({ status: "FINISHED", updatedAt: new Date() })
        .where(eq(numberOrders.id, dbOrderId));
    }

    await ctx.editMessageText(
      `✅ *Order Selesai!*\n\nTerima kasih telah menggunakan OTP Bot 🤖\n\nMau beli nomor lagi?`,
      {
        parse_mode: "Markdown",
        reply_markup: new InlineKeyboard()
          .text("📱 Beli Lagi", "buy_number")
          .text("🔙 Menu", "main_menu"),
      }
    );
  });

  // ─── Callback: cancel_order_* ─────────────────────────────────────────────

  bot.callbackQuery(/^cancel_order_(\d+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const dbOrderId = parseInt(ctx.match[1]);

    const [dbOrder] = await db
      .select()
      .from(numberOrders)
      .where(eq(numberOrders.id, dbOrderId))
      .limit(1);

    if (!dbOrder) {
      await ctx.reply("Order tidak ditemukan.");
      return;
    }

    const user = await getOrCreateUser(ctx);

    try {
      if (dbOrder.fivesimOrderId) {
        await cancelOrder(dbOrder.fivesimOrderId);
      }

      // Refund if status was PENDING and no SMS received
      if (dbOrder.status === "PENDING") {
        await db
          .update(users)
          .set({
            balance: user.balance + dbOrder.priceIdr,
            updatedAt: new Date(),
          })
          .where(eq(users.id, user.id));
      }

      await db
        .update(numberOrders)
        .set({ status: "CANCELED", updatedAt: new Date() })
        .where(eq(numberOrders.id, dbOrderId));

      await ctx.editMessageText(
        `❌ *Order Dibatalkan*\n\n` +
          `${dbOrder.status === "PENDING" ? `💰 Saldo dikembalikan: *${formatRupiah(dbOrder.priceIdr)}*` : ""}`,
        {
          parse_mode: "Markdown",
          reply_markup: new InlineKeyboard()
            .text("📱 Beli Lagi", "buy_number")
            .text("🔙 Menu", "main_menu"),
        }
      );
    } catch {
      await ctx.reply("❌ Gagal membatalkan order.");
    }
  });

  // ─── Callback: history ────────────────────────────────────────────────────

  bot.callbackQuery("history", async (ctx) => {
    await ctx.answerCallbackQuery();
    const user = await getOrCreateUser(ctx);

    const orders = await db
      .select()
      .from(numberOrders)
      .where(eq(numberOrders.userId, user.id))
      .orderBy(desc(numberOrders.createdAt))
      .limit(5);

    if (orders.length === 0) {
      await ctx.editMessageText(
        `📋 *Riwayat Order*\n\nBelum ada order. Yuk beli nomor pertama kamu!`,
        {
          parse_mode: "Markdown",
          reply_markup: new InlineKeyboard()
            .text("📱 Beli Nomor", "buy_number")
            .text("🔙 Menu", "main_menu"),
        }
      );
      return;
    }

    const statusEmoji: Record<string, string> = {
      PENDING: "⏳",
      RECEIVED: "✅",
      CANCELED: "❌",
      TIMEOUT: "⏰",
      FINISHED: "🎉",
      BANNED: "🚫",
    };

    let text = `📋 *Riwayat Order (5 terakhir)*\n\n`;
    for (const order of orders) {
      const svcName =
        POPULAR_SERVICES.find((s) => s.key === order.product)?.name ??
        order.product;
      text +=
        `${statusEmoji[order.status] ?? "❓"} *${svcName}*\n` +
        `  📞 \`${order.phone ?? "-"}\`\n` +
        `  💰 ${formatRupiah(order.priceIdr)}\n` +
        `  📅 ${order.createdAt.toLocaleDateString("id-ID")}\n\n`;
    }

    const kb = new InlineKeyboard();
    // Add check OTP button for pending orders
    const pendingOrder = orders.find((o) => o.status === "PENDING");
    if (pendingOrder) {
      kb.text("📨 Cek OTP Aktif", `check_otp_${pendingOrder.id}`).row();
    }
    kb.text("🔙 Menu Utama", "main_menu");

    await ctx.editMessageText(text, {
      parse_mode: "Markdown",
      reply_markup: kb,
    });
  });

  // ─── Callback: topup ─────────────────────────────────────────────────────

  bot.callbackQuery("topup", async (ctx) => {
    await ctx.answerCallbackQuery();
    ctx.session.step = "topup_amount";

    const kb = new InlineKeyboard();
    TOPUP_AMOUNTS.forEach((amt, i) => {
      kb.text(formatRupiah(amt), `topup_amount_${amt}`);
      if ((i + 1) % 3 === 0) kb.row();
    });
    kb.row().text("🔙 Menu", "main_menu");

    await ctx.editMessageText(
      `💰 *Top Up Saldo*\n\nPilih nominal top up:`,
      { parse_mode: "Markdown", reply_markup: kb }
    );
  });

  // ─── Callback: topup_amount_* ─────────────────────────────────────────────

  bot.callbackQuery(/^topup_amount_(\d+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const amount = parseInt(ctx.match[1]);
    ctx.session.topupAmount = amount;

    const kb = new InlineKeyboard();
    const methods = Object.entries(PAYMENT_METHOD_LABELS) as [
      PaymentMethod,
      string
    ][];

    methods.forEach(([key, label], i) => {
      kb.text(label, `topup_method_${key}`);
      if ((i + 1) % 1 === 0) kb.row();
    });
    kb.text("🔙 Kembali", "topup");

    await ctx.editMessageText(
      `💰 *Pilih Metode Pembayaran*\n\nNominal: *${formatRupiah(amount)}*\n\nPilih metode:`,
      { parse_mode: "Markdown", reply_markup: kb }
    );
  });

  // ─── Callback: topup_method_* ─────────────────────────────────────────────

  bot.callbackQuery(/^topup_method_(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery("⏳ Membuat tagihan...");
    const method = ctx.match[1] as PaymentMethod;
    const amount = ctx.session.topupAmount;

    if (!amount) {
      await ctx.reply("Sesi expired. Mulai ulang.");
      return;
    }

    const user = await getOrCreateUser(ctx);
    const orderId = `TU${user.id}-${Date.now()}`;

    try {
      const payment = await createTransaction(orderId, amount, method);

      // Save to DB
      await db.insert(topupTransactions).values({
        userId: user.id,
        orderId,
        amount,
        fee: payment.fee,
        totalPayment: payment.total_payment,
        paymentMethod: method,
        paymentNumber: payment.payment_number,
        status: "pending",
        expiredAt: payment.expired_at
          ? new Date(payment.expired_at)
          : new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      const isQris = method === "qris";
      const expiryStr = payment.expired_at
        ? new Date(payment.expired_at).toLocaleString("id-ID")
        : "-";

      let msg =
        `💳 *Detail Pembayaran*\n\n` +
        `📦 Order ID: \`${orderId}\`\n` +
        `💰 Nominal: *${formatRupiah(amount)}*\n` +
        `💸 Fee: *${formatRupiah(payment.fee)}*\n` +
        `💵 Total Bayar: *${formatRupiah(payment.total_payment)}*\n` +
        `📅 Expired: _${expiryStr}_\n\n`;

      if (isQris) {
        msg +=
          `🔳 *Scan QR Code berikut untuk membayar:*\n` +
          `_(Gunakan GoPay, OVO, Dana, ShopeePay, dll)_\n\n` +
          `\`${payment.payment_number}\`\n\n`;
      } else {
        msg +=
          `🏦 *Nomor Virtual Account:*\n` +
          `\`${payment.payment_number}\`\n\n`;
      }

      msg += `_Saldo akan otomatis ditambah setelah pembayaran berhasil_`;

      const slug = process.env.PAKASIR_PROJECT ?? "";
      const paymentUrl = buildPaymentUrl(slug, amount, orderId, {
        qrisOnly: isQris,
      });

      const kb = new InlineKeyboard()
        .url("🔗 Buka Halaman Pembayaran", paymentUrl)
        .row()
        .text("✅ Cek Status Bayar", `check_topup_${orderId}_${amount}`)
        .row()
        .text("🔙 Menu Utama", "main_menu");

      await ctx.editMessageText(msg, {
        parse_mode: "Markdown",
        reply_markup: kb,
      });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Unknown error";
      await ctx.editMessageText(
        `❌ *Gagal membuat pembayaran*\n\n${errMsg}`,
        {
          parse_mode: "Markdown",
          reply_markup: new InlineKeyboard().text("🔙 Menu", "main_menu"),
        }
      );
    }
  });

  // ─── Callback: check_topup_* ──────────────────────────────────────────────

  bot.callbackQuery(/^check_topup_(.+)_(\d+)$/, async (ctx) => {
    await ctx.answerCallbackQuery("⏳ Mengecek status...");
    const orderId = ctx.match[1];
    const amount = parseInt(ctx.match[2]);

    try {
      const [tx] = await db
        .select()
        .from(topupTransactions)
        .where(eq(topupTransactions.orderId, orderId))
        .limit(1);

      if (!tx) {
        await ctx.reply("❌ Transaksi tidak ditemukan.");
        return;
      }

      if (tx.status === "completed") {
        await ctx.editMessageText(
          `✅ *Pembayaran Berhasil!*\n\nSaldo *${formatRupiah(amount)}* sudah ditambahkan ke akun kamu.`,
          {
            parse_mode: "Markdown",
            reply_markup: new InlineKeyboard()
              .text("📱 Beli Nomor OTP", "buy_number")
              .text("🔙 Menu", "main_menu"),
          }
        );
        return;
      }

      await ctx.editMessageText(
        `⏳ *Menunggu Pembayaran*\n\nOrder ID: \`${orderId}\`\nNominal: *${formatRupiah(amount)}*\n\n_Bayar dulu, lalu klik cek status_`,
        {
          parse_mode: "Markdown",
          reply_markup: new InlineKeyboard()
            .text("🔄 Cek Lagi", `check_topup_${orderId}_${amount}`)
            .row()
            .text("🔙 Menu", "main_menu"),
        }
      );
    } catch {
      await ctx.reply("❌ Gagal cek status pembayaran.");
    }
  });

  botInstance = bot;
  return bot;
}

export type { MyContext };
