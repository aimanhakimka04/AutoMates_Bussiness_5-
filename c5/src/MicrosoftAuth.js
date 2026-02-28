// ══════════════════════════════════════════════════════════════════
//  MicrosoftAuth.js  —  Dual-platform Microsoft login
// ══════════════════════════════════════════════════════════════════

// ── CONFIG ────────────────────────────────────────────────────────
const CLIENT_ID    = "c21063b3-e6df-4a0e-980a-eb69cb6bdd01";
const AUTHORITY    = "https://login.microsoftonline.com/common";
const REDIRECT_APK = "msauth://com.chinhin.connect/callback";
const REDIRECT_WEB = "http://localhost:3000/login";
const SCOPES       = ["openid", "profile", "email"];

// ── MOBILE DETECTION ─────────────────────────────────────────────
export const isMobile = () => {
  if (process.env.REACT_APP_PLATFORM === "mobile") return true;
  try { if (window.Capacitor?.isNative === true) return true; } catch (_) {}
  try { if (window.Capacitor?.isNativePlatform?.()) return true; } catch (_) {}
  if (/android/i.test(navigator.userAgent) && !window.location.href.startsWith("http://localhost")) return true;
  return false;
};

export const IS_MOBILE = isMobile();

// ── WEB — MSAL (dynamic import — never loads on Android) ─────────
let _msalInstance = null;
let _msalReady    = false;

const getMsal = async () => {
  if (isMobile()) return null;
  if (_msalInstance) return _msalInstance;
  const { PublicClientApplication } = await import("@azure/msal-browser");
  _msalInstance = new PublicClientApplication({
    auth: {
      clientId:                  CLIENT_ID,
      authority:                 AUTHORITY,
      redirectUri:               REDIRECT_WEB,
      postLogoutRedirectUri:     REDIRECT_WEB,
      navigateToLoginRequestUrl: false,
    },
    cache: { cacheLocation: "sessionStorage", storeAuthStateInCookie: true },
    system: { allowNativeBroker: false },
  });
  if (!_msalReady) { await _msalInstance.initialize(); _msalReady = true; }
  return _msalInstance;
};

export let msalInstance = null;
export const ensureMsal = async () => { msalInstance = await getMsal(); };

export const handleWebRedirect = async () => {
  if (isMobile()) return null;
  const msal = await getMsal();
  if (!msal) return null;
  try {
    return await msal.handleRedirectPromise();
  } catch (err) {
    console.warn("[Auth] Clearing stale MSAL state:", err.message);
    Object.keys(sessionStorage).filter(k => k.startsWith("msal.")).forEach(k => sessionStorage.removeItem(k));
    return null;
  }
};

export const webLogin = async () => {
  const msal = await getMsal();
  if (!msal) throw new Error("MSAL not available");
  await msal.loginRedirect({ scopes: SCOPES, prompt: "select_account" });
};

export const getWebAccounts = async () => {
  const msal = await getMsal();
  return msal ? msal.getAllAccounts() : [];
};

// ── MOBILE — session helpers ──────────────────────────────────────
export const mobileLogout     = () => sessionStorage.removeItem("flexhr_user");
export const getMobileSession = () => {
  try { const s = sessionStorage.getItem("flexhr_user"); return s ? JSON.parse(s) : null; }
  catch { return null; }
};

// ── PKCE ─────────────────────────────────────────────────────────
const genVerifier = () => {
  const a = new Uint8Array(64);
  crypto.getRandomValues(a);
  return btoa(String.fromCharCode(...a)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
};
const genChallenge = async (v) => {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v));
  return btoa(String.fromCharCode(...new Uint8Array(d))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
};

// ── Token exchange via CapacitorHttp (native layer, no Origin header) ──
//
// WHY: fetch() inside a Capacitor WebView automatically adds an
// "Origin" header. Microsoft treats this as a cross-origin web
// request and rejects it with AADSTS90023. CapacitorHttp routes
// the request through native Android code, so no Origin header
// is added and Microsoft accepts it as a native app request.
const exchangeCodeForToken = async (code, verifier) => {
  const { CapacitorHttp } = await import("@capacitor/core");

  const body = new URLSearchParams({
    client_id:     CLIENT_ID,
    grant_type:    "authorization_code",
    code,
    redirect_uri:  REDIRECT_APK,
    scope:         SCOPES.join(" "),
    code_verifier: verifier,
  }).toString();

  const response = await CapacitorHttp.post({
    url:     `${AUTHORITY}/oauth2/v2.0/token`,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    data:    body,
  });

  // CapacitorHttp returns response.data (already parsed if JSON)
  return typeof response.data === "string" ? JSON.parse(response.data) : response.data;
};

// ── doLogin — Capacitor Browser OAuth2 + PKCE ────────────────────
export const doLogin = (onSuccess, onError) => {
  const mobile = isMobile();
  console.log("[Auth] doLogin | isMobile:", mobile);

  if (!mobile) {
    onError("isMobile() is false — check .env.production has REACT_APP_PLATFORM=mobile and rebuild.");
    return;
  }

  (async () => {
    let Browser, App;
    try {
      [{ Browser }, { App }] = await Promise.all([
        import("@capacitor/browser"),
        import("@capacitor/app"),
      ]);
    } catch (err) { onError("Capacitor import: " + err.message); return; }

    const verifier  = genVerifier();
    const challenge = await genChallenge(verifier);
    const state     = Math.random().toString(36).slice(2);

    const authUrl =
      `${AUTHORITY}/oauth2/v2.0/authorize` +
      `?client_id=${CLIENT_ID}` +
      `&response_type=code` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_APK)}` +
      `&scope=${encodeURIComponent(SCOPES.join(" "))}` +
      `&state=${state}` +
      `&code_challenge=${challenge}` +
      `&code_challenge_method=S256` +
      `&prompt=select_account`;

    // MUST await — Capacitor v4+ returns Promise<PluginListenerHandle>
    let handle;
    try {
      handle = await App.addListener("appUrlOpen", async ({ url }) => {
        if (!url.startsWith(REDIRECT_APK)) return;
        try { await Browser.close(); } catch (_) {}
        try { handle.remove();       } catch (_) {}

        const p     = new URLSearchParams(url.split("?")[1]);
        const code  = p.get("code");
        const error = p.get("error");
        if (error) { onError(error); return; }
        if (!code)  { onError("No auth code returned"); return; }

        try {
          // Use native HTTP to avoid CORS Origin header rejection (AADSTS90023)
          const data = await exchangeCodeForToken(code, verifier);
          console.log("[Auth] token response keys:", Object.keys(data));

          if (data.access_token) {
            const pl   = JSON.parse(atob(data.id_token.split(".")[1]));
            const info = {
              name:  pl.name  || pl.preferred_username,
              email: pl.preferred_username || pl.email,
            };
            sessionStorage.setItem("flexhr_user", JSON.stringify(info));
            onSuccess(info);
          } else {
            onError(data.error_description || data.error || "Token exchange failed");
          }
        } catch (e) { onError("Token exchange: " + e.message); }
      });
    } catch (e) { onError("addListener: " + e.message); return; }

    try { await Browser.open({ url: authUrl }); }
    catch (e) { onError("Browser.open: " + e.message); }
  })();
};