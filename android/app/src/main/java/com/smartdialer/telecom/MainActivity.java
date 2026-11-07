package com.smartdialer.telecom;

import android.app.role.RoleManager;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.provider.Telephony;
import android.telecom.TelecomManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Configure WebView settings for seamless Google OAuth & Android Telecom Integration
        if (bridge != null && bridge.getWebView() != null) {
            WebView webView = bridge.getWebView();
            WebSettings settings = webView.getSettings();

            // 1. Remove '; wv' and 'Version/4.0' so Google OAuth does not block with 403 disallowed_useragent
            String originalUserAgent = settings.getUserAgentString();
            if (originalUserAgent != null) {
                String cleanUserAgent = originalUserAgent
                        .replace("; wv", "")
                        .replace("Version/4.0 ", "");
                settings.setUserAgentString(cleanUserAgent);
            }

            // 2. Enable multi-window popups and JavaScript auto-windows for Google Account Selector
            settings.setJavaScriptCanOpenWindowsAutomatically(true);
            settings.setSupportMultipleWindows(true);

            // 3. Enable DOM storage & database storage for offline Room DB and Firebase auth state persistence
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);

            // 4. Inject AndroidBridge for native RoleManager (ROLE_DIALER & ROLE_SMS) integration
            webView.addJavascriptInterface(new Object() {
                @JavascriptInterface
                public void requestRole(String role) {
                    runOnUiThread(() -> {
                        try {
                            if ("dialer".equalsIgnoreCase(role)) {
                                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                                    RoleManager roleManager = getSystemService(RoleManager.class);
                                    if (roleManager != null && roleManager.isRoleAvailable(RoleManager.ROLE_DIALER)) {
                                        Intent intent = roleManager.createRequestRoleIntent(RoleManager.ROLE_DIALER);
                                        startActivity(intent);
                                        return;
                                    }
                                }
                                Intent intent = new Intent(TelecomManager.ACTION_CHANGE_DEFAULT_DIALER);
                                intent.putExtra(TelecomManager.EXTRA_CHANGE_DEFAULT_DIALER_PACKAGE_NAME, getPackageName());
                                startActivity(intent);
                            } else if ("sms".equalsIgnoreCase(role)) {
                                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                                    RoleManager roleManager = getSystemService(RoleManager.class);
                                    if (roleManager != null && roleManager.isRoleAvailable(RoleManager.ROLE_SMS)) {
                                        Intent intent = roleManager.createRequestRoleIntent(RoleManager.ROLE_SMS);
                                        startActivity(intent);
                                        return;
                                    }
                                }
                                Intent intent = new Intent(Telephony.Sms.Intents.ACTION_CHANGE_DEFAULT);
                                intent.putExtra(Telephony.Sms.Intents.EXTRA_PACKAGE_NAME, getPackageName());
                                startActivity(intent);
                            }
                        } catch (Exception e) {
                            e.printStackTrace();
                        }
                    });
                }

                @JavascriptInterface
                public boolean isDefaultDialer() {
                    try {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                            RoleManager roleManager = getSystemService(RoleManager.class);
                            return roleManager != null && roleManager.isRoleHeld(RoleManager.ROLE_DIALER);
                        }
                        TelecomManager telecomManager = (TelecomManager) getSystemService(TELECOM_SERVICE);
                        return telecomManager != null && getPackageName().equals(telecomManager.getDefaultDialerPackage());
                    } catch (Exception e) {
                        return false;
                    }
                }

                @JavascriptInterface
                public boolean isDefaultSms() {
                    try {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                            RoleManager roleManager = getSystemService(RoleManager.class);
                            return roleManager != null && roleManager.isRoleHeld(RoleManager.ROLE_SMS);
                        }
                        return getPackageName().equals(Telephony.Sms.getDefaultSmsPackage(MainActivity.this));
                    } catch (Exception e) {
                        return false;
                    }
                }
            }, "AndroidBridge");
        }
    }
}
