import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  ShieldCheck,
  ShieldAlert,
  Check,
  Copy,
  Terminal,
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Database,
  Zap,
  Download,
  RefreshCw,
  Layers,
  Activity,
} from 'lucide-react';
import { Language, TRANSLATIONS } from '../utils/i18n';
import { CallerIdRecord, RoomDbMetrics } from '../types';
import { roomDbService } from '../db/roomDatabaseService';

interface AndroidGuideProps {
  lang: Language;
  onSimulateIncoming?: (caller: CallerIdRecord, mode?: 'fullscreen' | 'overlay') => void;
}

export const AndroidGuide: React.FC<AndroidGuideProps> = ({ lang, onSimulateIncoming }) => {
  const t = TRANSLATIONS[lang];
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    'permissions_simulator' | 'manifest' | 'runtime_permissions' | 'rolemanager' | 'incallservice' | 'callerid_overlay' | 'callstate_receiver' | 'room_database' | 'architecture' | 'pwabuilder'
  >('permissions_simulator');

  // Simulator state for Android permissions
  const [grantedPermissions, setGrantedPermissions] = useState<Record<string, boolean>>({
    CALL_PHONE: true,
    READ_CONTACTS: true,
    WRITE_CONTACTS: false,
    READ_CALL_LOG: true,
    WRITE_CALL_LOG: false,
    READ_PHONE_STATE: true,
    ANSWER_PHONE_CALLS: false,
    SYSTEM_ALERT_WINDOW: true,
  });

  const [isDefaultDialerRole, setIsDefaultDialerRole] = useState<boolean>(false);
  const [showRoleDialog, setShowRoleDialog] = useState<boolean>(false);
  const [showRuntimePermissionDialog, setShowRuntimePermissionDialog] = useState<boolean>(false);
  const [dialogPermissionIndex, setDialogPermissionIndex] = useState<number>(0);

  // Room Database state (Dexie.js Service Layer)
  const [dbMetrics, setDbMetrics] = useState<RoomDbMetrics | null>(null);
  const [roomTestStatus, setRoomTestStatus] = useState<string | null>(null);
  const [isTestingRoom, setIsTestingRoom] = useState<boolean>(false);
  const [isResettingDb, setIsResettingDb] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    async function loadMetrics() {
      const metrics = await roomDbService.getMetrics();
      if (isMounted) setDbMetrics(metrics);
    }
    loadMetrics();

    const unsubscribe = roomDbService.subscribe(async () => {
      if (!isMounted) return;
      const metrics = await roomDbService.getMetrics();
      setDbMetrics(metrics);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const handleRunRoomCoroutinesTest = async () => {
    setIsTestingRoom(true);
    setRoomTestStatus('Dispatchers.IO ব্যাকগ্রাউন্ড থ্রেড সিমুলেট করা হচ্ছে...');

    const start = performance.now();
    const [contact, spam, caller] = await Promise.all([
      roomDbService.contacts.getByPhone('+880 1711-234567'),
      roomDbService.spam.getByPhone('+880 1300-998811'),
      roomDbService.callerId.getByPhone('+880 1855-123456'),
    ]);
    const duration = (performance.now() - start).toFixed(2);

    setRoomTestStatus(
      `⚡ ৩টি সমান্তরাল কুয়েরি সম্পন্ন: Contact (${contact?.name || 'তানভীর'}), Spam (${spam?.name || 'লটারি স্ক্যাম'}), Caller (${caller?.name || 'ফুডপ্যান্ডা'}) - সময় লেগেছে মাত্র ${duration}ms!`
    );
    setIsTestingRoom(false);
  };

  const handleExportJson = async () => {
    const jsonString = await roomDbService.exportDatabaseJson();
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SmartDialer_Room_DB_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleResetRoomDb = async () => {
    if (window.confirm('আপনি কি রুম ডেটাবেজ রিসেট করে ডিফল্ট ডেটা সিড করতে চান?')) {
      setIsResettingDb(true);
      const metrics = await roomDbService.resetToDefaults();
      setDbMetrics(metrics);
      setRoomTestStatus('রুম ডেটাবেজ সফলভাবে ফ্যাক্টরি রিসেট ও সিড করা হয়েছে!');
      setIsResettingDb(false);
    }
  };

  const runtimeRequestsList = [
    {
      key: 'CALL_PHONE',
      name: 'সরাসরি ফোন কল করার অনুমতি',
      subtext: 'Allow Smart Dialer to make and manage phone calls?',
      permission: 'android.permission.CALL_PHONE',
    },
    {
      key: 'READ_CONTACTS',
      name: 'ফোনের কন্টাক্ট দেখার অনুমতি',
      subtext: 'Allow Smart Dialer to access your contacts?',
      permission: 'android.permission.READ_CONTACTS',
    },
    {
      key: 'READ_CALL_LOG',
      name: 'কল হিস্ট্রি বা লগ পড়ার অনুমতি',
      subtext: 'Allow Smart Dialer to access your phone call logs?',
      permission: 'android.permission.READ_CALL_LOG',
    },
  ];

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleGrantRuntime = (grant: boolean) => {
    const current = runtimeRequestsList[dialogPermissionIndex];
    if (current) {
      setGrantedPermissions((prev) => ({
        ...prev,
        [current.key]: grant,
      }));
    }

    if (dialogPermissionIndex < runtimeRequestsList.length - 1) {
      setDialogPermissionIndex((prev) => prev + 1);
    } else {
      setShowRuntimePermissionDialog(false);
      setDialogPermissionIndex(0);
    }
  };

  const codeManifest = `<!-- AndroidManifest.xml -->
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.example.smartcaller">

    <!-- কন্টাক্ট পড়া ও লেখার জন্য -->
    <uses-permission android:name="android.permission.READ_CONTACTS" />
    <uses-permission android:name="android.permission.WRITE_CONTACTS" />

    <!-- সরাসরি কল করার জন্য -->
    <uses-permission android:name="android.permission.CALL_PHONE" />

    <!-- কল লগ বা হিস্ট্রি দেখার ও লেখার জন্য -->
    <uses-permission android:name="android.permission.READ_CALL_LOG" />
    <uses-permission android:name="android.permission.WRITE_CALL_LOG" />

    <!-- ফোন স্টেট বা কল রিসিভ/কাটার অবস্থা ট্র্যাক করার জন্য -->
    <uses-permission android:name="android.permission.READ_PHONE_STATE" />
    <uses-permission android:name="android.permission.ANSWER_PHONE_CALLS" />

    <!-- কলার আইডি পপ-আপ বা ওভারলে দেখানোর জন্য (Android 10+) -->
    <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />
    <uses-permission android:name="android.permission.INTERNET" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="Smart Dialer"
        android:theme="@style/Theme.SmartCaller">

        <!-- 1. Dial Activity to handle tel: links and Dialer Role -->
        <activity
            android:name=".ui.DialerActivity"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.DIAL" />
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <data android:scheme="tel" />
            </intent-filter>
        </activity>

        <!-- 2. Crucial InCallService for Default Phone App -->
        <service
            android:name=".telecom.CallService"
            android:permission="android.permission.BIND_INCALL_SERVICE"
            android:exported="true">
            <meta-data
                android:name="android.telecom.IN_CALL_SERVICE_UI"
                android:value="true" />
            <intent-filter>
                <action android:name="android.telecom.InCallService" />
            </intent-filter>
        </service>
    </application>
</manifest>`;

  const codeRuntimePermissions = `// MainActivity.kt বা DialerActivity.kt
import android.Manifest
import android.content.pm.PackageManager
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

// চেক করা যে পারমিশন দেওয়া আছে কি না
if (ContextCompat.checkSelfPermission(this, Manifest.permission.CALL_PHONE) != PackageManager.PERMISSION_GRANTED) {
    // পারমিশন না থাকলে ইউজারের কাছে চাওয়া
    ActivityCompat.requestPermissions(
        this,
        arrayOf(
            Manifest.permission.CALL_PHONE,
            Manifest.permission.READ_CONTACTS,
            Manifest.permission.READ_CALL_LOG
        ),
        101
    )
}

// পারমিশন রেসপন্স হ্যান্ডলার (Callback)
override fun onRequestPermissionsResult(
    requestCode: Int,
    permissions: Array<out String>,
    grantResults: IntArray
) {
    super.onRequestPermissionsResult(requestCode, permissions, grantResults)
    if (requestCode == 101) {
        if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
            // কল করার পারমিশন পাওয়া গেছে, কল ডায়াল করুন
        } else {
            // পারমিশন না পেলে ইউজারকে কারণ বুঝিয়ে অ্যালার্ট দিন
        }
    }
}`;

  const codeRoleManager = `// RoleManagerHelper.kt (Android 10+ API 29)
import android.app.role.RoleManager
import android.content.Intent
import android.os.Build

fun requestDefaultDialer() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        val roleManager = getSystemService(RoleManager::class.java)
        if (roleManager != null && !roleManager.isRoleHeld(RoleManager.ROLE_DIALER)) {
            val intent = roleManager.createRequestRoleIntent(RoleManager.ROLE_DIALER)
            startActivityForResult(intent, 201) // এটি ইউজারের কাছে কনফার্মেশন পপ-আপ নিয়ে যাবে
        }
    } else {
        // Android 9 ও তার পূর্বের ভার্সনের জন্য
        val intent = Intent(android.telecom.TelecomManager.ACTION_CHANGE_DEFAULT_DIALER).apply {
            putExtra(android.telecom.TelecomManager.EXTRA_CHANGE_DEFAULT_DIALER_PACKAGE_NAME, packageName)
        }
        startActivity(intent)
    }
}`;

  const codeInCallService = `// CallService.kt (Telecom InCallService)
package com.example.smartcaller.telecom

import android.telecom.Call
import android.telecom.InCallService
import android.content.Intent
import com.example.smartcaller.ui.InCallActivity

class CallService : InCallService() {

    override fun onCallAdded(call: Call) {
        super.onCallAdded(call)
        
        // Pass the call object to our singleton or CallManager
        CallManager.currentCall = call

        // Listen for state changes (RINGING, ACTIVE, DISCONNECTED)
        call.registerCallback(object : Call.Callback() {
            override fun onStateChanged(call: Call, state: Int) {
                super.onStateChanged(call, state)
                when (state) {
                    Call.STATE_DISCONNECTED -> CallManager.onCallEnded()
                    Call.STATE_ACTIVE -> CallManager.onCallConnected()
                }
            }
        })

        // Launch full-screen in-call UI
        val intent = Intent(this, InCallActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        startActivity(intent)
    }

    override fun onCallRemoved(call: Call) {
        super.onCallRemoved(call)
        CallManager.currentCall = null
    }
}`;

  const codeCallerIdOverlay = `// CallerIdOverlayService.kt (Truecaller-style floating popup with SYSTEM_ALERT_WINDOW)
package com.example.smartcaller.overlay

import android.app.*
import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.os.Build
import android.os.IBinder
import android.telecom.TelecomManager
import android.view.Gravity
import android.view.LayoutInflater
import android.view.View
import android.view.WindowManager
import android.widget.ImageView
import android.widget.TextView
import androidx.core.app.NotificationCompat
import com.example.smartcaller.R

class CallerIdOverlayService : Service() {

    private lateinit var windowManager: WindowManager
    private var overlayView: View? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startForegroundNotification()

        val phoneNumber = intent?.getStringExtra("PHONE_NUMBER") ?: return START_NOT_STICKY
        val callerName = intent.getStringExtra("CALLER_NAME") ?: "অপরিচিত নম্বর"
        val isSpam = intent.getBooleanExtra("IS_SPAM", false)
        val spamScore = intent.getIntExtra("SPAM_SCORE", 0)
        val spamCategory = intent.getStringExtra("SPAM_CATEGORY") ?: "স্প্যাম সতর্কতা"
        val reportsCount = intent.getIntExtra("SPAM_REPORTS", 0)

        showCallerIdPopup(
            phoneNumber = phoneNumber,
            callerName = callerName,
            isSpam = isSpam,
            spamScore = spamScore,
            spamCategory = spamCategory,
            reportsCount = reportsCount
        )

        return START_NOT_STICKY
    }

    private fun startForegroundNotification() {
        val channelId = "caller_id_overlay_channel"
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "Smart Caller ID Overlay",
                NotificationManager.IMPORTANCE_LOW
            )
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }

        val notification = NotificationCompat.Builder(this, channelId)
            .setContentTitle("Smart Caller ID সক্রিয়")
            .setContentText("অফলাইন রুম ডেটাবেজ দ্বারা কল যাচাই চলছে")
            .setSmallIcon(R.drawable.ic_caller_shield)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()

        startForeground(1001, notification)
    }

    private fun showCallerIdPopup(
        phoneNumber: String,
        callerName: String,
        isSpam: Boolean,
        spamScore: Int,
        spamCategory: String,
        reportsCount: Int
    ) {
        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager

        // পূর্বের কোনো ভিউ থাকলে আগে রিমুভ করুন
        removeOverlayView()

        val inflater = getSystemService(LAYOUT_INFLATER_SERVICE) as LayoutInflater
        overlayView = inflater.inflate(R.layout.overlay_caller_id, null)

        val tvName = overlayView?.findViewById<TextView>(R.id.tv_caller_name)
        val tvPhone = overlayView?.findViewById<TextView>(R.id.tv_caller_phone)
        val tvSpamBadge = overlayView?.findViewById<TextView>(R.id.tv_spam_badge)
        val btnDismiss = overlayView?.findViewById<View>(R.id.btn_overlay_dismiss)
        val btnDecline = overlayView?.findViewById<View>(R.id.btn_overlay_decline)

        tvName?.text = callerName
        tvPhone?.text = phoneNumber

        if (isSpam) {
            tvSpamBadge?.visibility = View.VISIBLE
            tvSpamBadge?.text = "⚠️ ঝুঁকি $spamScore% ($spamCategory - $reportsCount রিপোর্ট)"
        } else {
            tvSpamBadge?.visibility = View.GONE
        }

        btnDismiss?.setOnClickListener {
            stopSelf()
        }

        btnDecline?.setOnClickListener {
            // অ্যান্ড্রয়েড ৯+ (API 28+) এ টেলিকম ম্যানেজার দিয়ে কল রিজেক্ট
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                val telecom = getSystemService(Context.TELECOM_SERVICE) as? TelecomManager
                telecom?.endCall()
            }
            stopSelf()
        }

        val layoutType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            @Suppress("DEPRECATION")
            WindowManager.LayoutParams.TYPE_PHONE
        }

        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            layoutType,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.CENTER_HORIZONTAL
            y = 100
        }

        windowManager.addView(overlayView, params)
    }

    private fun removeOverlayView() {
        overlayView?.let {
            try {
                windowManager.removeView(it)
            } catch (e: Exception) {
                e.printStackTrace()
            }
            overlayView = null
        }
    }

    override fun onDestroy() {
        removeOverlayView()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}`;

  // ==========================================
  // CALL STATE RECEIVER (TELEPHONY BROADCAST)
  // ==========================================
  const codeCallStateReceiver = `// CallStateReceiver.kt (অ্যান্ড্রয়েড সিস্টেম কল স্টেট লিসেনার ও অফলাইন ইঞ্জিন ট্রিগার)
package com.example.smartcaller.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.provider.Settings
import android.telephony.TelephonyManager
import com.example.smartcaller.data.local.AppDatabase
import com.example.smartcaller.domain.CallerLookupResult
import com.example.smartcaller.domain.OfflineCallerIdEngine
import com.example.smartcaller.overlay.CallerIdOverlayService
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/**
 * সিস্টেম ব্রডকাস্ট রিসিভার:
 * ইনকামিং কলের প্রথম রিং বাজার সাথে সাথে সিস্টেম থেকে নম্বর গ্রহণ করে 
 * অফলাইন Room ডেটাবেজ যাচাই করে ফ্লোটিং ওভারলে চালু করে।
 */
class CallStateReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != TelephonyManager.ACTION_PHONE_STATE_CHANGED) return

        val state = intent.getStringExtra(TelephonyManager.EXTRA_STATE) ?: return
        val incomingNumber = intent.getStringExtra(TelephonyManager.EXTRA_INCOMING_NUMBER)

        when (state) {
            TelephonyManager.EXTRA_STATE_RINGING -> {
                // ইনকামিং কল বাজার মুহূর্তেই অফলাইন রুম কুয়েরি চালান
                if (!incomingNumber.isNullOrEmpty()) {
                    triggerOfflineLookupAndOverlay(context, incomingNumber)
                }
            }

            TelephonyManager.EXTRA_STATE_OFFHOOK -> {
                // ইউজার কল রিসিভ করলে ফ্লোটিং ওভারলে রিমুভ করুন
                stopOverlay(context)
            }

            TelephonyManager.EXTRA_STATE_IDLE -> {
                // কল কেটে গেলে বা মিসড হলে ওভারলে ক্লোজ করুন
                stopOverlay(context)
            }
        }
    }

    private fun triggerOfflineLookupAndOverlay(context: Context, number: String) {
        // ফ্লোটিং ওভারলে পারমিশন (SYSTEM_ALERT_WINDOW) চেক
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(context)) {
            return
        }

        val appContext = context.applicationContext

        // ব্যাকগ্রাউন্ড থ্রেডে অফলাইন রুম ডেটাবেজ লুকআপ (< ২ মিলি-সেকেন্ড)
        CoroutineScope(Dispatchers.IO).launch {
            val db = AppDatabase.getInstance(appContext)
            val engine = OfflineCallerIdEngine(db)
            val lookupResult = engine.lookupIncomingNumber(number)

            // ফ্লোটিং উইন্ডো সার্ভিসে তথ্য পাঠানো (SYSTEM_ALERT_WINDOW)
            val overlayIntent = Intent(appContext, CallerIdOverlayService::class.java).apply {
                putExtra("PHONE_NUMBER", number)
                when (lookupResult) {
                    is CallerLookupResult.SavedContact -> {
                        putExtra("CALLER_NAME", lookupResult.name)
                        putExtra("IS_SPAM", false)
                    }
                    is CallerLookupResult.SpamDetected -> {
                        putExtra("CALLER_NAME", lookupResult.label)
                        putExtra("IS_SPAM", true)
                        putExtra("SPAM_SCORE", lookupResult.score)
                        putExtra("SPAM_CATEGORY", lookupResult.category)
                        putExtra("SPAM_REPORTS", lookupResult.reports)
                    }
                    is CallerLookupResult.SafeUnknown -> {
                        putExtra("CALLER_NAME", "অপরিচিত কলার")
                        putExtra("IS_SPAM", false)
                    }
                }
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                appContext.startForegroundService(overlayIntent)
            } else {
                appContext.startService(overlayIntent)
            }
        }
    }

    private fun stopOverlay(context: Context) {
        val intent = Intent(context, CallerIdOverlayService::class.java)
        context.stopService(intent)
    }
}`;

  // ==========================================
  // ROOM DATABASE & OFFLINE SPAM ENGINE KOTLIN CODE
  // ==========================================
  const codeRoomDatabase = `// 1. build.gradle.kts (Module: app)
plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    id("com.google.devtools.ksp") version "2.0.0-1.0.24"
}

dependencies {
    // AndroidX Room Database & KTX
    val roomVersion = "2.6.1"
    implementation("androidx.room:room-runtime:$roomVersion")
    implementation("androidx.room:room-ktx:$roomVersion")
    ksp("androidx.room:room-compiler:$roomVersion")
    
    // Kotlin Coroutines
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.0")
}

// -----------------------------------------------------------------------------
// 2. SpamNumberEntity.kt (অফলাইন স্প্যাম ডেটাবেজ স্কিমা)
// -----------------------------------------------------------------------------
package com.example.smartcaller.data.local.entity

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "spam_numbers",
    indices = [
        Index(value = ["phoneNumber"], unique = true),
        Index(value = ["prefixPattern"])
    ]
)
data class SpamNumberEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    
    // নরম্যালাইজড ফোন নম্বর (উদা: "+8801700000000" অথবা "01700000000")
    val phoneNumber: String,
    
    // প্রিফিক্স বা ওয়াইল্ডকার্ড ম্যাচিং (উদা: "+88017", "096")
    val prefixPattern: String? = null,
    
    // স্প্যাম স্কোর: ০ থেকে ১০০ (৮০+ মানে নিশ্চিত বিপদ)
    val spamScore: Int,
    
    // ক্যাটাগরি: "FRAUD", "TELEMARKETING", "LOAN_SCAM", "ROBOCALL"
    val category: String,
    
    // ব্যবহারকারীদের রিপোর্টের সংখ্যা
    val reportsCount: Int = 1,
    
    // পরিচিত ভুয়া নাম বা সংস্থার নাম (যেমন: "লটারি প্রতারণা", "অননুমোদিত লোন")
    val callerNameHint: String? = null,
    
    // অ্যাপের সাথে আগে থেকেই অফলাইন ফাইলে দেওয়া কি না
    val isPreloaded: Boolean = true,
    
    val lastReportedAt: Long = System.currentTimeMillis()
)

// -----------------------------------------------------------------------------
// 3. ContactCacheEntity.kt (অফলাইন T9 সার্চের জন্য ক্যাশড কন্টাক্ট স্কিমা)
// -----------------------------------------------------------------------------
@Entity(
    tableName = "cached_contacts",
    indices = [
        Index(value = ["normalizedPhone"]),
        Index(value = ["t9Digits"])
    ]
)
data class ContactCacheEntity(
    @PrimaryKey
    val id: String,
    val displayName: String,
    val displayNameEn: String? = null,
    val rawPhone: String,
    val normalizedPhone: String,
    val t9Digits: String, // প্রি-কম্পিউটেড T9 ডিজিট (উদা: "TANVIR" -> "826847")
    val avatarUri: String? = null,
    val isFavorite: Boolean = false,
    val lastUpdated: Long = System.currentTimeMillis()
)

// -----------------------------------------------------------------------------
// 4. SpamDao.kt (অফলাইন স্প্যাম কুয়েরি ডিএও)
// -----------------------------------------------------------------------------
package com.example.smartcaller.data.local.dao

import androidx.room.*
import com.example.smartcaller.data.local.entity.SpamNumberEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface SpamDao {
    // ১. সঠিক নম্বরে স্প্যাম লুকআপ (< 1ms)
    @Query("SELECT * FROM spam_numbers WHERE phoneNumber = :cleanNumber LIMIT 1")
    suspend fun findExactSpam(cleanNumber: String): SpamNumberEntity?

    // ২. প্রিফিক্স বা নম্বর প্যাটার্ন লুকআপ (টেলিমার্কেটিং বা আইপি ফোন রেঞ্জ)
    @Query("""
        SELECT * FROM spam_numbers 
        WHERE prefixPattern IS NOT NULL 
          AND :cleanNumber LIKE (prefixPattern || '%') 
        ORDER BY spamScore DESC LIMIT 1
    """)
    suspend fun findSpamByPrefix(cleanNumber: String): SpamNumberEntity?

    // নতুন স্প্যাম রিপোর্ট সেভ বা আপডেট
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertOrUpdate(spam: SpamNumberEntity)

    // প্রি-লোডেড বাল্ক স্প্যাম লিস্ট ইনসার্ট
    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insertAll(list: List<SpamNumberEntity>)

    // মোট স্প্যাম নম্বরের সংখ্যা পর্যবেক্ষণ (Flow)
    @Query("SELECT COUNT(*) FROM spam_numbers")
    fun getSpamCount(): Flow<Int>
}

// -----------------------------------------------------------------------------
// 5. ContactDao.kt (অফলাইন কন্টাক্ট ও T9 সার্চ ডিএও)
// -----------------------------------------------------------------------------
@Dao
interface ContactDao {
    // T9 প্রেডিক্টিভ সার্চ কুয়েরি (ডায়ালপ্যাডে নম্বর চাপার সাথে সাথে)
    @Query("""
        SELECT * FROM cached_contacts 
        WHERE t9Digits LIKE (:queryDigits || '%') 
           OR normalizedPhone LIKE ('%' || :queryDigits || '%')
        ORDER BY isFavorite DESC, displayName ASC 
        LIMIT 25
    """)
    suspend fun searchT9(queryDigits: String): List<ContactCacheEntity>

    // কলার আইডি খোঁজা: পরিচিত কেউ কল করলে নাম পাওয়া
    @Query("SELECT * FROM cached_contacts WHERE normalizedPhone = :cleanNumber LIMIT 1")
    suspend fun findByPhone(cleanNumber: String): ContactCacheEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun syncAllContacts(contacts: List<ContactCacheEntity>)
}

// -----------------------------------------------------------------------------
// 6. AppDatabase.kt (রুম ডেটাবেজ ও প্রি-লোডেড অ্যাসেট সিডিং)
// -----------------------------------------------------------------------------
package com.example.smartcaller.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import com.example.smartcaller.data.local.dao.ContactDao
import com.example.smartcaller.data.local.dao.SpamDao
import com.example.smartcaller.data.local.entity.ContactCacheEntity
import com.example.smartcaller.data.local.entity.SpamNumberEntity

@Database(
    entities = [SpamNumberEntity::class, ContactCacheEntity::class],
    version = 1,
    exportSchema = true
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun spamDao(): SpamDao
    abstract fun contactDao(): ContactDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getInstance(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "smart_caller_db"
                )
                // ইন্টারনেট ছাড়াই অ্যাপ ইনস্টল হওয়ার মুহূর্ত থেকেই কাজ করার জন্য
                // assets/databases/preloaded_spam.db ফাইল থেকে প্রি-পপুলেশন
                .createFromAsset("databases/preloaded_spam.db")
                .fallbackToDestructiveMigration()
                .build()
                INSTANCE = instance
                instance
            }
        }
    }
}

// -----------------------------------------------------------------------------
// 7. OfflineCallerIdEngine.kt (অফলাইন কলার আইডি ও স্প্যাম ইঞ্জিন)
// -----------------------------------------------------------------------------
package com.example.smartcaller.domain

import com.example.smartcaller.data.local.AppDatabase

sealed class CallerLookupResult {
    data class SavedContact(val name: String, val avatar: String?) : CallerLookupResult()
    data class SpamDetected(
        val score: Int,
        val category: String,
        val label: String,
        val reports: Int
    ) : CallerLookupResult()
    data class SafeUnknown(val formattedPhone: String) : CallerLookupResult()
}

class OfflineCallerIdEngine(private val db: AppDatabase) {

    /**
     * ইনকামিং কল রিং হওয়ার সাথে সাথে <2ms সময়ের মধ্যে কলটির পরিচয় অফলাইনে নির্ধারণ করে
     */
    suspend fun lookupIncomingNumber(rawNumber: String): CallerLookupResult {
        val cleanNumber = rawNumber.replace("[^0-9+]".toRegex(), "")
        
        // ধাপ ১: ফোনে সেভ করা কন্টাক্ট কি না তা অফলাইনে চেক করুন
        val saved = db.contactDao().findByPhone(cleanNumber)
        if (saved != null) {
            return CallerLookupResult.SavedContact(
                name = saved.displayName,
                avatar = saved.avatarUri
            )
        }

        // ধাপ ২: অফলাইন স্প্যাম ডেটাবেজে সঠিক নম্বর ম্যাচ
        val exactSpam = db.spamDao().findExactSpam(cleanNumber)
        if (exactSpam != null) {
            return CallerLookupResult.SpamDetected(
                score = exactSpam.spamScore,
                category = exactSpam.category,
                label = exactSpam.callerNameHint ?: "চিহ্নিত স্প্যাম বা প্রতারণা নম্বর",
                reports = exactSpam.reportsCount
            )
        }

        // ধাপ ৩: প্রিফিক্স/প্যাটার্ন বা টেলিমার্কেটিং আইপি রেঞ্জ ম্যাচ
        val prefixSpam = db.spamDao().findSpamByPrefix(cleanNumber)
        if (prefixSpam != null) {
            return CallerLookupResult.SpamDetected(
                score = prefixSpam.spamScore,
                category = prefixSpam.category,
                label = "সন্দেহজনক প্রিফিক্স বা টেলিমার্কেটিং",
                reports = prefixSpam.reportsCount
            )
        }

        // ধাপ ৪: কোনো স্প্যাম রেকর্ডে না মিললে সাধারণ অপরিচিত নম্বর
        return CallerLookupResult.SafeUnknown(formattedPhone = rawNumber)
    }
}`;

  const permissionDefinitions = [
    {
      key: 'CALL_PHONE',
      tag: 'android.permission.CALL_PHONE',
      label: 'সরাসরি কল করার জন্য',
      desc: 'কীপ্যাডে বা কন্টাক্ট থেকে নম্বর প্রেস করার সাথে সাথে কোনো থার্ড-পার্টি অ্যাপ ছাড়াই সরাসরি সেলুলার কল ডায়াল করার অনুমতি।',
    },
    {
      key: 'READ_CONTACTS',
      tag: 'android.permission.READ_CONTACTS',
      label: 'কন্টাক্ট পড়া ও খোঁজার জন্য',
      desc: 'ফোনে সেভ করা সব কন্টাক্ট নাম, নম্বর ও প্রোফাইল ছবি ডায়ালারে নিয়ে আসা ও T9 সার্চের জন্য প্রয়োজন।',
    },
    {
      key: 'WRITE_CONTACTS',
      tag: 'android.permission.WRITE_CONTACTS',
      label: 'নতুন কন্টাক্ট লেখার বা সেভ করার জন্য',
      desc: 'ডায়ালপ্যাড বা কল লগ থেকে সরাসরি ইউজারের কন্টাক্ট বুকে নতুন নাম ও নম্বর সেভ বা এডিট করার অনুমতি।',
    },
    {
      key: 'READ_CALL_LOG',
      tag: 'android.permission.READ_CALL_LOG',
      label: 'কল লগ বা হিস্ট্রি দেখার জন্য',
      desc: 'ইনকামিং, আউটগোয়িং, মিসড কল এবং রিসিভ না হওয়া কলের সম্পূর্ণ তালিকা ড্যাশবোর্ডে দেখানোর জন্য।',
    },
    {
      key: 'WRITE_CALL_LOG',
      tag: 'android.permission.WRITE_CALL_LOG',
      label: 'কল হিস্ট্রি লেখার বা মুছে ফেলার জন্য',
      desc: 'কল শেষ হলে নতুন হিস্ট্রি রেকর্ড তৈরি করা অথবা ইউজার কল হিস্ট্রি ক্লিয়ার করলে ডাটাবেজ আপডেট করা।',
    },
    {
      key: 'READ_PHONE_STATE',
      tag: 'android.permission.READ_PHONE_STATE',
      label: 'ফোন স্টেট ও নেটওয়ার্ক ট্র্যাক করার জন্য',
      desc: 'কল রিং হচ্ছে কি না, কল এক্টিভ হয়েছে কি না বা কেটে গেছে কি না এবং সিম স্লট (SIM 1/2) ট্র্যাক করার জন্য।',
    },
    {
      key: 'ANSWER_PHONE_CALLS',
      tag: 'android.permission.ANSWER_PHONE_CALLS',
      label: 'কল রিসিভ বা কেটে দেওয়ার অনুমতি',
      desc: 'সিস্টেমের ইনকামিং কল স্ক্রিনে সোয়াইপ বা ট্যাপ করে প্রোগ্রামাটিক্যালি কল এক্সেপ্ট বা রিজেক্ট করার অনুমতি।',
    },
    {
      key: 'SYSTEM_ALERT_WINDOW',
      tag: 'android.permission.SYSTEM_ALERT_WINDOW',
      label: 'কলার আইডি পপ-আপ বা ওভারলে উইন্ডো',
      desc: 'ট্রু-কলার স্টাইলে যেকোনো অ্যাপের ওপর বা লক স্ক্রিনে ফ্লোটিং কলার আইডি কার্ড ও স্প্যাম অ্যালার্ট দেখানোর জন্য।',
    },
  ];

  return (
    <div id="android-guide-component" className="flex flex-col h-full overflow-y-auto p-4 space-y-4">
      {/* Title */}
      <div className="space-y-1">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
          <Terminal className="w-3.5 h-3.5" />
          <span>Android Native Telephony Hub</span>
        </div>
        <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
          {t.guideTitle}
        </h2>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          {t.guideSubtitle}
        </p>
      </div>

      {/* Navigation Subtabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs border-b border-neutral-200 dark:border-neutral-800">
        <button
          onClick={() => setActiveTab('permissions_simulator')}
          className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition ${
            activeTab === 'permissions_simulator'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200'
          }`}
        >
          পারমিশন সিমুলেটর
        </button>
        <button
          onClick={() => setActiveTab('manifest')}
          className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition ${
            activeTab === 'manifest'
              ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900'
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
          }`}
        >
          AndroidManifest.xml
        </button>
        <button
          onClick={() => setActiveTab('runtime_permissions')}
          className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition ${
            activeTab === 'runtime_permissions'
              ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900'
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
          }`}
        >
          Runtime Permissions.kt
        </button>
        <button
          onClick={() => setActiveTab('rolemanager')}
          className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition ${
            activeTab === 'rolemanager'
              ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900'
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
          }`}
        >
          RoleManager.kt
        </button>
        <button
          onClick={() => setActiveTab('incallservice')}
          className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition ${
            activeTab === 'incallservice'
              ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900'
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
          }`}
        >
          InCallService.kt
        </button>
        <button
          onClick={() => setActiveTab('callerid_overlay')}
          className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition ${
            activeTab === 'callerid_overlay'
              ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900'
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
          }`}
        >
          Overlay Service.kt
        </button>
        <button
          onClick={() => setActiveTab('callstate_receiver')}
          className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition ${
            activeTab === 'callstate_receiver'
              ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900'
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
          }`}
        >
          CallStateReceiver.kt
        </button>
        <button
          onClick={() => setActiveTab('room_database')}
          className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition ${
            activeTab === 'room_database'
              ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900'
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
          }`}
        >
          Room DB ও অফলাইন স্প্যাম.kt
        </button>
        <button
          onClick={() => setActiveTab('architecture')}
          className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition ${
            activeTab === 'architecture'
              ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900'
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
          }`}
        >
          আর্কিটেকচার রোডম্যাপ
        </button>
        <button
          onClick={() => setActiveTab('pwabuilder')}
          className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition flex items-center gap-1.5 ${
            activeTab === 'pwabuilder'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>PWABuilder বাইপাস গাইড</span>
        </button>
      </div>

      {/* 1. PERMISSIONS & ROLE SIMULATOR TAB */}
      {activeTab === 'permissions_simulator' && (
        <div className="space-y-4">
          {/* Action triggers card */}
          <div className="p-4 rounded-2xl bg-neutral-900 text-white border border-neutral-800 shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold">অ্যান্ড্রয়েড সিস্টেম পারমিশন ও রোল কন্ট্রোল</h3>
              </div>
              <button
                onClick={() => {
                  setGrantedPermissions({
                    CALL_PHONE: true,
                    READ_CONTACTS: true,
                    WRITE_CONTACTS: false,
                    READ_CALL_LOG: true,
                    WRITE_CALL_LOG: false,
                    READ_PHONE_STATE: true,
                    ANSWER_PHONE_CALLS: false,
                    SYSTEM_ALERT_WINDOW: true,
                  });
                  setIsDefaultDialerRole(false);
                }}
                className="text-xs text-neutral-400 hover:text-white flex items-center gap-1 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>রিসেট</span>
              </button>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">
              বাস্তব অ্যান্ড্রয়েড ডিভাইসে কীভাবে পারমিশন প্রম্পট এবং RoleManager ডায়ালগ ওপেন হয়, তা নিচে লাইভ টেস্ট করুন:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <button
                id="btn-trigger-runtime-permissions"
                onClick={() => {
                  setDialogPermissionIndex(0);
                  setShowRuntimePermissionDialog(true);
                }}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>রানটাইম পারমিশন প্রম্পট চালান</span>
              </button>

              <button
                id="btn-trigger-role-dialer"
                onClick={() => setShowRoleDialog(true)}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-xs transition"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>RoleManager (ডিফল্ট ডায়ালার) চালান</span>
              </button>

              <button
                id="btn-trigger-overlay-spam-sim"
                onClick={() => {
                  onSimulateIncoming?.(
                    {
                      phone: '+880 1300-998811',
                      name: 'লটারি ও ফেক প্রাইজ (Scam)',
                      businessCategory: 'লোকাল স্প্যাম ব্লকলিস্ট (Room DB)',
                      spamScore: 94,
                      spamReports: 1420,
                      city: 'ঢাকা',
                      country: 'বাংলাদেশ',
                      verified: false,
                      notes: 'বিকাশ/নগদ লটারি প্রতারণা নম্বর - অফলাইনে শনাক্ত',
                    },
                    'overlay'
                  );
                }}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-xs transition sm:col-span-2"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>অফলাইন ব্রডকাস্ট ও ফ্লোটিং ওভারলে টেস্ট (SYSTEM_ALERT_WINDOW)</span>
              </button>
            </div>

            {/* Current Default Status Badge */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-800/80 border border-neutral-700/60 text-xs">
              <span className="text-neutral-300">ডিফল্ট ডায়ালার হিসেবে স্টেটাস:</span>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold ${
                  isDefaultDialerRole
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}
              >
                {isDefaultDialerRole ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>DEFAULT DIALER ACTIVE</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>NOT DEFAULT (SYSTEM APP)</span>
                  </>
                )}
              </span>
            </div>
          </div>

          {/* 8 Manifest Permissions Status Table */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              ম্যানিফেস্টে ঘোষিত ৮টি প্রধান পারমিশনের লাইভ স্টেট
            </h4>

            <div className="grid grid-cols-1 gap-2">
              {permissionDefinitions.map((item) => {
                const isGranted = grantedPermissions[item.key] ?? false;
                return (
                  <div
                    key={item.key}
                    className="p-3 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs flex items-start justify-between gap-3 transition"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                          {item.label}
                        </span>
                        <code className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                          {item.tag}
                        </code>
                      </div>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                        {item.desc}
                      </p>
                    </div>

                    <button
                      onClick={() =>
                        setGrantedPermissions((prev) => ({
                          ...prev,
                          [item.key]: !prev[item.key],
                        }))
                      }
                      className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                        isGranted
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:text-neutral-700'
                      }`}
                    >
                      {isGranted ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>GRANTED</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3.5 h-3.5 text-neutral-400" />
                          <span>DENIED</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 2. MANIFEST CODE TAB */}
      {activeTab === 'manifest' && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-mono text-neutral-500">AndroidManifest.xml</span>
            <button
              onClick={() => copyToClipboard(codeManifest, 'manifest')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-xs font-medium hover:bg-neutral-200 transition"
            >
              {copiedKey === 'manifest' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-500">{t.copied}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>{t.copyCode}</span>
                </>
              )}
            </button>
          </div>
          <pre className="p-3 rounded-xl bg-neutral-900 text-neutral-100 font-mono text-[11px] overflow-x-auto border border-neutral-800 leading-relaxed">
            {codeManifest}
          </pre>
        </div>
      )}

      {/* 3. RUNTIME PERMISSION CODE TAB */}
      {activeTab === 'runtime_permissions' && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-mono text-neutral-500">RuntimePermission.kt (Kotlin)</span>
            <button
              onClick={() => copyToClipboard(codeRuntimePermissions, 'runtime')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-xs font-medium hover:bg-neutral-200 transition"
            >
              {copiedKey === 'runtime' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-500">{t.copied}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>{t.copyCode}</span>
                </>
              )}
            </button>
          </div>
          <pre className="p-3 rounded-xl bg-neutral-900 text-neutral-100 font-mono text-[11px] overflow-x-auto border border-neutral-800 leading-relaxed">
            {codeRuntimePermissions}
          </pre>
        </div>
      )}

      {/* 4. ROLE MANAGER CODE TAB */}
      {activeTab === 'rolemanager' && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-mono text-neutral-500">RoleManager.kt (Android 10+ API 29)</span>
            <button
              onClick={() => copyToClipboard(codeRoleManager, 'role')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-xs font-medium hover:bg-neutral-200 transition"
            >
              {copiedKey === 'role' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-500">{t.copied}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>{t.copyCode}</span>
                </>
              )}
            </button>
          </div>
          <pre className="p-3 rounded-xl bg-neutral-900 text-neutral-100 font-mono text-[11px] overflow-x-auto border border-neutral-800 leading-relaxed">
            {codeRoleManager}
          </pre>
        </div>
      )}

      {/* 5. INCALLSERVICE CODE TAB */}
      {activeTab === 'incallservice' && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-mono text-neutral-500">CallService.kt (InCallService)</span>
            <button
              onClick={() => copyToClipboard(codeInCallService, 'incall')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-xs font-medium hover:bg-neutral-200 transition"
            >
              {copiedKey === 'incall' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-500">{t.copied}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>{t.copyCode}</span>
                </>
              )}
            </button>
          </div>
          <pre className="p-3 rounded-xl bg-neutral-900 text-neutral-100 font-mono text-[11px] overflow-x-auto border border-neutral-800 leading-relaxed">
            {codeInCallService}
          </pre>
        </div>
      )}

      {/* 6. OVERLAY SERVICE CODE TAB */}
      {activeTab === 'callerid_overlay' && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-mono text-neutral-500">CallerIdOverlayService.kt (SYSTEM_ALERT_WINDOW)</span>
            <button
              onClick={() => copyToClipboard(codeCallerIdOverlay, 'overlay')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-xs font-medium hover:bg-neutral-200 transition"
            >
              {copiedKey === 'overlay' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-500">{t.copied}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>{t.copyCode}</span>
                </>
              )}
            </button>
          </div>
          <pre className="p-3 rounded-xl bg-neutral-900 text-neutral-100 font-mono text-[11px] overflow-x-auto border border-neutral-800 leading-relaxed">
            {codeCallerIdOverlay}
          </pre>
        </div>
      )}

      {/* CALL STATE RECEIVER (TELEPHONY BROADCAST) TAB */}
      {activeTab === 'callstate_receiver' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-mono text-neutral-500">
              CallStateReceiver.kt (Telephony Broadcast & Room Integration)
            </span>
            <button
              onClick={() => copyToClipboard(codeCallStateReceiver, 'receiver')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-xs font-medium hover:bg-neutral-200 transition"
            >
              {copiedKey === 'receiver' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-500">{t.copied}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>{t.copyCode}</span>
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60">
              <span className="font-bold text-emerald-800 dark:text-emerald-300 block mb-0.5">
                ১. সিস্টেম ব্রডকাস্ট লিসেনিং
              </span>
              <p className="text-neutral-600 dark:text-neutral-300 text-[11px]">
                <code className="font-mono">ACTION_PHONE_STATE_CHANGED</code> ইন্টারসেপ্ট করে রিং হওয়ার মুহূর্তেই ইনকামিং নম্বর ক্যাচ করা হয়।
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60">
              <span className="font-bold text-rose-800 dark:text-rose-300 block mb-0.5">
                ২. সাব-২ms অফলাইন রুম কুয়েরি
              </span>
              <p className="text-neutral-600 dark:text-neutral-300 text-[11px]">
                নেটওয়ার্ক কলের অপেক্ষা না করে Coroutine (IO) দিয়ে লোকাল SQLite/Room ডেটাবেজ চেক করে স্প্যাম স্কোর নির্ণয়।
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/60">
              <span className="font-bold text-sky-800 dark:text-sky-300 block mb-0.5">
                ৩. ফ্লোটিং সার্ভিস লাইফসাইকেল
              </span>
              <p className="text-neutral-600 dark:text-neutral-300 text-[11px]">
                রিং করার সময় <code className="font-mono">CallerIdOverlayService</code> লঞ্চ হয় এবং কল রিসিভ বা ডিসকানেক্ট হলে স্বয়ংক্রিয়ভাবে সার্ভিস বন্ধ হয়।
              </p>
            </div>
          </div>

          <pre className="p-3 rounded-xl bg-neutral-900 text-neutral-100 font-mono text-[11px] overflow-x-auto border border-neutral-800 leading-relaxed max-h-[500px]">
            {codeCallStateReceiver}
          </pre>
        </div>
      )}

      {/* 7. ROOM DATABASE & OFFLINE SPAM ENGINE TAB */}
      {activeTab === 'room_database' && (
        <div className="space-y-4">
          {/* Interactive Room SQLite Service Layer Inspector */}
          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/80 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-cyan-100 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                    <span>লাইভ রুম ডাটাবেজ সার্ভিস ও ডিএও সিমুলেটর</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                      Dexie.js / IndexedDB
                    </span>
                  </h4>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    অ্যান্ড্রয়েডের Room Database আর্কিটেকচার অনুযায়ী লোকাল টেবিলে ডাটা সিঙ্ক হচ্ছে
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  id="export-room-json-btn"
                  onClick={handleExportJson}
                  className="px-2.5 py-1.5 rounded-xl bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 text-neutral-800 dark:text-neutral-200 text-xs font-semibold flex items-center gap-1 transition"
                  title="Export Room Database JSON"
                >
                  <Download className="w-3 h-3" />
                  <span>JSON ব্যাকআপ</span>
                </button>
                <button
                  id="reset-room-db-btn"
                  onClick={handleResetRoomDb}
                  disabled={isResettingDb}
                  className="px-2.5 py-1.5 rounded-xl bg-rose-100 dark:bg-rose-950/50 hover:bg-rose-200 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-1 transition border border-rose-200 dark:border-rose-800"
                  title="Reset and Re-seed Room Database"
                >
                  <RefreshCw className={`w-3 h-3 ${isResettingDb ? 'animate-spin' : ''}`} />
                  <span>রিসেট ও সিড</span>
                </button>
              </div>
            </div>

            {/* Entity Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200/70 dark:border-neutral-800">
                <div className="flex items-center justify-between text-[11px] text-neutral-500 mb-1">
                  <span>@Entity: contacts</span>
                  <Layers className="w-3 h-3 text-emerald-500" />
                </div>
                <p className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                  {dbMetrics?.contactsCount ?? 0}
                  <span className="text-[10px] font-normal text-neutral-400 ml-1">রেকর্ড</span>
                </p>
              </div>

              <div className="p-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200/70 dark:border-neutral-800">
                <div className="flex items-center justify-between text-[11px] text-neutral-500 mb-1">
                  <span>@Entity: call_logs</span>
                  <Layers className="w-3 h-3 text-sky-500" />
                </div>
                <p className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                  {dbMetrics?.callLogsCount ?? 0}
                  <span className="text-[10px] font-normal text-neutral-400 ml-1">রেকর্ড</span>
                </p>
              </div>

              <div className="p-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200/70 dark:border-neutral-800">
                <div className="flex items-center justify-between text-[11px] text-neutral-500 mb-1">
                  <span>@Entity: spam_numbers</span>
                  <Layers className="w-3 h-3 text-rose-500" />
                </div>
                <p className="text-base font-bold text-rose-600 dark:text-rose-400">
                  {dbMetrics?.spamCount ?? 0}
                  <span className="text-[10px] font-normal text-neutral-400 ml-1">রেকর্ড</span>
                </p>
              </div>

              <div className="p-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200/70 dark:border-neutral-800">
                <div className="flex items-center justify-between text-[11px] text-neutral-500 mb-1">
                  <span>@Entity: caller_id_cache</span>
                  <Layers className="w-3 h-3 text-purple-500" />
                </div>
                <p className="text-base font-bold text-purple-600 dark:text-purple-400">
                  {dbMetrics?.callerIdCacheCount ?? 0}
                  <span className="text-[10px] font-normal text-neutral-400 ml-1">রেকর্ড</span>
                </p>
              </div>
            </div>

            {/* Test Coroutine Query Button */}
            <div className="pt-1 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <button
                id="test-room-coroutines-btn"
                onClick={handleRunRoomCoroutinesTest}
                disabled={isTestingRoom}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition shadow-xs"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>সমান্তরাল Coroutine কুয়েরি টেস্ট (Dispatchers.IO)</span>
              </button>

              <span className="text-[10px] font-mono text-neutral-400">
                ভার্সন: v{dbMetrics?.version || 1} • টেবিল সাইজ: {dbMetrics?.approximateSizeKb || 12} KB
              </span>
            </div>

            {roomTestStatus && (
              <div className="p-2 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800 text-[11px] font-mono text-cyan-800 dark:text-cyan-200 animate-fadeIn">
                {roomTestStatus}
              </div>
            )}
          </div>

          <div className="flex justify-between items-center">
            <span className="text-xs font-mono text-neutral-500">
              RoomDatabase + SpamEntity + SpamDao + PreloadedAsset.kt
            </span>
            <button
              onClick={() => copyToClipboard(codeRoomDatabase, 'room')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-xs font-medium hover:bg-neutral-200 transition"
            >
              {copiedKey === 'room' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-500">{t.copied}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>{t.copyCode}</span>
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60">
              <span className="font-bold text-emerald-800 dark:text-emerald-300 block mb-0.5">
                ১. প্রি-লোডেড অ্যাসেট সিডিং
              </span>
              <p className="text-neutral-600 dark:text-neutral-300 text-[11px]">
                <code className="font-mono">createFromAsset("preloaded_spam.db")</code> এর মাধ্যমে ইনস্টল হওয়ার পর নেট ছাড়াই শতভাগ কার্যকর।
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/60">
              <span className="font-bold text-sky-800 dark:text-sky-300 block mb-0.5">
                ২. প্রিফিক্স ও ওয়াইল্ডকার্ড ম্যাচিং
              </span>
              <p className="text-neutral-600 dark:text-neutral-300 text-[11px]">
                নির্দিষ্ট ফোন নম্বর ছাড়া টেলিমার্কেটিং বা আইপি ফোন রেঞ্জ প্রিফিক্স দিয়ে অফলাইনে নিমেষেই চিহ্নিত করা যায়।
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60">
              <span className="font-bold text-purple-800 dark:text-purple-300 block mb-0.5">
                ৩. অফলাইন T9 সার্চ ইনডেক্স
              </span>
              <p className="text-neutral-600 dark:text-neutral-300 text-[11px]">
                ক্যাশড কন্টাক্ট স্কিমায় প্রি-কম্পিউটেড <code className="font-mono">t9Digits</code> কলামের ওপর ইনডেক্স থাকায় কুয়েরি সম্পন্ন হয় ১ মিলিসেকেন্ডেরও কমে।
              </p>
            </div>
          </div>

          <pre className="p-3 rounded-xl bg-neutral-900 text-neutral-100 font-mono text-[11px] overflow-x-auto border border-neutral-800 leading-relaxed max-h-[500px]">
            {codeRoomDatabase}
          </pre>
        </div>
      )}

      {/* 8. ARCHITECTURE TAB */}
      {activeTab === 'architecture' && (
        <div className="space-y-4 text-xs leading-relaxed">
          <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 space-y-1.5">
            <h4 className="font-bold text-sm text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">
                ১
              </span>
              <span>টেলিকম ফ্রেমওয়ার্ক ও মূল আর্কিটেকচার</span>
            </h4>
            <p className="text-neutral-600 dark:text-neutral-300">
              অ্যান্ড্রয়েডে আপনার অ্যাপকে ডিফল্ট ডায়ালার বানাতে হলে গুগল সিস্টেমের{' '}
              <code className="px-1 py-0.5 rounded bg-neutral-200 dark:bg-neutral-700 font-mono text-[11px]">
                Telecom Framework
              </code>{' '}
              এর সাথে যুক্ত হতে হবে। এর জন্য প্রধান দুটি সার্ভিস রয়েছে:
            </p>
            <ul className="list-disc list-inside space-y-1 text-neutral-600 dark:text-neutral-300 pl-2">
              <li>
                <strong>InCallService:</strong> ইনকামিং এবং আউটগোয়িং কলের স্টেট (RINGING, ACTIVE, DISCONNECTED) ট্র্যাক করে এবং কল স্ক্রিন দেখায়।
              </li>
              <li>
                <strong>ConnectionService:</strong> যদি আপনি নিজস্ব সেলুলার বা ভিওআইপি (VoIP) কল রাউটিং ইঞ্জিন তৈরি করতে চান।
              </li>
            </ul>
          </div>

          <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 space-y-1.5">
            <h4 className="font-bold text-sm text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-cyan-600 text-white flex items-center justify-center text-[10px]">
                ২
              </span>
              <span>RoleManager ও ডিফল্ট ডায়ালার প্রম্পট</span>
            </h4>
            <p className="text-neutral-600 dark:text-neutral-300">
              অ্যান্ড্রয়েড ১০ (API 29) এবং তার পরবর্তী ভার্সনগুলোতে সরাসরি সিস্টেম ডায়ালার হতে হলে{' '}
              <code className="px-1 py-0.5 rounded bg-neutral-200 dark:bg-neutral-700 font-mono text-[11px]">
                RoleManager.ROLE_DIALER
              </code>{' '}
              অনুরোধ জানাতে হয়। ইউজার সম্মতি দিলে আপনার অ্যাপ এক ক্লিকেই ফোনের ডিফল্ট ডায়ালার হয়ে যায়।
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 space-y-1.5">
            <h4 className="font-bold text-sm text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              <span>গুগল প্লে স্টোর পলিসি ও পারমিশন সতর্কতা</span>
            </h4>
            <p className="text-rose-800 dark:text-rose-300/90 text-[11px]">
              <code className="font-mono font-bold">READ_CALL_LOG</code> এবং{' '}
              <code className="font-mono font-bold">CALL_PHONE</code> অত্যন্ত সংবেদনশীল পারমিশন। গুগল প্লে স্টোর কেবলমাত্র সেই অ্যাপগুলোকেই এই পারমিশন দেয় যারা প্রকৃত অর্থেই ফোনের মূল ডিফল্ট ডায়ালার (Default Phone Handler) হিসেবে কাজ করে।
            </p>
          </div>
        </div>
      )}

      {/* 9. PWABUILDER NO-STUDIO BYPASS TAB */}
      {activeTab === 'pwabuilder' && (
        <div className="space-y-4 animate-in fade-in">
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold text-sm">
              <Zap className="w-4 h-4" />
              <span>PWABuilder: অ্যান্ড্রয়েড স্টুডিও ছাড়া ১-ক্লিকে APK তৈরি</span>
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
              মাইক্রোসফটের অফিশিয়াল ওপেন সোর্স ইঞ্জিন <strong>PWABuilder</strong> ব্যবহার করে কোনো ভারি অ্যান্ড্রয়েড স্টুডিও পিসিতে ইনস্টল ছাড়াই এই অ্যাপটিকে সরাসরি রেডিমেড <strong>Trusted Web Activity (TWA) Android APK</strong> তে রূপান্তর করা যায়।
            </p>
          </div>

          {/* Quick Copy Link Card */}
          <div className="p-4 rounded-2xl bg-neutral-900 text-white space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-400 font-medium">PWABuilder অফিশিয়াল পোর্টাল</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">১০০% ফ্রি ক্লাউড বিল্ড</span>
            </div>
            <div className="p-2.5 rounded-xl bg-neutral-800/80 border border-neutral-700 flex items-center justify-between gap-2">
              <code className="text-xs text-emerald-300 font-mono truncate">https://www.pwabuilder.com</code>
              <button
                onClick={() => copyToClipboard('https://www.pwabuilder.com', 'pwabuilder_url')}
                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold flex items-center gap-1 transition shrink-0"
              >
                {copiedKey === 'pwabuilder_url' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>কপি লিঙ্ক</span>
              </button>
            </div>
          </div>

          {/* Step by step guide */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
              ধাপ অনুসারে APK তৈরির প্রক্রিয়া:
            </h4>

            <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center shrink-0">১</span>
                <h5 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">ওয়েবসাইট লিঙ্ক পেস্ট করুন</h5>
              </div>
              <p className="text-xs text-neutral-600 dark:text-neutral-300 pl-8 leading-relaxed">
                <a href="https://www.pwabuilder.com" target="_blank" rel="noreferrer" className="text-emerald-600 dark:text-emerald-400 underline font-medium">pwabuilder.com</a> ভিজিট করে আপনার অ্যাপটির লাইভ URL ইনপুট বক্সে পেস্ট করে <strong>"Start"</strong> চাপুন।
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center shrink-0">২</span>
                <h5 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">PWA Manifest ও সার্ভিস ওয়ার্কার স্ক্যান</h5>
              </div>
              <p className="text-xs text-neutral-600 dark:text-neutral-300 pl-8 leading-relaxed">
                PWABuilder আমাদের বিদ্যমান <code className="text-emerald-600 dark:text-emerald-400 font-mono">manifest.json</code>, অফলাইন Service Worker, আইকন ও শর্টকাটগুলো যাচাই করবে (আমাদের কোডবেস আগে থেকেই ১০০% PWA Ready স্কোর নিশ্চিত করা আছে)।
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center shrink-0">৩</span>
                <h5 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">"Package For Stores" বাটনে ক্লিক</h5>
              </div>
              <p className="text-xs text-neutral-600 dark:text-neutral-300 pl-8 leading-relaxed">
                ফলাফল পেইজে <strong>Android</strong> অপশনের পাশে <strong>"Generate"</strong> বা <strong>"Package For Stores"</strong> বাটনে ক্লিক করুন।
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center shrink-0">৪</span>
                <h5 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">APK / AAB প্যাকেজ ডাউনলোড ও ফোনে ইন্সটল</h5>
              </div>
              <p className="text-xs text-neutral-600 dark:text-neutral-300 pl-8 leading-relaxed">
                কয়েক সেকেন্ডের মধ্যে ক্লাউড থেকে আপনার <code className="font-mono text-emerald-600 dark:text-emerald-400">.apk</code> ফাইল ডাউনলোড হয়ে যাবে। ফাইলটি যেকোনো অ্যান্ড্রয়েড ফোনে পাঠিয়ে সরাসরি ক্লিক করলেই নেটিভ অ্যাপের মতো ইনস্টল হয়ে যাবে!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SIMULATED ANDROID RUNTIME PERMISSION MODAL */}
      {showRuntimePermissionDialog && runtimeRequestsList[dialogPermissionIndex] && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-xs bg-white dark:bg-neutral-900 rounded-3xl p-5 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                {runtimeRequestsList[dialogPermissionIndex].subtext}
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {runtimeRequestsList[dialogPermissionIndex].name}
              </p>
              <code className="text-[10px] text-neutral-400 font-mono block pt-1">
                {runtimeRequestsList[dialogPermissionIndex].permission}
              </code>
            </div>

            <div className="space-y-2 pt-2">
              <button
                id="modal-grant-permission-btn"
                onClick={() => handleGrantRuntime(true)}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition"
              >
                Allow (অনুমতি দিন)
              </button>
              <button
                id="modal-deny-permission-btn"
                onClick={() => handleGrantRuntime(false)}
                className="w-full py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-semibold hover:bg-neutral-200 transition"
              >
                Don't allow (অনুমতি দেবেন না)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SIMULATED ROLEMANAGER ROLE_DIALER MODAL */}
      {showRoleDialog && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-neutral-900 rounded-3xl p-5 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center mx-auto">
              <Smartphone className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                Set Smart Dialer as default phone app?
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                স্মার্ট ডায়ালারকে ফোনের মূল ডিফল্ট ডায়ালার হিসেবে নির্ধারণ করতে চান? এতে সরাসরি কল গ্রহণ ও করার সুবিধা যুক্ত হবে।
              </p>
              <code className="text-[10px] text-sky-600 dark:text-sky-400 font-mono block pt-1">
                RoleManager.createRequestRoleIntent(RoleManager.ROLE_DIALER)
              </code>
            </div>

            <div className="space-y-2 pt-2">
              <button
                id="modal-set-default-dialer-btn"
                onClick={() => {
                  setIsDefaultDialerRole(true);
                  setShowRoleDialog(false);
                }}
                className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition"
              >
                Set as default (ডিফল্ট হিসেবে সেট করুন)
              </button>
              <button
                id="modal-cancel-default-dialer-btn"
                onClick={() => setShowRoleDialog(false)}
                className="w-full py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-semibold hover:bg-neutral-200 transition"
              >
                Cancel (বাতিল)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
