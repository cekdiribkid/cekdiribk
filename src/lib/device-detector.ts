// Device detection utility — parses User-Agent string to extract
// device type (Smartphone/Tablet/Laptop-PC), brand (Samsung, Apple, Xiaomi, etc.),
// model, OS, and browser information.

export interface DeviceInfo {
  deviceType: string; // "Smartphone" | "Tablet" | "Laptop/PC" | "Unknown"
  deviceBrand: string; // "Samsung", "Apple", "Xiaomi", "Asus", "Unknown"
  deviceModel: string; // Model name or empty
  deviceOS: string; // "Android 13", "Windows 11", "iOS 17", "Linux", etc.
  browser: string; // "Chrome", "Safari", "Firefox", "Edge", etc.
  userAgent: string; // Full UA string
}

interface MobileBrandHint {
  brand: string;
  browserName: string;
}

/**
 * Detect mobile browser tokens that uniquely identify a phone brand.
 *
 * IMPORTANT: Many Android phone browsers (Oppo, Samsung, Xiaomi, Vivo, Huawei)
 * send a "desktop-like" User-Agent when the user enables "Request desktop site".
 * In that mode the UA looks like `X11; Linux x86_64` (hiding "Android" and
 * "Mobile"), so a naive detector misidentifies the phone as a Linux desktop PC.
 *
 * However the brand-specific browser token (HeyTapBrowser, SamsungBrowser,
 * MiuiBrowser, etc.) ALWAYS remains in the UA, giving us a reliable way to
 * detect the real phone brand even in desktop mode.
 */
function detectMobileBrandHint(
  ua: string,
  uaLower: string
): MobileBrandHint | null {
  if (/heytapbrowser/i.test(ua))
    return { brand: "Oppo", browserName: "HeyTapBrowser" };
  if (/samsungbrowser/i.test(uaLower))
    return { brand: "Samsung", browserName: "Samsung Internet" };
  if (/miuibrowser/i.test(uaLower))
    return { brand: "Xiaomi", browserName: "Mi Browser" };
  if (/vivobrowser/i.test(uaLower))
    return { brand: "Vivo", browserName: "Vivo Browser" };
  if (/oppobrowser|oppo\s*browser/i.test(ua))
    return { brand: "Oppo", browserName: "Oppo Browser" };
  if (/huaweibrowser/i.test(uaLower))
    return { brand: "Huawei", browserName: "Huawei Browser" };
  if (/realmebrowser/i.test(uaLower))
    return { brand: "Realme", browserName: "Realme Browser" };
  return null;
}

/**
 * Parse a User-Agent string and extract device information.
 * Detects common phone brands (Samsung, Xiaomi, Oppo, Vivo, Realme, Huawei,
 * Infinix, Tecno, Nokia, Motorola, OnePlus, Google Pixel, iPhone) and
 * desktop OS (Windows, macOS, Linux). For desktops the hardware brand
 * (Dell, HP, Lenovo, etc.) cannot be reliably detected from the UA string,
 * so we return "Laptop/PC" as the brand placeholder.
 */
