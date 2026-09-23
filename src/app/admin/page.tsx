"use client";

import { useState, useEffect, useCallback } from "react";

interface Stats {
  totalUsers: number;
  totalOrders: number;
  totalTopupsCount: number;
  totalTopupsAmount: number;
  pendingOrders: number;
  pendingTopups: number;
  todayOrders: number;
  todayTopupsCount: number;
  todayTopupsAmount: number;
}

interface User {
  id: number;
  telegramId: number;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  balance: number;
  isBlocked: boolean;
  isAdmin: boolean;
  createdAt: string;
}

interface Order {
  id: number;
  phone: string | null;
  country: string;
  product: string;
  priceIdr: number;
  status: string;
  smsCode: string | null;
  createdAt: string;
  username: string | null;
  firstName: string | null;
  userTelegramId: number | null;
}

interface Topup {
  id: number;
  orderId: string;
  amount: number;
  totalPayment: number;
  paymentMethod: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
  username: string | null;
  firstName: string | null;
}

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n);
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  PENDING: { bg: "rgba(78,63,0,0.6)", color: "#fbbf24" },
  RECEIVED: { bg: "rgba(23,37,84,0.6)", color: "#93c5fd" },
  FINISHED: { bg: "rgba(6,78,59,0.6)", color: "#4ade80" },
  CANCELED: { bg: "rgba(31,41,55,0.6)", color: "#9ca3af" },
  TIMEOUT: { bg: "rgba(88,28,10,0.6)", color: "#fb923c" },
  BANNED: { bg: "rgba(127,29,29,0.6)", color: "#f87171" },
  pending: { bg: "rgba(78,63,0,0.6)", color: "#fbbf24" },
  completed: { bg: "rgba(6,78,59,0.6)", color: "#4ade80" },
  failed: { bg: "rgba(127,29,29,0.6)", color: "#f87171" },
  expired: { bg: "rgba(31,41,55,0.6)", color: "#9ca3af" },
};

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_COLORS[status] ?? { bg: "rgba(31,41,55,0.6)", color: "#9ca3af" };
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: c.bg, color: c.color }}>
      {status}
    </span>
  );
}

