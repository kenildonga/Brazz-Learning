export type AdFlag = 0 | 1;
export type AdCodeType = 1 | 2 | 3;

export interface AdFormats {
  banner: AdFlag;
  native: AdFlag;
  interstitial: AdFlag;
  rewards: AdFlag;
}

export interface AdSettings {
  adCodeType: AdCodeType;
  enabled: boolean;
  googleAds: AdFormats;
  unityAds: AdFormats;
  metaAds: AdFormats;
  updatedAt?: string;
}

const defaultFormats = (): AdFormats => ({
  banner: 1,
  native: 1,
  interstitial: 1,
  rewards: 1,
});

export const defaultAdSettings = (): AdSettings => ({
  adCodeType: 1,
  enabled: true,
  googleAds: defaultFormats(),
  unityAds: defaultFormats(),
  metaAds: defaultFormats(),
});

const BLOCKER_HTML =
  '<div style=text-align:center;padding:16px;font-family:sans-serif;font-size:15px;line-height:1.6;color:#333><p><b>Connection Settings Required</b><p>Please disable <b>Ad Blocker</b>, <b>VPN</b>, or <b>Private DNS</b> to continue using the app.<div style=text-align:left;margin-top:12px><p><b>Follow these steps:</b><ol><li>Turn off any active <b>Ad Blocker</b> app.<li>Disconnect your <b>VPN</b> if it is enabled.<li>Open <b>Settings → Network & Internet → Private DNS</b> and select <b>Automatic</b> or <b>Off</b>, if available.<li>Close and reopen the app.</ol><p style=font-size:13px;color:#666>Menu names may vary depending on your device. If the issue persists, check your network settings and try again.</div></div>';

const asFlag = (value: unknown): AdFlag => (value === 0 || value === false ? 0 : 1);

const asFormats = (value: unknown): AdFormats => {
  const formats = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  return {
    banner: asFlag(formats.banner),
    native: asFlag(formats.native),
    interstitial: asFlag(formats.interstitial),
    rewards: asFlag(formats.rewards),
  };
};

export function normalizeAdSettings(value: unknown): AdSettings {
  const raw = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const adCodeType: AdCodeType = raw.adCodeType === 2 || raw.adCodeType === 3 ? raw.adCodeType : 1;
  const updatedAt = typeof raw.updatedAt === 'string' ? raw.updatedAt : undefined;
  return {
    adCodeType,
    enabled: raw.enabled !== false,
    googleAds: asFormats(raw.googleAds),
    unityAds: asFormats(raw.unityAds),
    metaAds: asFormats(raw.metaAds),
    ...(updatedAt ? { updatedAt } : {}),
  };
}

function envString(name: string, fallback: string) {
  const value = process.env[name];
  return value === undefined || value === '' ? fallback : value;
}

function envInt(name: string, fallback: number) {
  const value = process.env[name];
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function buildAdsConfig(settings: AdSettings) {
  const google = settings.adCodeType === 1;
  const unity = settings.adCodeType === 2;
  const meta = settings.adCodeType === 3;

  return {
    banner_show: envString('ADS_BANNER_SHOW', '2'),
    native_show: envString('ADS_NATIVE_SHOW', '2'),
    interstitial_show: envString('ADS_INTERSTITIAL_SHOW', '2'),
    rewards_show: envString('ADS_REWARDS_SHOW', '2'),
    ad_code_type: settings.adCodeType,
    unity_game_id: unity ? envString('ADS_UNITY_GAME_ID', '800385033') : '',
    nativeadsplace: envInt('ADS_NATIVE_PLACE', 4),
    blockerpopup: envInt('ADS_BLOCKER_POPUP', 1),
    blockerpopup_html: envString('ADS_BLOCKER_HTML', BLOCKER_HTML),
    google_ad_banner: google
      ? envString('ADS_GOOGLE_BANNER', 'ca-app-pub-3940256099942544/6300978111')
      : '',
    google_ad_native: google
      ? envString('ADS_GOOGLE_NATIVE', 'ca-app-pub-3940256099942544/2247696110')
      : '',
    google_ad_interstitial: google
      ? envString('ADS_GOOGLE_INTERSTITIAL', 'ca-app-pub-3940256099942544/1033173712')
      : '',
    facebook_ad_banner: meta
      ? envString('ADS_META_BANNER', 'IMG_16_9_APP_INSTALL#YOUR_PLACEMENT_ID')
      : '',
    facebook_ad_native: meta
      ? envString('ADS_META_NATIVE', 'IMG_16_9_APP_INSTALL#YOUR_PLACEMENT_ID')
      : '',
    facebook_ad_interstitial: meta
      ? envString('ADS_META_INTERSTITIAL', 'IMG_16_9_APP_INSTALL#YOUR_PLACEMENT_ID')
      : '',
    unity_ad_banner: unity ? envString('ADS_UNITY_BANNER', 'BP_Banner_Android') : '',
    unity_ad_native: unity ? envString('ADS_UNITY_NATIVE', 'BP_Banner_Android') : '',
    unity_ad_interstitial: unity
      ? envString('ADS_UNITY_INTERSTITIAL', 'BP_Interstitial_Android')
      : '',
  };
}
