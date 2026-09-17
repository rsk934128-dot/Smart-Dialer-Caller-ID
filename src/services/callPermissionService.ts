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

type Listener = (permissions: CallPermissions, isDefault: boolean, callMode: CallMode) => void;

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
    this.listeners.forEach((listener) => {
      try {
        listener(this.permissions, this.isDefaultDialer, this.callMode);
      } catch (err) {
        console.error('Error notifying permission listener:', err);
      }
    });
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.permissions, this.isDefaultDialer, this.callMode);
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

  public isDefault(): boolean {
    return this.isDefaultDialer && this.permissions.roleDialer;
  }

  public isDefaultSms(): boolean {
    return this.isDefaultSmsRole && this.permissions.roleSms;
  }

  public hasSmsPermissions(): boolean {
    return (
      this.permissions.roleSms &&
      this.permissions.receiveSms &&
      this.permissions.readSms &&
      this.permissions.sendSms
    );
  }

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
  }

  public enableSmsPermissions() {
    this.isDefaultSmsRole = true;
    this.permissions.roleSms = true;
    this.permissions.receiveSms = true;
    this.permissions.readSms = true;
    this.permissions.sendSms = true;
    this.permissions.receiveMms = true;
    this.save();
  }

  public isFullyGranted(): boolean {
    return (
      this.isDefaultDialer &&
      Object.values(this.permissions).every((val) => val === true)
    );
  }

  public setPermission(key: keyof CallPermissions, granted: boolean) {
    this.permissions[key] = granted;
    if (key === 'roleDialer') {
      this.isDefaultDialer = granted;
    }
    if (key === 'roleSms') {
      this.isDefaultSmsRole = granted;
    }
    this.save();
  }

  public setDefaultDialer(active: boolean) {
    this.isDefaultDialer = active;
    this.permissions.roleDialer = active;
    if (active) {
      this.permissions.roleCallScreening = true;
      this.permissions.readPhoneState = true;
      this.permissions.answerPhoneCalls = true;
      this.permissions.callPhone = true;
      this.permissions.ignoreBatteryOptimization = true;
      this.permissions.autostart = true;
    }
    this.save();
  }

  public async activateAllPermissions(): Promise<CallPermissions> {
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
      this.permissions.readContacts &&
      this.permissions.writeContacts &&
      this.permissions.simCardContacts
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

  public deactivateDefaultDialer() {
    this.isDefaultDialer = false;
    this.permissions.roleDialer = false;
    this.save();
  }

  /**
   * Triggers a REAL SIM / cellular phone call using native device telephony
   */
  public makeRealCall(phoneNumber: string): boolean {
    if (!phoneNumber) return false;
    // Clean phone number keeping only digits and leading +
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
        const telUrl = `tel:${encodeURIComponent(clean)}`;
        window.location.href = telUrl;
        return true;
      } catch (err) {
        console.error('Error invoking tel: protocol:', err);
        return false;
      }
    }
    return false;
  }
}

export const callPermissionService = new CallPermissionService();