const TABS = [
  { key: "stats", label: "📊 Dashboard" },
  { key: "users", label: "👥 Users" },
  { key: "orders", label: "📱 Orders" },
  { key: "topups", label: "💰 Top Ups" },
  { key: "webhook", label: "🔗 Webhook" },
  { key: "settings", label: "⚙️ Pengaturan" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function AdminPage() {
  const [secret, setSecret] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState("");
  const [tab, setTab] = useState<TabKey>("stats");
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [topups, setTopups] = useState<Topup[]>([]);
  const [loading, setLoading] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookResult, setWebhookResult] = useState("");
  const [webhookInfo, setWebhookInfo] = useState<{ result?: Record<string, string | number | boolean | null> } | null>(null);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editBalance, setEditBalance] = useState("");

  const apiHeaders = { "x-admin-secret": secret };

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/stats", { headers: apiHeaders });
      if (res.status === 401) { setAuthenticated(false); return; }
      setStats(await res.json());
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secret]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users", { headers: apiHeaders });
      if (res.ok) setUsers(await res.json());
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secret]);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/orders", { headers: apiHeaders });
      if (res.ok) setOrders(await res.json());
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secret]);

  const fetchTopups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/topups", { headers: apiHeaders });
      if (res.ok) setTopups(await res.json());
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secret]);

  const fetchWebhookInfo = useCallback(async () => {
    const res = await fetch("/api/telegram/set-webhook");
    if (res.ok) setWebhookInfo(await res.json());
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    if (tab === "stats") fetchStats();
    if (tab === "users") fetchUsers();
    if (tab === "orders") fetchOrders();
    if (tab === "topups") fetchTopups();
    if (tab === "webhook") fetchWebhookInfo();
  }, [tab, authenticated, fetchStats, fetchUsers, fetchOrders, fetchTopups, fetchWebhookInfo]);

  const handleLogin = async () => {
    setAuthError("");
    const res = await fetch("/api/admin/stats", {
      headers: { "x-admin-secret": secret },
    });
    if (res.status === 401) {
      setAuthError("❌ Secret salah! Cek kembali ADMIN_SECRET.");
      return;
    }
    setAuthenticated(true);
    setStats(await res.json());
  };

  const handleSetWebhook = async () => {
    const res = await fetch("/api/telegram/set-webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminSecret: secret, webhookUrl }),
    });
    const data = await res.json();
    setWebhookResult(JSON.stringify(data, null, 2));
    fetchWebhookInfo();
  };

  const handleUpdateBalance = async () => {
    if (!editUser) return;
    const newBal = parseFloat(editBalance);
    if (isNaN(newBal)) return;
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { ...apiHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ userId: editUser.id, balance: newBal }),
    });
    setEditUser(null);
    fetchUsers();
  };

  const handleToggleBlock = async (user: User) => {
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { ...apiHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, isBlocked: !user.isBlocked }),
    });
    fetchUsers();
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    backgroundColor: "#1f2937",
    border: "1px solid #374151",
    borderRadius: "12px",
    padding: "12px 16px",
    color: "white",
    outline: "none",
    fontSize: "14px",
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: "#111827",
    border: "1px solid #1f2937",
    borderRadius: "16px",
    padding: "24px",
  };

  const btnPrimary: React.CSSProperties = {
    backgroundColor: "#4f46e5",
    color: "white",
    border: "none",
    borderRadius: "10px",
    padding: "10px 20px",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: "14px",
  };

  const btnSecondary: React.CSSProperties = {
    backgroundColor: "#1f2937",
    color: "#e5e7eb",
    border: "none",
    borderRadius: "10px",
    padding: "10px 20px",
    fontWeight: 500,
    cursor: "pointer",
    fontSize: "14px",
  };

  if (!authenticated) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#030712", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
        <div style={{ ...cardStyle, maxWidth: 400, width: "100%", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔐</div>
          <h1 style={{ color: "white", fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Admin Panel</h1>
          <p style={{ color: "#9ca3af", marginBottom: 24 }}>Masukkan ADMIN_SECRET untuk login</p>
          <input
            type="password"
            placeholder="Admin Secret..."
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            style={{ ...inputStyle, marginBottom: 16 }}
          />
          {authError && <p style={{ color: "#f87171", fontSize: 14, marginBottom: 16 }}>{authError}</p>}
          <button onClick={handleLogin} style={{ ...btnPrimary, width: "100%" }}>Masuk</button>
          <p style={{ color: "#4b5563", fontSize: 12, marginTop: 16 }}>Set ADMIN_SECRET di environment variables</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#030712", color: "#f3f4f6" }}>
      {/* Header */}
      <div style={{ borderBottom: "1px solid #1f2937", backgroundColor: "rgba(17,24,39,0.9)", position: "sticky", top: 0, zIndex: 50 }}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 20 }}>🤖</span>
            <span style={{ fontWeight: 700, color: "white" }}>OTP Bot Admin</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: "rgba(6,78,59,0.6)", color: "#4ade80" }}>● Online</span>
            <button onClick={() => setAuthenticated(false)} style={{ color: "#6b7280", background: "none", border: "none", cursor: "pointer", fontSize: 14 }}>
              Logout
            </button>
          </div>
        </div>
        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-4 flex gap-1 overflow-x-auto pb-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: "8px 16px",
                fontSize: 14,
                fontWeight: 500,
                borderRadius: "8px 8px 0 0",
                border: "none",
                cursor: "pointer",
                whiteSpace: "nowrap",
                backgroundColor: tab === t.key ? "#030712" : "transparent",
                color: tab === t.key ? "white" : "#9ca3af",
                transition: "color 0.2s",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Dashboard */}
        {tab === "stats" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 style={{ fontSize: 24, fontWeight: 700, color: "white" }}>📊 Dashboard</h2>
              <button onClick={fetchStats} style={btnSecondary}>🔄 Refresh</button>
            </div>
            {loading ? (
              <div style={{ textAlign: "center", padding: "80px 0", color: "#9ca3af" }}>Memuat...</div>
            ) : stats ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {[
                    { label: "Total Users", value: stats.totalUsers, icon: "👥", color: "#60a5fa" },
                    { label: "Total Orders", value: stats.totalOrders, icon: "📱", color: "#c084fc" },
                    { label: "Total Top Up", value: formatRupiah(Number(stats.totalTopupsAmount)), icon: "💰", color: "#4ade80" },
                    { label: "Pending Orders", value: stats.pendingOrders, icon: "⏳", color: "#fbbf24" },
                  ].map((s) => (
                    <div key={s.label} style={cardStyle}>
                      <div style={{ fontSize: 28, marginBottom: 8 }}>{s.icon}</div>
                      <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div>
                      <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div style={cardStyle}>
                    <h3 style={{ color: "white", fontWeight: 600, marginBottom: 16 }}>📅 Aktivitas 24 Jam</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {[
                        { label: "Order Hari Ini", value: String(stats.todayOrders), color: "white" },
                        { label: "Top Up Hari Ini", value: `${stats.todayTopupsCount}x`, color: "white" },
                        { label: "Revenue Hari Ini", value: formatRupiah(Number(stats.todayTopupsAmount)), color: "#4ade80" },
                      ].map((item) => (
                        <div key={item.label} style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ color: "#9ca3af" }}>{item.label}</span>
                          <span style={{ color: item.color, fontWeight: 600 }}>{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={cardStyle}>
                    <h3 style={{ color: "white", fontWeight: 600, marginBottom: 16 }}>⚠️ Pending</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {[
                        { label: "Order Pending", value: String(stats.pendingOrders), color: "#fbbf24" },
                        { label: "Top Up Pending", value: String(stats.pendingTopups), color: "#fbbf24" },
                        { label: "Total Top Up Sukses", value: `${stats.totalTopupsCount}x`, color: "white" },
                      ].map((item) => (
                        <div key={item.label} style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ color: "#9ca3af" }}>{item.label}</span>
                          <span style={{ color: item.color, fontWeight: 600 }}>{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* Users */}
        {tab === "users" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 style={{ fontSize: 24, fontWeight: 700, color: "white" }}>👥 Users ({users.length})</h2>
              <button onClick={fetchUsers} style={btnSecondary}>🔄 Refresh</button>
            </div>

            {editUser && (
              <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}>
                <div style={{ ...cardStyle, maxWidth: 360, width: "100%" }}>
                  <h3 style={{ color: "white", fontWeight: 600, marginBottom: 16 }}>
                    Edit Saldo: {editUser.firstName ?? editUser.username}
                  </h3>
                  <input
                    type="number"
                    value={editBalance}
                    onChange={(e) => setEditBalance(e.target.value)}
                    style={{ ...inputStyle, marginBottom: 16 }}
                    placeholder="Saldo baru (IDR)"
                  />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={handleUpdateBalance} style={{ ...btnPrimary, flex: 1 }}>Simpan</button>
                    <button onClick={() => setEditUser(null)} style={{ ...btnSecondary, flex: 1 }}>Batal</button>
                  </div>
                </div>
              </div>
            )}

            <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #1f2937" }}>
                      {["User", "Telegram ID", "Saldo", "Status", "Bergabung", "Aksi"].map((h) => (
                        <th key={h} style={{ textAlign: h === "Saldo" || h === "Telegram ID" ? "right" : h === "Status" || h === "Aksi" ? "center" : "left", padding: "12px 16px", color: "#9ca3af", fontWeight: 500 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} style={{ borderBottom: "1px solid rgba(31,41,55,0.5)" }}>
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ fontWeight: 500, color: "white" }}>{u.firstName ?? "-"} {u.lastName ?? ""}</div>
                          <div style={{ color: "#6b7280", fontSize: 12 }}>@{u.username ?? "-"}</div>
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "right", color: "#d1d5db", fontFamily: "monospace" }}>{u.telegramId}</td>
                        <td style={{ padding: "12px 16px", textAlign: "right", color: "#4ade80", fontWeight: 600 }}>{formatRupiah(u.balance)}</td>
                        <td style={{ padding: "12px 16px", textAlign: "center" }}>
                          {u.isBlocked ? (
                            <StatusBadge status="BANNED" />
                          ) : u.isAdmin ? (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: "rgba(88,28,135,0.5)", color: "#e879f9" }}>Admin</span>
                          ) : (
                            <StatusBadge status="FINISHED" />
                          )}
                        </td>
                        <td style={{ padding: "12px 16px", color: "#9ca3af" }}>{new Date(u.createdAt).toLocaleDateString("id-ID")}</td>
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                            <button
                              onClick={() => { setEditUser(u); setEditBalance(String(u.balance)); }}
                              style={{ fontSize: 12, backgroundColor: "rgba(49,46,129,0.5)", color: "#a5b4fc", border: "none", padding: "4px 8px", borderRadius: 6, cursor: "pointer" }}
                            >
                              Edit Saldo
                            </button>
                            <button
                              onClick={() => handleToggleBlock(u)}
                              style={{
                                fontSize: 12,
                                backgroundColor: u.isBlocked ? "rgba(6,78,59,0.5)" : "rgba(127,29,29,0.5)",
                                color: u.isBlocked ? "#4ade80" : "#f87171",
                                border: "none", padding: "4px 8px", borderRadius: 6, cursor: "pointer",
                              }}
                            >
                              {u.isBlocked ? "Unblock" : "Block"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Orders */}
        {tab === "orders" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 style={{ fontSize: 24, fontWeight: 700, color: "white" }}>📱 Orders ({orders.length})</h2>
              <button onClick={fetchOrders} style={btnSecondary}>🔄 Refresh</button>
            </div>
            <div style={{ ...cardStyle, padding: 0, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #1f2937" }}>
                    {["User", "Produk", "Nomor", "Harga", "OTP", "Status", "Tanggal"].map((h) => (
                      <th key={h} style={{ textAlign: h === "Harga" ? "right" : h === "Status" ? "center" : "left", padding: "12px 16px", color: "#9ca3af", fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id} style={{ borderBottom: "1px solid rgba(31,41,55,0.5)" }}>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ color: "white" }}>{o.firstName ?? "-"}</div>
                        <div style={{ color: "#6b7280", fontSize: 12 }}>@{o.username ?? "-"}</div>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ fontWeight: 500, color: "white", textTransform: "capitalize" }}>{o.product}</div>
                        <div style={{ color: "#6b7280", fontSize: 12 }}>{o.country}</div>
                      </td>
                      <td style={{ padding: "12px 16px", fontFamily: "monospace", color: "#d1d5db" }}>{o.phone ?? "-"}</td>
                      <td style={{ padding: "12px 16px", textAlign: "right", color: "#818cf8" }}>{formatRupiah(o.priceIdr)}</td>
                      <td style={{ padding: "12px 16px", fontFamily: "monospace", color: "#4ade80", fontWeight: 700 }}>{o.smsCode ?? "-"}</td>
                      <td style={{ padding: "12px 16px", textAlign: "center" }}><StatusBadge status={o.status} /></td>
                      <td style={{ padding: "12px 16px", color: "#9ca3af", fontSize: 12 }}>{new Date(o.createdAt).toLocaleString("id-ID")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Topups */}
        {tab === "topups" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 style={{ fontSize: 24, fontWeight: 700, color: "white" }}>💰 Top Ups ({topups.length})</h2>
              <button onClick={fetchTopups} style={btnSecondary}>🔄 Refresh</button>
            </div>
            <div style={{ ...cardStyle, padding: 0, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #1f2937" }}>
                    {["Order ID", "User", "Nominal", "Total Bayar", "Metode", "Status", "Tanggal"].map((h) => (
                      <th key={h} style={{ textAlign: h === "Nominal" || h === "Total Bayar" ? "right" : h === "Status" ? "center" : "left", padding: "12px 16px", color: "#9ca3af", fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {topups.map((t) => (
                    <tr key={t.id} style={{ borderBottom: "1px solid rgba(31,41,55,0.5)" }}>
                      <td style={{ padding: "12px 16px", fontFamily: "monospace", fontSize: 12, color: "#9ca3af" }}>{t.orderId}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ color: "white" }}>{t.firstName ?? "-"}</div>
                        <div style={{ color: "#6b7280", fontSize: 12 }}>@{t.username ?? "-"}</div>
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right", color: "white" }}>{formatRupiah(t.amount)}</td>
                      <td style={{ padding: "12px 16px", textAlign: "right", color: "#818cf8" }}>{formatRupiah(t.totalPayment)}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ backgroundColor: "#1f2937", color: "#d1d5db", padding: "2px 8px", borderRadius: 6, fontSize: 11, textTransform: "uppercase" }}>
                          {t.paymentMethod.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "center" }}><StatusBadge status={t.status} /></td>
                      <td style={{ padding: "12px 16px", color: "#9ca3af", fontSize: 12 }}>{new Date(t.createdAt).toLocaleString("id-ID")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Webhook */}
        {tab === "webhook" && (
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: "white", marginBottom: 24 }}>🔗 Telegram Webhook Setup</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div style={cardStyle}>
                <h3 style={{ color: "white", fontWeight: 600, marginBottom: 16 }}>Set Webhook</h3>
                <p style={{ color: "#9ca3af", fontSize: 14, marginBottom: 16 }}>Set webhook URL Telegram bot ke deployment Vercel kamu.</p>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", color: "#9ca3af", fontSize: 13, marginBottom: 8 }}>Webhook URL</label>
                  <input
                    type="url"
                    placeholder="https://your-app.vercel.app/api/telegram/webhook"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <button onClick={handleSetWebhook} style={{ ...btnPrimary, width: "100%" }}>🔗 Set Webhook</button>
                {webhookResult && (
                  <pre style={{ marginTop: 16, backgroundColor: "#1f2937", borderRadius: 12, padding: 12, fontSize: 12, color: "#d1d5db", overflowX: "auto" }}>
                    {webhookResult}
                  </pre>
                )}
              </div>

              <div style={cardStyle}>
                <h3 style={{ color: "white", fontWeight: 600, marginBottom: 16 }}>Webhook Info</h3>
                {webhookInfo?.result ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
                    {Object.entries(webhookInfo.result).map(([k, v]) => (
                      <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                        <span style={{ color: "#9ca3af" }}>{k}</span>
                        <span style={{ color: "white", wordBreak: "break-all", maxWidth: 240, textAlign: "right" }}>{String(v)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: "#6b7280", fontSize: 14 }}>Klik refresh untuk melihat info webhook</p>
                )}
                <button onClick={fetchWebhookInfo} style={{ ...btnSecondary, width: "100%", marginTop: 16 }}>🔄 Refresh Info</button>
              </div>

              <div style={{ ...cardStyle, gridColumn: "1 / -1" }}>
                <h3 style={{ color: "white", fontWeight: 600, marginBottom: 16 }}>📋 Panduan Setup</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 16, fontSize: 14, color: "#9ca3af" }}>
                  {[
                    {
                      title: "1. Buat Bot Telegram",
                      desc: "Chat dengan @BotFather di Telegram → /newbot → salin token",
                    },
                    {
                      title: "2. Set Environment Variables (Vercel)",
                      code: `TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_WEBHOOK_SECRET=random_secret_string
NEXT_PUBLIC_BASE_URL=https://your-app.vercel.app
PAKASIR_PROJECT=your_project_slug
PAKASIR_API_KEY=your_api_key
FIVESIM_API_TOKEN=your_5sim_token
ADMIN_SECRET=random_admin_password
DATABASE_URL=postgresql://...`,
                    },
                    {
                      title: "3. Set Webhook Pakasir",
                      desc: "Di dashboard Pakasir, set Webhook URL ke:",
                      code: "https://your-app.vercel.app/api/payment/webhook",
                    },
                    {
                      title: "4. Set Telegram Webhook",
                      desc: "Gunakan form di atas dengan URL:",
                      code: "https://your-app.vercel.app/api/telegram/webhook",
                    },
                  ].map((item) => (
                    <div key={item.title}>
                      <p style={{ color: "white", fontWeight: 500, marginBottom: 6 }}>{item.title}</p>
                      {item.desc && <p style={{ marginBottom: 6 }}>{item.desc}</p>}
                      {item.code && (
                        <pre style={{ backgroundColor: "#1f2937", borderRadius: 12, padding: 12, fontSize: 12, color: "#d1d5db", overflowX: "auto", margin: 0 }}>
                          {item.code}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Settings */}
        {tab === "settings" && (
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: "white", marginBottom: 24 }}>⚙️ Pengaturan Sistem</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div style={cardStyle}>
                <h3 style={{ color: "white", fontWeight: 600, marginBottom: 16 }}>🔑 Konfigurasi API</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 14 }}>
                  {[
                    { label: "5sim Token", masked: true },
                    { label: "Pakasir Project" },
                    { label: "Pakasir API Key", masked: true },
                    { label: "Telegram Bot Token", masked: true },
                    { label: "Markup IDR (per RUB)" },
                  ].map((cfg) => (
                    <div key={cfg.label} style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#9ca3af" }}>{cfg.label}</span>
                      <span style={{ color: "#4b5563", fontFamily: "monospace", fontSize: 12 }}>
                        {cfg.masked ? "••••••••" : "Set via .env"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={cardStyle}>
                <h3 style={{ color: "white", fontWeight: 600, marginBottom: 16 }}>📊 Info Sistem</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 14 }}>
                  {[
                    { label: "Framework", value: "Next.js 15 (App Router)" },
                    { label: "Database", value: "PostgreSQL (Drizzle ORM)" },
                    { label: "Telegram Library", value: "grammy" },
                    { label: "Nomor Virtual", value: "5sim.net" },
                    { label: "Payment Gateway", value: "Pakasir (QRIS + VA)" },
                    { label: "Deploy", value: "Vercel Ready ✅" },
                  ].map((item) => (
                    <div key={item.label} style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#9ca3af" }}>{item.label}</span>
                      <span style={{ color: "white" }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ ...cardStyle, gridColumn: "1 / -1" }}>
                <h3 style={{ color: "white", fontWeight: 600, marginBottom: 16 }}>🚀 Vercel Deploy Guide</h3>
                <pre style={{ backgroundColor: "#1f2937", borderRadius: 12, padding: 16, fontSize: 12, color: "#d1d5db", overflowX: "auto" }}>
{`# 1. Push ke GitHub/GitLab
git add . && git commit -m "Initial OTP Bot" && git push

# 2. Import project di vercel.com
# 3. Set semua environment variables di Vercel Dashboard
# 4. Deploy → set webhook seperti panduan di tab Webhook`}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
