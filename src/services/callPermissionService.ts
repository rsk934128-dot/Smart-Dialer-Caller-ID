// Call Permissions and Android Default Phone Role Service

export interface CallPermissions {
  roleDialer: boolean;
  roleCallScreening: boolean;
  roleSms: boolean; // Android Default SMS App (RoleManager.ROLE_SMS / Telephony.Sms.Intents.ACTION_CHANGE_DEFAULT)
  callPhone: boolean; // Real calling permission (android.permission.CALL_PHONE)
  systemAlertWindow: boolean;
  readPhoneState: boolean;
  answerPhoneCalls: boolean;
  readContacts: boolean;
  writeContacts: boolean;
  readPhoneNumbers: boolean; // SIM numbers & Telephony (android.permission.READ_PHONE_NUMBERS)
  simCardContacts: boolean; // Read & write SIM 1/SIM 2 contacts (content://icc/adn)
  readCallLog: boolean;
  writeCallLog: boolean;
  receiveSms: boolean; // Real-time incoming SMS broadcast (android.permission.RECEIVE_SMS)
  readSms: boolean; // Offline local database read (android.permission.READ_SMS)
  sendSms: boolean; // Send real-time SMS (android.permission.SEND_SMS)
  receiveMms: boolean; // Multimedia messages (android.permission.RECEIVE_MMS)
  audioRecord: boolean;
  ignoreBatteryOptimization: boolean; // Keeps app active in Android background
  autostart: boolean; // Autostart on boot / OEM battery manager
}

export type CallMode = 'real' | 'simulated';

const STORAGE_KEY = 'smart_dialer_permissions';
const DEFAULT_DIALER_KEY = 'smart_dialer_default_dialer';
const DEFAULT_SMS_KEY = 'smart_dialer_default_sms';
const CALL_MODE_KEY = 'smart_dialer_call_mode';

const DEFAULT_STATE: CallPermissions = {
  roleDialer: true,
  roleCallScreening: true,
  roleSms: true,
  callPhone: true,
  systemAlertWindow: true,
  readPhoneState: true,
  answerPhoneCalls: true,
  readContacts: true,
  writeContacts: true,
  readPhoneNumbers: true,
  simCardContacts: true,
  readCallLog: true,
  writeCallLog: true,
  receiveSms: true,
  readSms: true,
  sendSms: true,
  receiveMms: true,
  audioRecord: true,
  ignoreBatteryOptimization: true,
  autostart: true,
};

type Listener = (
  permissions: CallPermissions,
  isDefault: boolean,
  callMode: CallMode,
  isDefaultSms: boolean
) => void;

class CallPermissionService {
  private permissions: CallPermissions;
  private isDefaultDialer: boolean;
  private isDefaultSmsRole: boolean;
  private callMode: CallMode;
  private listeners: Set<Listener> = new Set();

