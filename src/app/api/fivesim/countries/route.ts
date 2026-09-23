import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Return popular countries for the UI
export async function GET() {
  const countries = [
    { key: "indonesia", name: "🇮🇩 Indonesia" },
    { key: "malaysia", name: "🇲🇾 Malaysia" },
    { key: "philippines", name: "🇵🇭 Philippines" },
    { key: "vietnam", name: "🇻🇳 Vietnam" },
    { key: "thailand", name: "🇹🇭 Thailand" },
    { key: "india", name: "🇮🇳 India" },
    { key: "usa", name: "🇺🇸 USA" },
    { key: "england", name: "🇬🇧 UK" },
    { key: "russia", name: "🇷🇺 Russia" },
    { key: "germany", name: "🇩🇪 Germany" },
    { key: "france", name: "🇫🇷 France" },
    { key: "brazil", name: "🇧🇷 Brazil" },
    { key: "cambodia", name: "🇰🇭 Cambodia" },
    { key: "china", name: "🇨🇳 China" },
    { key: "singapore", name: "🇸🇬 Singapore" },
  ];

  return NextResponse.json(countries);
}
