import os from "node:os";
import type { NextConfig } from "next";

/**
 * Geliştirme sırasında aynı wifi'daki telefondan girebilmek için, bu makinenin
 * yerel ağ adreslerini otomatik olarak izinli hâle getiriyoruz.
 *
 * Next, dev sunucusunun kaynaklarına başka bir kaynaktan (origin) erişimi
 * güvenlik gereği engelliyor. Adresi elle yazmak yerine ağ arayüzlerinden
 * okuyoruz; böylece DHCP adresi değiştiğinde ayar bozulmuyor.
 */
function localNetworkOrigins(): string[] {
  const addresses = new Set<string>();
  for (const entries of Object.values(os.networkInterfaces())) {
    for (const entry of entries ?? []) {
      if (entry.family === "IPv4" && !entry.internal) addresses.add(entry.address);
    }
  }
  // Güvenlik duvarına kural ekleyemediğimiz makinelerde telefondan bakmak için
  // geçici tünel kullanıyoruz (cloudflared / localtunnel). Onların adreslerini de
  // izinli tutuyoruz — bu ayar yalnızca geliştirmede geçerli.
  return [...addresses, "*.trycloudflare.com", "*.loca.lt", "*.ngrok-free.app"];
}

const nextConfig: NextConfig = {
  // Next'in her açılışta AGENTS.md / CLAUDE.md üretmesini kapatıyoruz;
  // bu projede işimize yaramıyor ve depoyu kirletiyor.
  agentRules: false,

  // Yalnızca geliştirmede etkili; yayın derlemesini etkilemiyor.
  allowedDevOrigins: localNetworkOrigins(),
};

export default nextConfig;