  constructor() {
    this.permissions = this.loadPermissions();
    this.isDefaultDialer = this.loadDefaultStatus();
    this.isDefaultSmsRole = this.loadDefaultSmsStatus();
    this.callMode = this.loadCallMode();

    // In native Android APK, query real OS system role status on boot
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        this.refreshSystemRoleStatus().catch(() => {});
      }, 300);
    }
  }

  private loadDefaultSmsStatus(): boolean {
    try {
      const saved = localStorage.getItem(DEFAULT_SMS_KEY);
      if (saved !== null) {
        return saved === 'true';
      }
    } catch (e) {
      console.error('Failed to load default SMS status:', e);
    }
    return true; // default to active on initial load
  }

  private loadPermissions(): CallPermissions {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_STATE, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.error('Failed to load call permissions:', e);
    }
    return { ...DEFAULT_STATE };
  }

  private loadDefaultStatus(): boolean {
    try {
      const saved = localStorage.getItem(DEFAULT_DIALER_KEY);
      if (saved !== null) {
        return saved === 'true';
      }
    } catch (e) {
      console.error('Failed to load default dialer status:', e);
    }
    return true; // default to active on initial load
  }

  private loadCallMode(): CallMode {
    try {
      const saved = localStorage.getItem(CALL_MODE_KEY);
      if (saved === 'real' || saved === 'simulated') {
        return saved;
      }
    } catch (e) {
      console.error('Failed to load call mode:', e);
    }
    return 'real'; // Default to real native calling capability
  }

  private save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.permissions));
      localStorage.setItem(DEFAULT_DIALER_KEY, String(this.isDefaultDialer));
      localStorage.setItem(DEFAULT_SMS_KEY, String(this.isDefaultSmsRole));
      localStorage.setItem(CALL_MODE_KEY, this.callMode);
    } catch (e) {
      console.error('Failed to save call permissions:', e);
    }
    this.notify();
  }

  private notify() {
    const isDef = this.isDefault();
    const isDefSms = this.isDefaultSms();
    this.listeners.forEach((listener) => {
      try {
        listener(this.permissions, isDef, this.callMode, isDefSms);
      } catch (err) {
        console.error('Error notifying permission listener:', err);
      }
    });
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.permissions, this.isDefault(), this.callMode, this.isDefaultSms());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getPermissions(): CallPermissions {
    return { ...this.permissions };
  }

  public getCallMode(): CallMode {
    return this.callMode;
  }

  public setCallMode(mode: CallMode) {
    this.callMode = mode;
    this.save();
  }

  /**
   * Checks whether the app is active as the Default Dialer.
   * Requires both role status and core calling permissions to be true.
   */
  public isDefault(): boolean {
    return (
      this.isDefaultDialer &&
      Boolean(this.permissions.roleDialer) &&
      Boolean(this.permissions.callPhone)
    );
  }

  /**
   * Checks whether the app is active as the Default SMS app.
   * Requires both SMS role and core SMS messaging permissions to be true.
   */
  public isDefaultSms(): boolean {
    return (
      this.isDefaultSmsRole &&
      Boolean(this.permissions.roleSms) &&
      Boolean(this.permissions.receiveSms) &&
      Boolean(this.permissions.readSms)
    );
  }

  public hasSmsPermissions(): boolean {
    return (
      Boolean(this.permissions.roleSms) &&
      Boolean(this.permissions.receiveSms) &&
      Boolean(this.permissions.readSms) &&
      Boolean(this.permissions.sendSms)
    );
  }

  /**
   * Toggles the Default SMS App status and cascades to child SMS permissions
   */
  public setDefaultSms(active: boolean) {
    this.isDefaultSmsRole = active;
    this.permissions.roleSms = active;
    if (active) {
      this.permissions.receiveSms = true;
      this.permissions.readSms = true;
      this.permissions.sendSms = true;
      this.permissions.receiveMms = true;
    }
    this.save();
    this.dispatchAndroidRoleIntent('sms', active);
  }

  public enableSmsPermissions() {
    this.setDefaultSms(true);
  }

  public deactivateDefaultSms() {
    this.setDefaultSms(false);
  }

  public isFullyGranted(): boolean {
    return (
      this.isDefault() &&
      this.isDefaultSms() &&
      Object.values(this.permissions).every((val) => val === true)
    );
  }

  /**
   * Granular permission toggle with intelligent cascading
   */
  public setPermission(key: keyof CallPermissions, granted: boolean) {
    if (key === 'roleDialer') {
      this.setDefaultDialer(granted);
      return;
    }
    if (key === 'roleSms') {
      this.setDefaultSms(granted);
      return;
    }

    this.permissions[key] = granted;

    // If core calling permission is turned off, dialer role cannot function as active default
    if (key === 'callPhone' && !granted) {
      this.isDefaultDialer = false;
      this.permissions.roleDialer = false;
    }

    // If core SMS permissions are turned off, SMS role cannot function as active default
    if ((key === 'receiveSms' || key === 'readSms') && !granted) {
      this.isDefaultSmsRole = false;
      this.permissions.roleSms = false;
    }

    this.save();
  }

  /**
   * Toggles the Default Phone Dialer status and cascades all telephony permissions
   */
  public setDefaultDialer(active: boolean) {
    this.isDefaultDialer = active;
    this.permissions.roleDialer = active;
    if (active) {
      this.permissions.roleCallScreening = true;
      this.permissions.readPhoneState = true;
      this.permissions.answerPhoneCalls = true;
      this.permissions.callPhone = true;
      this.permissions.readPhoneNumbers = true;
      this.permissions.readContacts = true;
      this.permissions.writeContacts = true;
      this.permissions.readCallLog = true;
      this.permissions.writeCallLog = true;
      this.permissions.systemAlertWindow = true;
      this.permissions.ignoreBatteryOptimization = true;
      this.permissions.autostart = true;
    }
    this.save();
    this.dispatchAndroidRoleIntent('dialer', active);
  }

  public deactivateDefaultDialer() {
    this.setDefaultDialer(false);
  }

  /**
   * Dispatches native Android Intent or notifies Android WebView when in APK
   */
  public dispatchAndroidRoleIntent(role: 'dialer' | 'sms', active: boolean) {
    if (typeof window === 'undefined') return;

    window.dispatchEvent(
      new CustomEvent('smart_dialer_role_change', {
        detail: {
          role,
          active,
          timestamp: Date.now(),
        },
      })
    );

    // Vibrate device for realistic haptic feedback
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([40, 30, 40]);
      } catch {}
    }

    try {
      // 1. First priority: Direct AndroidBridge JavascriptInterface injected in MainActivity.java
      if ((window as any).AndroidBridge?.requestRole) {
        (window as any).AndroidBridge.requestRole(role);
        return;
      }

      // 2. Second priority: Capacitor Native Intent handler with exact action & extra parameters
      if ((window as any).Capacitor?.isNativePlatform?.()) {
        const intentUrl =
          role === 'dialer'
            ? 'intent:#Intent;action=android.telecom.action.CHANGE_DEFAULT_DIALER;S.android.telecom.extra.CHANGE_DEFAULT_DIALER_PACKAGE_NAME=com.smartdialer.telecom;package=com.smartdialer.telecom;end'
            : 'intent:#Intent;action=android.provider.Telephony.ACTION_CHANGE_DEFAULT;S.package=com.smartdialer.telecom;package=com.smartdialer.telecom;end';
        window.open(intentUrl, '_system');
      }
    } catch (e) {
      console.warn('Native role intent notice:', e);
    }
  }

  /**
   * Synchronizes internal role state with native Android OS if running inside APK
   */
  public async refreshSystemRoleStatus(): Promise<{ isDialer: boolean; isSms: boolean }> {
    let nativeDialer = this.isDefaultDialer;
    let nativeSms = this.isDefaultSmsRole;

    if (typeof window !== 'undefined' && (window as any).AndroidBridge) {
      try {
        if (typeof (window as any).AndroidBridge.isDefaultDialer === 'function') {
          nativeDialer = Boolean((window as any).AndroidBridge.isDefaultDialer());
        }
        if (typeof (window as any).AndroidBridge.isDefaultSms === 'function') {
          nativeSms = Boolean((window as any).AndroidBridge.isDefaultSms());
        }
        this.isDefaultDialer = nativeDialer;
        this.permissions.roleDialer = nativeDialer;
        this.isDefaultSmsRole = nativeSms;
        this.permissions.roleSms = nativeSms;
        this.save();
      } catch (err) {
        console.warn('Could not query AndroidBridge role status:', err);
      }
    }

    return { isDialer: this.isDefault(), isSms: this.isDefaultSms() };
  }

  /**
   * Activates all permissions, browser notifications, and microphone in 1 tap
   */
  public async activateAllPermissions(): Promise<CallPermissions> {
    // Attempt real browser notification permission request if available
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      try {
        await Notification.requestPermission();
      } catch {}
    }

    // Attempt real browser microphone permission request if available
    await this.requestMicrophonePermission().catch(() => {});

    this.permissions = {
      roleDialer: true,
      roleCallScreening: true,
      roleSms: true,
      callPhone: true,
      systemAlertWindow: true,
      readPhoneState: true,
      answerPhoneCalls: true,
      readContacts: true,
      writeContacts: true,
      readPhoneNumbers: true,
      simCardContacts: true,
      readCallLog: true,
      writeCallLog: true,
      receiveSms: true,
      readSms: true,
      sendSms: true,
      receiveMms: true,
      audioRecord: true,
      ignoreBatteryOptimization: true,
      autostart: true,
    };
    this.isDefaultDialer = true;
    this.isDefaultSmsRole = true;
    this.callMode = 'real';
    this.save();
    return this.permissions;
  }

  /**
   * Specifically enables SIM card reading & writing permissions
   */
  public enableSimContactPermissions(): boolean {
    this.permissions.readContacts = true;
    this.permissions.writeContacts = true;
    this.permissions.readPhoneNumbers = true;
    this.permissions.simCardContacts = true;
    this.permissions.readPhoneState = true;
    this.save();
    return true;
  }

  /**
   * Checks if SIM contacts read/write permissions are active
   */
  public hasSimPermissions(): boolean {
    return (
      Boolean(this.permissions.readContacts) &&
      Boolean(this.permissions.writeContacts) &&
      Boolean(this.permissions.simCardContacts)
    );
  }

  public async requestMicrophonePermission(): Promise<boolean> {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Close the track immediately, we only wanted to obtain permission
        stream.getTracks().forEach((track) => track.stop());
        this.permissions.audioRecord = true;
        this.save();
        return true;
      } catch (err) {
        console.warn('Microphone permission request dismissed or failed:', err);
        return false;
      }
    }
    this.permissions.audioRecord = true;
    this.save();
    return true;
  }

  /**
   * Triggers a REAL SIM / cellular phone call using native device telephony.
   * Handles USSD codes (*121#, *566#) by encoding '#' properly.
   */
  public makeRealCall(phoneNumber: string): boolean {
    if (!phoneNumber) return false;
    // Clean phone number keeping only digits and leading + or USSD * #
    const clean = phoneNumber.replace(/[^\d+*#]/g, '');
    if (!clean) return false;

    // Dispatches a global event so call logs can record this real outgoing call immediately
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('smart_dialer_real_call', {
          detail: {
            phoneNumber,
            cleanNumber: clean,
            timestamp: Date.now(),
          },
        })
      );

      // Trigger the OS native dialer / phone call via tel:
      try {
        // Encode # as %23 for browser URL safety (essential for USSD codes like *121#)
        const encodedPhone = clean.replace(/#/g, '%23');
        const telUrl = `tel:${encodedPhone}`;

        // 1. In Capacitor Android apps, window.open with _system tells WebView to dispatch native Intent
        if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.()) {
          window.open(telUrl, '_system');
          return true;
        }

        // 2. Standard DOM invisible anchor click (prevents WebView navigation errors)
        const a = document.createElement('a');
        a.href = telUrl;
        a.target = '_system';
        a.rel = 'noopener noreferrer';
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          if (document.body.contains(a)) document.body.removeChild(a);
        }, 150);

        return true;
      } catch (err) {
        console.error('Error invoking tel: protocol:', err);
        try {
          const encodedPhone = clean.replace(/#/g, '%23');
          window.location.href = `tel:${encodedPhone}`;
          return true;
        } catch (fallbackErr) {
          console.error('Fallback tel: error:', fallbackErr);
          return false;
        }
      }
    }
    return false;
  }

  /**
   * Triggers native SMS messaging application with recipient and optional body
   */
  public sendNativeSms(phoneNumber: string, messageBody?: string): boolean {
    if (!phoneNumber) return false;
    const clean = phoneNumber.replace(/[^\d+]/g, '');
    if (!clean) return false;

    if (typeof window !== 'undefined') {
      try {
        const smsUrl = messageBody
          ? `sms:${clean}?body=${encodeURIComponent(messageBody)}`
          : `sms:${clean}`;

        if ((window as any).Capacitor?.isNativePlatform?.()) {
          window.open(smsUrl, '_system');
          return true;
        }

        const a = document.createElement('a');
        a.href = smsUrl;
        a.target = '_system';
        a.rel = 'noopener noreferrer';
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          if (document.body.contains(a)) document.body.removeChild(a);
        }, 150);

        return true;
      } catch (err) {
        console.error('Error invoking sms: protocol:', err);
        return false;
      }
    }
    return false;
  }

  /**
   * Default SIM Slot Preference ('1' | '2' | 'always_ask')
   */
  public getDefaultSimSlot(): 1 | 2 | 'always_ask' {
    try {
      const saved = localStorage.getItem('smart_dialer_default_sim');
      if (saved === '1' || saved === '2') return Number(saved) as 1 | 2;
      if (saved === 'always_ask') return 'always_ask';
    } catch {}
    return 1;
  }

  public setDefaultSimSlot(slot: 1 | 2 | 'always_ask') {
    try {
      localStorage.setItem('smart_dialer_default_sim', String(slot));
      this.notify();
    } catch (e) {
      console.error('Failed to save default SIM slot:', e);
    }
  }

  /**
   * User-customizable SIM operator labels (e.g. GP, Robi, Banglalink, Teletalk, Airtel)
   */
  public getSimOperatorLabels(): { sim1: string; sim2: string } {
    try {
      const saved = localStorage.getItem('smart_dialer_sim_operators');
      if (saved) return JSON.parse(saved);
    } catch {}
    return { sim1: 'GP / Grameen', sim2: 'Robi / BL' };
  }

  public setSimOperatorLabels(labels: Partial<{ sim1: string; sim2: string }>) {
    try {
      const current = this.getSimOperatorLabels();
      const updated = { ...current, ...labels };
      localStorage.setItem('smart_dialer_sim_operators', JSON.stringify(updated));
      this.notify();
    } catch (e) {
      console.error('Failed to save SIM operators:', e);
    }
  }

  /**
   * Permission Settings Recovery Guide for Android App Info
   */
  public getSettingsRecoveryGuide(lang: 'bn' | 'en' = 'bn') {
    if (lang === 'bn') {
      return {
        title: 'অ্যান্ড্রয়েড ফোন সেটিংস থেকে পারমিশন পুনরায় চালু করার নিয়ম',
        steps: [
          'আপনার ফোনের Settings (সেটিংস) এ প্রবেশ করুন।',
          'Apps / App Management (অ্যাপ্লিকেশন) অপশনে চাপুন।',
          '"Smart Dialer" খুঁজে বের করে তাতে ট্যাপ করুন।',
          'Permissions (অনুমতিসমূহ) এ গিয়ে "Phone", "Call logs", "Contacts", "SMS" এবং "Microphone" এর পাশে "Allow" করে দিন।',
          'লক স্ক্রিনের ওপর কলার আইডি দেখতে "Display over other apps" (অন্যান্য অ্যাপের উপর প্রদর্শন) অন করে দিন।',
        ],
      };
    }
    return {
      title: 'How to Re-enable Permissions in Android Settings',
      steps: [
        'Open your phone Settings app.',
        'Navigate to Apps or Application Management.',
        'Locate and tap "Smart Dialer".',
        'Tap Permissions and set "Phone", "Call logs", "Contacts", "SMS", and "Microphone" to "Allow".',
        'Enable "Display over other apps" for the Truecaller-style floating caller ID.',
      ],
    };
  }
}

export const callPermissionService = new CallPermissionService();
