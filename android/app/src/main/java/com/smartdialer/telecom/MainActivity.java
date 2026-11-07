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
                private String resolveRoleConstant(String role) {
                    if (role == null) return null;
                    String clean = role.trim();
                    if ("dialer".equalsIgnoreCase(clean) || "ROLE_DIALER".equalsIgnoreCase(clean) || "android.app.role.DIALER".equalsIgnoreCase(clean)) {
                        return RoleManager.ROLE_DIALER;
                    }
                    if ("sms".equalsIgnoreCase(clean) || "ROLE_SMS".equalsIgnoreCase(clean) || "android.app.role.SMS".equalsIgnoreCase(clean)) {
                        return RoleManager.ROLE_SMS;
                    }
                    return clean;
                }

                @JavascriptInterface
                public void requestRole(String role) {
                    runOnUiThread(() -> {
                        try {
                            String roleConstant = resolveRoleConstant(role);
                            boolean isDialer = RoleManager.ROLE_DIALER.equals(roleConstant);
                            boolean isSms = RoleManager.ROLE_SMS.equals(roleConstant);

                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                                RoleManager roleManager = getSystemService(RoleManager.class);
                                if (roleManager != null && roleConstant != null && roleManager.isRoleAvailable(roleConstant)) {
                                    if (roleManager.isRoleHeld(roleConstant)) {
                                        notifyRoleResult(isDialer ? "dialer" : "sms", true);
                                        return;
                                    }
                                    Intent intent = roleManager.createRequestRoleIntent(roleConstant);
                                    startActivityForResult(intent, isDialer ? 1001 : 1002);
                                    return;
                                }
                            }

                            // Fallback for pre-Android 10 or when RoleManager is not directly available
                            if (isDialer) {
                                Intent intent = new Intent(TelecomManager.ACTION_CHANGE_DEFAULT_DIALER);
                                intent.putExtra(TelecomManager.EXTRA_CHANGE_DEFAULT_DIALER_PACKAGE_NAME, getPackageName());
                                startActivityForResult(intent, 1001);
                            } else if (isSms) {
                                Intent intent = new Intent(Telephony.Sms.Intents.ACTION_CHANGE_DEFAULT);
                                intent.putExtra(Telephony.Sms.Intents.EXTRA_PACKAGE_NAME, getPackageName());
                                startActivityForResult(intent, 1002);
                            }
                        } catch (Exception e) {
                            e.printStackTrace();
                            openDefaultAppsSettings();
                        }
                    });
                }

                @JavascriptInterface
                public boolean isRoleHeld(String role) {
                    try {
                        String roleConstant = resolveRoleConstant(role);
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                            RoleManager roleManager = getSystemService(RoleManager.class);
                            if (roleManager != null && roleConstant != null) {
                                return roleManager.isRoleHeld(roleConstant);
                            }
                        }
                        if (RoleManager.ROLE_DIALER.equals(roleConstant)) {
                            return isDefaultDialer();
                        } else if (RoleManager.ROLE_SMS.equals(roleConstant)) {
                            return isDefaultSms();
                        }
                        return false;
                    } catch (Exception e) {
                        return false;
                    }
                }

                @JavascriptInterface
                public boolean isRoleAvailable(String role) {
                    try {
                        String roleConstant = resolveRoleConstant(role);
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                            RoleManager roleManager = getSystemService(RoleManager.class);
                            return roleManager != null && roleConstant != null && roleManager.isRoleAvailable(roleConstant);
                        }
                        return true;
                    } catch (Exception e) {
                        return false;
                    }
                }

                @JavascriptInterface
                public boolean isDefaultDialer() {
                    try {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                            RoleManager roleManager = getSystemService(RoleManager.class);
                            if (roleManager != null && roleManager.isRoleAvailable(RoleManager.ROLE_DIALER)) {
                                return roleManager.isRoleHeld(RoleManager.ROLE_DIALER);
                            }
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
                            if (roleManager != null && roleManager.isRoleAvailable(RoleManager.ROLE_SMS)) {
                                return roleManager.isRoleHeld(RoleManager.ROLE_SMS);
                            }
                        }
                        return getPackageName().equals(Telephony.Sms.getDefaultSmsPackage(MainActivity.this));
                    } catch (Exception e) {
                        return false;
                    }
                }

                @JavascriptInterface
                public void openDefaultAppsSettings() {
                    runOnUiThread(() -> {
                        try {
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                                Intent intent = new Intent(android.provider.Settings.ACTION_MANAGE_DEFAULT_APPS_SETTINGS);
                                startActivity(intent);
                                return;
                            }
                        } catch (Exception ignored) {}
                        openAppDetailsSettings();
                    });
                }

                @JavascriptInterface
                public void openAppDetailsSettings() {
                    runOnUiThread(() -> {
                        try {
                            Intent intent = new Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                            intent.setData(android.net.Uri.fromParts("package", getPackageName(), null));
                            startActivity(intent);
                        } catch (Exception e) {
                            e.printStackTrace();
                        }
                    });
                }

                private void notifyRoleResult(String role, boolean granted) {
                    runOnUiThread(() -> {
                        if (webView != null) {
                            String js = String.format("window.dispatchEvent(new CustomEvent('smart_dialer_role_result', { detail: { role: '%s', granted: %b } }));", role, granted);
                            webView.evaluateJavascript(js, null);
                        }
                    });
                }
            }, "AndroidBridge");
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (bridge != null && bridge.getWebView() != null) {
            WebView webView = bridge.getWebView();
            if (requestCode == 1001) {
                boolean isDialer = false;
                try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        RoleManager roleManager = getSystemService(RoleManager.class);
                        isDialer = roleManager != null && roleManager.isRoleHeld(RoleManager.ROLE_DIALER);
                    } else {
                        TelecomManager telecomManager = (TelecomManager) getSystemService(TELECOM_SERVICE);
                        isDialer = telecomManager != null && getPackageName().equals(telecomManager.getDefaultDialerPackage());
                    }
                } catch (Exception ignored) {}
                String js = String.format("window.dispatchEvent(new CustomEvent('smart_dialer_role_result', { detail: { role: 'dialer', granted: %b } }));", isDialer);
                webView.evaluateJavascript(js, null);
            } else if (requestCode == 1002) {
                boolean isSms = false;
                try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        RoleManager roleManager = getSystemService(RoleManager.class);
                        isSms = roleManager != null && roleManager.isRoleHeld(RoleManager.ROLE_SMS);
                    } else {
                        isSms = getPackageName().equals(Telephony.Sms.getDefaultSmsPackage(this));
                    }
                } catch (Exception ignored) {}
                String js = String.format("window.dispatchEvent(new CustomEvent('smart_dialer_role_result', { detail: { role: 'sms', granted: %b } }));", isSms);
                webView.evaluateJavascript(js, null);
            }
        }
}
