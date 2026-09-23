"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Country {
  key: string;
  name: string;
}

interface Product {
  name: string;
  qty: number;
  priceRub: number;
  priceIdr: number;
}

const POPULAR_SERVICES = [
  { name: "WhatsApp", key: "whatsapp", emoji: "💬" },
  { name: "Telegram", key: "telegram", emoji: "✈️" },
  { name: "Instagram", key: "instagram", emoji: "📸" },
  { name: "Facebook", key: "facebook", emoji: "📘" },
  { name: "TikTok", key: "tiktok", emoji: "🎵" },
  { name: "Google", key: "google", emoji: "🔍" },
  { name: "Twitter/X", key: "twitter", emoji: "🐦" },
  { name: "Shopee", key: "shopee", emoji: "🛍️" },
  { name: "Tokopedia", key: "tokopedia", emoji: "🏪" },
  { name: "Grab", key: "grab", emoji: "🚗" },
  { name: "Gojek", key: "gojek", emoji: "🛵" },
  { name: "GoPay", key: "gopay", emoji: "💳" },
];

function formatRupiah(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function HomePage() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [selectedCountry, setSelectedCountry] = useState("indonesia");
  const [selectedService, setSelectedService] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const botUsername = "your_otp_bot";

  useEffect(() => {
    fetch("/api/fivesim/countries")
      .then((r) => r.json())
      .then(setCountries)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedCountry) {
      setLoading(true);
      fetch(`/api/fivesim/products?country=${selectedCountry}`)
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) setProducts(data.slice(0, 30));
        })
        .catch(() => setProducts([]))
        .finally(() => setLoading(false));
    }
  }, [selectedCountry]);

  const filteredProducts = selectedService
    ? products.filter((p) =>
        p.name.toLowerCase().includes(selectedService.toLowerCase())
      )
    : products;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#030712", color: "#f3f4f6" }}>
      {/* Navbar */}
      <nav style={{ borderBottom: "1px solid #1f2937", backgroundColor: "rgba(17,24,39,0.9)", backdropFilter: "blur(8px)", position: "sticky", top: 0, zIndex: 50 }}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🤖</span>
            <span className="text-xl font-bold text-white">OTP Bot</span>
            <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: "#1e1b4b", color: "#a5b4fc" }}>5sim.net</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-sm transition-colors" style={{ color: "#9ca3af" }}>
              Admin
            </Link>
            <a
              href={`https://t.me/${botUsername}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-colors"
              style={{ backgroundColor: "#4f46e5", color: "white" }}
            >
              <span>✈️</span> Buka Bot
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(49,46,129,0.3) 0%, transparent 50%, rgba(88,28,135,0.2) 100%)" }} />
        <div style={{ position: "absolute", top: -160, right: -160, width: 384, height: 384, backgroundColor: "rgba(79,70,229,0.08)", borderRadius: "50%", filter: "blur(60px)" }} />

        <div className="relative max-w-7xl mx-auto px-4 py-20 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 rounded-full" style={{ backgroundColor: "#1e1b4b", border: "1px solid #3730a3" }}>
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: "#4ade80" }} />
            <span className="text-sm font-medium" style={{ color: "#a5b4fc" }}>Powered by 5sim.net</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-extrabold text-white mb-6 leading-tight">
            Nomor Virtual OTP
            <br />
            <span style={{ background: "linear-gradient(to right, #818cf8, #c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Cepat &amp; Terpercaya
            </span>
          </h1>

          <p className="text-lg md:text-xl max-w-2xl mx-auto mb-10" style={{ color: "#9ca3af" }}>
            Dapatkan nomor telepon virtual dari seluruh dunia untuk verifikasi
            SMS. Top up via QRIS atau Virtual Account Indonesia.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={`https://t.me/${botUsername}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 font-bold px-8 py-4 rounded-2xl text-lg transition-transform hover:scale-105"
              style={{ backgroundColor: "#4f46e5", color: "white", boxShadow: "0 20px 40px rgba(79,70,229,0.3)" }}
            >
              <span className="text-2xl">✈️</span>
              Mulai di Telegram
            </a>
            <button
              onClick={() => document.getElementById("cek-harga")?.scrollIntoView({ behavior: "smooth" })}
              className="inline-flex items-center gap-3 font-semibold px-8 py-4 rounded-2xl text-lg transition-transform hover:scale-105"
              style={{ backgroundColor: "#1f2937", color: "white" }}
            >
              <span className="text-2xl">💰</span>
              Cek Harga
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto mt-16">
            {[
              { label: "Negara", value: "150+", icon: "🌍" },
              { label: "Layanan", value: "500+", icon: "📱" },
              { label: "Pembayaran", value: "QRIS & VA", icon: "💳" },
              { label: "Status", value: "Online", icon: "✅" },
            ].map((s) => (
              <div key={s.label} className="text-center p-4 rounded-2xl" style={{ backgroundColor: "#111827", border: "1px solid #1f2937" }}>
                <div className="text-2xl mb-1">{s.icon}</div>
                <div className="text-xl font-bold text-white">{s.value}</div>
                <div className="text-sm" style={{ color: "#6b7280" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Services */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-white text-center mb-4">Layanan Populer</h2>
        <p className="text-center mb-10" style={{ color: "#9ca3af" }}>
          Nomor tersedia untuk ratusan layanan di seluruh dunia
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {POPULAR_SERVICES.map((svc) => (
            <button
              key={svc.key}
              onClick={() => setSelectedService(svc.key === selectedService ? "" : svc.key)}
              className="text-center p-4 rounded-2xl transition-all cursor-pointer"
              style={{
                backgroundColor: selectedService === svc.key ? "rgba(49,46,129,0.5)" : "#111827",
                border: `1px solid ${selectedService === svc.key ? "#4f46e5" : "#1f2937"}`,
              }}
            >
              <div className="text-3xl mb-2">{svc.emoji}</div>
              <div className="text-sm font-medium" style={{ color: "#e5e7eb" }}>{svc.name}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Price Checker */}
      <div id="cek-harga" className="max-w-7xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-white text-center mb-4">Cek Harga Nomor</h2>
        <p className="text-center mb-10" style={{ color: "#9ca3af" }}>
          Harga real-time dari 5sim.net dalam Rupiah
        </p>

        <div className="max-w-4xl mx-auto p-6 rounded-2xl" style={{ backgroundColor: "#111827", border: "1px solid #1f2937" }}>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <label className="block text-sm mb-2" style={{ color: "#9ca3af" }}>🌍 Pilih Negara</label>
              <select
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-white focus:outline-none"
                style={{ backgroundColor: "#1f2937", border: "1px solid #374151" }}
              >
                {countries.map((c) => (
                  <option key={c.key} value={c.key}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm mb-2" style={{ color: "#9ca3af" }}>🔍 Filter Layanan</label>
              <input
                type="text"
                placeholder="Cari layanan... (whatsapp, telegram, dll)"
                value={selectedService}
                onChange={(e) => setSelectedService(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-white focus:outline-none"
                style={{ backgroundColor: "#1f2937", border: "1px solid #374151" }}
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block w-10 h-10 border-2 border-t-transparent rounded-full animate-spin mb-3" style={{ borderColor: "#4f46e5", borderTopColor: "transparent" }} />
              <p style={{ color: "#9ca3af" }}>Memuat harga...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12" style={{ color: "#6b7280" }}>
              <div className="text-4xl mb-3">🔍</div>
              <p>Tidak ada produk ditemukan.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: "1px solid #1f2937" }}>
                    <th className="text-left py-3 px-4 text-sm font-medium" style={{ color: "#9ca3af" }}>Layanan</th>
                    <th className="text-right py-3 px-4 text-sm font-medium" style={{ color: "#9ca3af" }}>Stok</th>
                    <th className="text-right py-3 px-4 text-sm font-medium" style={{ color: "#9ca3af" }}>Harga (IDR)</th>
                    <th className="text-right py-3 px-4 text-sm font-medium" style={{ color: "#9ca3af" }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((p) => (
                    <tr key={p.name} style={{ borderBottom: "1px solid rgba(31,41,55,0.5)" }} className="hover:bg-gray-800/20 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-medium text-white capitalize">{p.name}</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{
                          backgroundColor: p.qty > 50 ? "rgba(6,78,59,0.6)" : p.qty > 10 ? "rgba(78,63,0,0.6)" : "rgba(127,29,29,0.6)",
                          color: p.qty > 50 ? "#4ade80" : p.qty > 10 ? "#fbbf24" : "#f87171",
                        }}>
                          {p.qty} tersedia
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-bold" style={{ color: "#818cf8" }}>{formatRupiah(p.priceIdr)}</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <a
                          href={`https://t.me/${botUsername}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                          style={{ backgroundColor: "#4f46e5", color: "white" }}
                        >
                          Beli via Bot
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* How it works */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-white text-center mb-4">Cara Menggunakan</h2>
        <p className="text-center mb-12" style={{ color: "#9ca3af" }}>Mudah &amp; cepat dalam beberapa langkah</p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { step: "1", title: "Buka Bot Telegram", desc: "Cari @OTPBot di Telegram dan klik Start", icon: "✈️" },
            { step: "2", title: "Top Up Saldo", desc: "Top up via QRIS (GoPay, OVO, Dana) atau Virtual Account bank", icon: "💳" },
            { step: "3", title: "Pilih Layanan", desc: "Pilih layanan (WA, TG, IG, dll) dan negara nomor", icon: "📱" },
            { step: "4", title: "Terima OTP", desc: "Masukkan nomor di app, klik Cek OTP dan dapatkan kodenya", icon: "🔑" },
          ].map((s) => (
            <div key={s.step} className="relative text-center p-6 rounded-2xl" style={{ backgroundColor: "#111827", border: "1px solid #1f2937" }}>
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ backgroundColor: "#4f46e5" }}>
                {s.step}
              </div>
              <div className="text-4xl mb-4 mt-4">{s.icon}</div>
              <h3 className="text-white font-semibold mb-2">{s.title}</h3>
              <p className="text-sm" style={{ color: "#9ca3af" }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Payment Methods */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-white text-center mb-4">Metode Pembayaran</h2>
        <p className="text-center mb-10" style={{ color: "#9ca3af" }}>Bayar dengan mudah via QRIS atau Virtual Account</p>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 max-w-4xl mx-auto">
          {[
            { name: "QRIS", desc: "GoPay, OVO, Dana, ShopeePay", icon: "🔳", featured: true },
            { name: "BNI VA", desc: "Bank Negara Indonesia", icon: "🏦" },
            { name: "BRI VA", desc: "Bank Rakyat Indonesia", icon: "🏦" },
            { name: "CIMB VA", desc: "CIMB Niaga", icon: "🏦" },
            { name: "Permata VA", desc: "Bank Permata", icon: "🏦" },
            { name: "Maybank VA", desc: "Maybank Indonesia", icon: "🏦" },
            { name: "BNC VA", desc: "Bank Neo Commerce", icon: "🏦" },
            { name: "ATM Bersama", desc: "Jaringan ATM Bersama", icon: "🏧" },
            { name: "Sampoerna VA", desc: "Bank Sampoerna", icon: "🏦" },
            { name: "Artha Graha", desc: "Bank Artha Graha", icon: "🏦" },
          ].map((pm) => (
            <div
              key={pm.name}
              className="text-center p-4 rounded-2xl"
              style={{
                backgroundColor: pm.featured ? "rgba(30,27,75,0.5)" : "#111827",
                border: `1px solid ${pm.featured ? "#3730a3" : "#1f2937"}`,
              }}
            >
              <div className="text-2xl mb-2">{pm.icon}</div>
              <div className="text-white font-semibold text-sm">{pm.name}</div>
              <div className="text-xs mt-1" style={{ color: "#6b7280" }}>{pm.desc}</div>
            </div>
          ))}
        </div>

        <p className="text-center text-sm mt-6" style={{ color: "#6b7280" }}>
          Powered by{" "}
          <a href="https://pakasir.com" target="_blank" rel="noopener noreferrer" style={{ color: "#818cf8" }}>
            Pakasir
          </a>
        </p>
      </div>

      {/* CTA */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center p-12 rounded-3xl" style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #2e1065 100%)", border: "1px solid #3730a3" }}>
          <div className="text-5xl mb-4">🤖</div>
          <h2 className="text-3xl font-bold text-white mb-4">Siap Mulai?</h2>
          <p className="mb-8 max-w-xl mx-auto" style={{ color: "#c7d2fe" }}>
            Buka bot Telegram sekarang dan dapatkan nomor OTP pertama kamu dalam hitungan menit.
          </p>
          <a
            href={`https://t.me/${botUsername}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 font-bold px-10 py-4 rounded-2xl text-lg transition-transform hover:scale-105"
            style={{ backgroundColor: "white", color: "#1e1b4b" }}
          >
            <span className="text-2xl">✈️</span>
            Buka di Telegram
          </a>
        </div>
      </div>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid #1f2937", backgroundColor: "rgba(17,24,39,0.5)" }}>
        <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🤖</span>
            <span className="font-bold text-white">OTP Bot</span>
          </div>
          <div className="flex items-center gap-6 text-sm" style={{ color: "#9ca3af" }}>
            <a href="https://5sim.net" target="_blank" rel="noopener noreferrer" className="hover:text-white">5sim.net</a>
            <a href="https://pakasir.com" target="_blank" rel="noopener noreferrer" className="hover:text-white">Pakasir</a>
            <Link href="/admin" className="hover:text-white">Admin</Link>
          </div>
          <p className="text-sm" style={{ color: "#6b7280" }}>
            © {new Date().getFullYear()} OTP Bot. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