export function parseUserAgent(ua: string): DeviceInfo {
  const userAgent = ua || "";
  const uaLower = userAgent.toLowerCase();

  // ---------- Pre-check: Mobile browser tokens (high confidence) ----------
  const mobileHint = detectMobileBrandHint(userAgent, uaLower);

  // ---------- Device Type ----------
  let deviceType = "Unknown";
  const isMobile = /android|iphone|ipod|windows phone|blackberry|opera mini|mobile/i.test(
    uaLower
  );
  const isTablet = /ipad|tablet|playbook|silk|kindle/i.test(uaLower);

  if (isTablet) {
    deviceType = "Tablet";
  } else if (isMobile || mobileHint) {
    // mobileHint covers phones in "desktop mode" whose UA hides Android/Mobile
    deviceType = "Smartphone";
  } else if (/windows nt|macintosh|mac os x|linux|cros/i.test(uaLower)) {
    deviceType = "Laptop/PC";
  }

  // ---------- Device Brand & Model ----------
  let deviceBrand = "Unknown";
  let deviceModel = "";

  if (/iphone/i.test(uaLower)) {
    deviceBrand = "Apple";
    deviceModel = "iPhone";
    const iosMatch = userAgent.match(/OS (\d+[_\d]*)/i);
    if (iosMatch) deviceModel = `iPhone (iOS ${iosMatch[1].replace(/_/g, ".")})`;
  } else if (/ipad/i.test(uaLower)) {
    deviceBrand = "Apple";
    deviceModel = "iPad";
    const iosMatch = userAgent.match(/OS (\d+[_\d]*)/i);
    if (iosMatch)
      deviceModel = `iPad (iPadOS ${iosMatch[1].replace(/_/g, ".")})`;
  } else if (/macintosh|mac os x/i.test(uaLower) && !mobileHint) {
    deviceBrand = "Apple";
    deviceModel = "Mac";
    const macMatch = userAgent.match(/mac os x (\d+[_\d]*)/i);
    if (macMatch)
      deviceModel = `Mac (macOS ${macMatch[1].replace(/_/g, ".")})`;
  } else if (/android/i.test(uaLower)) {
    // Normal Android UA — extract brand from model identifier
    if (/sm-[a-z0-9]+/i.test(userAgent)) {
      deviceBrand = "Samsung";
      const m = userAgent.match(/sm-[a-z0-9]+/i);
      if (m) deviceModel = m[0];
    } else if (/\b(mi\s?\d|redmi|poco)\b/i.test(userAgent)) {
      deviceBrand = "Xiaomi";
      const m = userAgent.match(/\b(mi\s?\d[^;)]*|redmi[^;)]*|poco[^;)]*)\b/i);
      if (m) deviceModel = m[1].trim();
    } else if (/\bvivo\b/i.test(uaLower)) {
      deviceBrand = "Vivo";
      const m = userAgent.match(/vivo\s([a-z0-9.\-]+)/i);
      if (m) deviceModel = `Vivo ${m[1]}`;
    } else if (/\boppo\b/i.test(uaLower)) {
      deviceBrand = "Oppo";
      const m = userAgent.match(/oppo\s([a-z0-9.\-]+)/i);
      if (m) deviceModel = `Oppo ${m[1]}`;
    } else if (/\brealme\b/i.test(uaLower)) {
      deviceBrand = "Realme";
      const m = userAgent.match(/realme\s([a-z0-9.\-]+)/i);
      if (m) deviceModel = `Realme ${m[1]}`;
    } else if (/\bhuawei\b|honor/i.test(uaLower)) {
      deviceBrand = "Huawei";
      const m = userAgent.match(/(huawei|honor)\s([a-z0-9.\-]+)/i);
      if (m) deviceModel = `${m[1]} ${m[2]}`;
    } else if (/\binfinix\b/i.test(uaLower)) {
      deviceBrand = "Infinix";
      const m = userAgent.match(/infinix\s([a-z0-9.\-]+)/i);
      if (m) deviceModel = `Infinix ${m[1]}`;
    } else if (/\btecno\b/i.test(uaLower)) {
      deviceBrand = "Tecno";
      const m = userAgent.match(/tecno\s([a-z0-9.\-]+)/i);
      if (m) deviceModel = `Tecno ${m[1]}`;
    } else if (/\bnokia\b/i.test(uaLower)) {
      deviceBrand = "Nokia";
      const m = userAgent.match(/nokia\s([a-z0-9.\-]+)/i);
      if (m) deviceModel = `Nokia ${m[1]}`;
    } else if (/moto|motorola/i.test(uaLower)) {
      deviceBrand = "Motorola";
      const m = userAgent.match(/moto\s([a-z0-9.\-]+)/i);
      if (m) deviceModel = `Moto ${m[1]}`;
    } else if (/oneplus/i.test(uaLower)) {
      deviceBrand = "OnePlus";
      const m = userAgent.match(/oneplus\s([a-z0-9.\-]+)/i);
      if (m) deviceModel = `OnePlus ${m[1]}`;
    } else if (/pixel/i.test(uaLower)) {
      deviceBrand = "Google";
      const m = userAgent.match(/pixel\s([a-z0-9.\-]+)/i);
      if (m) deviceModel = `Pixel ${m[1]}`;
    } else if (/xperia/i.test(uaLower)) {
      deviceBrand = "Sony";
      const m = userAgent.match(/xperia\s([a-z0-9.\-]+)/i);
      if (m) deviceModel = `Xperia ${m[1]}`;
    } else if (/\blg[-\s]/i.test(userAgent)) {
      deviceBrand = "LG";
      const m = userAgent.match(/lg[-\s]([a-z0-9.\-]+)/i);
      if (m) deviceModel = `LG ${m[1]}`;
    } else if (mobileHint) {
      // Android present but no specific model — use browser hint as fallback
      deviceBrand = mobileHint.brand;
      deviceModel = `HP ${mobileHint.brand}`;
    } else {
      deviceBrand = "Android";
      const m = userAgent.match(/;\s*([^;)]+?)\s+Build\//i);
      if (m) deviceModel = m[1].trim();
    }
  } else if (mobileHint) {
    // Desktop-mode phone: "Android" is absent from UA but a mobile browser
    // token (HeyTapBrowser, SamsungBrowser, MiuiBrowser, etc.) is present.
    deviceBrand = mobileHint.brand;
    deviceModel = "Mode Desktop";
  } else if (/windows phone/i.test(uaLower)) {
    deviceBrand = "Microsoft";
    const m = userAgent.match(/windows phone\s([0-9.]+)/i);
    if (m) deviceModel = `Windows Phone ${m[1]}`;
  } else if (/windows nt/i.test(uaLower)) {
    // Desktop Windows — hardware brand not detectable from UA
    deviceBrand = "Laptop/PC";
    deviceModel = "Windows PC";
  } else if (/linux/i.test(uaLower) && !/android/i.test(uaLower)) {
    // Genuine Linux desktop (mobileHint already handled above)
    deviceBrand = "Laptop/PC";
    deviceModel = "Linux PC";
  } else if (/cros/i.test(uaLower)) {
    // ChromeOS device (Chromebook)
    deviceBrand = "Chromebook";
    deviceModel = "ChromeOS";
  }

  // ---------- Operating System ----------
  let deviceOS = "Unknown";

  if (mobileHint && !/android|iphone|ipad|windows phone/i.test(uaLower)) {
    // Phone in desktop mode — actual OS is Android but hidden in UA
    deviceOS = "Android (Mode Desktop)";
  } else if (/windows nt 10/i.test(uaLower)) {
    deviceOS = "Windows 10/11";
  } else if (/windows nt 6\.3/i.test(uaLower)) {
    deviceOS = "Windows 8.1";
  } else if (/windows nt 6\.2/i.test(uaLower)) {
    deviceOS = "Windows 8";
  } else if (/windows nt 6\.1/i.test(uaLower)) {
    deviceOS = "Windows 7";
  } else if (/windows phone/i.test(uaLower)) {
    const m = userAgent.match(/windows phone\s([0-9.]+)/i);
    deviceOS = m ? `Windows Phone ${m[1]}` : "Windows Phone";
  } else if (/iphone|ipad/i.test(uaLower)) {
    const m = userAgent.match(/os\s(\d+[_\d]*)/i);
    deviceOS = m ? `iOS ${m[1].replace(/_/g, ".")}` : "iOS";
  } else if (/mac os x/i.test(uaLower)) {
    const m = userAgent.match(/mac os x\s(\d+[_\d]*)/i);
    deviceOS = m ? `macOS ${m[1].replace(/_/g, ".")}` : "macOS";
  } else if (/macintosh/i.test(uaLower)) {
    deviceOS = "macOS";
  } else if (/android/i.test(uaLower)) {
    const m = userAgent.match(/android\s([0-9.]+)/i);
    deviceOS = m ? `Android ${m[1]}` : "Android";
  } else if (/cros/i.test(uaLower)) {
    deviceOS = "ChromeOS";
  } else if (/linux/i.test(uaLower)) {
    deviceOS = "Linux";
  }

  // ---------- Browser ----------
  let browser = "Unknown";

  // Brand-specific mobile browsers first (they also contain "Chrome" in UA)
  if (/heytapbrowser/i.test(userAgent)) {
    const m = userAgent.match(/heytapbrowser\/([0-9.]+)/i);
    browser = m ? `HeyTapBrowser ${m[1]}` : "HeyTapBrowser";
  } else if (/samsungbrowser/i.test(uaLower)) {
    const m = userAgent.match(/samsungbrowser\/([0-9.]+)/i);
    browser = m ? `Samsung Internet ${m[1]}` : "Samsung Internet";
  } else if (/miuibrowser/i.test(uaLower)) {
    const m = userAgent.match(/miuibrowser\/([0-9.]+)/i);
    browser = m ? `Mi Browser ${m[1]}` : "Mi Browser";
  } else if (/vivobrowser/i.test(uaLower)) {
    const m = userAgent.match(/vivobrowser\/([0-9.]+)/i);
    browser = m ? `Vivo Browser ${m[1]}` : "Vivo Browser";
  } else if (/huaweibrowser/i.test(uaLower)) {
    const m = userAgent.match(/huaweibrowser\/([0-9.]+)/i);
    browser = m ? `Huawei Browser ${m[1]}` : "Huawei Browser";
  } else if (/oppobrowser/i.test(uaLower)) {
    const m = userAgent.match(/oppobrowser\/([0-9.]+)/i);
    browser = m ? `Oppo Browser ${m[1]}` : "Oppo Browser";
  } else if (/edg/i.test(uaLower)) {
    const m = userAgent.match(/edg\/([0-9.]+)/i);
    browser = m ? `Edge ${m[1]}` : "Edge";
  } else if (/opr|opera/i.test(uaLower)) {
    const m = userAgent.match(/(?:opr|opera)\/([0-9.]+)/i);
    browser = m ? `Opera ${m[1]}` : "Opera";
  } else if (/chrome|crios/i.test(uaLower) && !/chromium/i.test(uaLower)) {
    const m = userAgent.match(/(?:chrome|crios)\/([0-9.]+)/i);
    browser = m ? `Chrome ${m[1]}` : "Chrome";
  } else if (/firefox|fxios/i.test(uaLower)) {
    const m = userAgent.match(/(?:firefox|fxios)\/([0-9.]+)/i);
    browser = m ? `Firefox ${m[1]}` : "Firefox";
  } else if (/safari/i.test(uaLower) && !/chrome/i.test(uaLower)) {
    const m = userAgent.match(/version\/([0-9.]+)/i);
    browser = m ? `Safari ${m[1]}` : "Safari";
  } else if (/trident|msie/i.test(uaLower)) {
    browser = "Internet Explorer";
  }

  return {
    deviceType,
    deviceBrand,
    deviceModel: deviceModel || "",
    deviceOS,
    browser,
    userAgent,
  };
}
