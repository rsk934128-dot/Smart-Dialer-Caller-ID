# 📱 GitHub Android APK রিলিজ ও ইনস্টলেশন গাইড (Release Guide)

এই রিপোজিটরি থেকে স্বয়ংক্রিয়ভাবে **Android APK (.apk)** বিল্ড ও রিলিজ করার সম্পূর্ণ ব্যবস্থা যুক্ত করা হয়েছে। 

---

## 🚀 ১. GitHub Actions দিয়ে ১-ক্লিকে APK রিলিজ করা (Automated CI/CD)

আমরা `.github/workflows/build-android-apk.yml` কনফিগার করেছি, যা ২টি উপায়ে স্বয়ংক্রিয়ভাবে Android APK তৈরি করে GitHub Releases-এ যুক্ত করে:

### পদ্ধতি ক: Git Tag দিয়ে স্বয়ংক্রিয় রিলিজ (সবচেয়ে সহজ)
আপনার টার্মিনালে নিচের কমান্ডগুলো রান করুন:
```bash
git tag v1.0.0
git push origin v1.0.0
```
> **কী ঘটবে?** GitHub Actions স্বয়ংক্রিয়ভাবে প্রজেক্টটি বিল্ড করবে, কোড ভেরিফাই করবে এবং একটি নতুন **GitHub Release** তৈরি করে তাতে ডাউনলোডযোগ্য `.apk` ফাইল যুক্ত করে দেবে।

### পদ্ধতি খ: GitHub ওয়েবসাইট থেকে ম্যানুয়াল ১-ক্লিক রিলিজ
1. GitHub-এ আপনার রিপোজিটরিতে যান।
2. উপরের মেনু থেকে **Actions** ট্যাবে ক্লিক করুন।
3. বাম পাশের তালিকা থেকে **"Build & Release Android APK"** সিলেক্ট করুন।
4. ডানপাশে **"Run workflow"** বোতামে ক্লিক করুন।
5. ফর্মের তথ্যগুলো দিন:
   - **Release Tag**: যেমন `v1.0.0` (বা ডিফল্ট রাখুন)
   - **Release Title**: যেমন `Smart Dialer & Fintech Security APK v1.0.0`
   - **Release Notes**: আপনার পছন্দের রিলিজ নোট বা আপডেট বিবরণ
6. সবুজ **"Run workflow"** বাটনে চাপুন।
7. বিল্ড সম্পন্ন হলে GitHub রিপোজিটরির **Releases** সেকশনে স্বয়ংক্রিয়ভাবে ট্যাগ যুক্ত হয়ে APK ফাইলটি ডাউনলোডের জন্য প্রস্তুত হয়ে যাবে!

---

## 📲 ২. অ্যান্ড্রয়েড ফোনে APK ইন্সটল করার নিয়ম

1. আপনার ফোনের ব্রাউজার থেকে GitHub রিপোজিটরির **Releases** পেজে যান।
2. সর্বাধুনিক রিলিজ থেকে **`SmartDialer-release.apk`** ডাউনলোড করুন।
3. ফাইলটিতে ট্যাপ করে **Install** নির্বাচন করুন। (ফোন পারমিশন চাইলে *"Allow from this source"* সক্রিয় করুন)।
4. অ্যাপটি ওপেন করে **"Set as Default Phone App"** বাটনে ট্যাপ করে এটিকে আপনার ফোনের মূল ডায়ালার ও কলার আইডি হিসেবে সক্রিয় করুন।

---

## 🛠️ ৩. লোকাল মেশিনে Android Studio দিয়ে APK বিল্ড করার পদ্ধতি (Optional)

যদি আপনি আপনার কম্পিউটারে লোকালি APK কম্পাইল করতে চান:
```bash
# ১. ডিপেন্ডেন্সি ইনস্টল ও প্রজেক্ট বিল্ড
npm install
npm run build

# ২. ক্যাপাসিটর / অ্যান্ড্রয়েড স্টুডিও ওপেন
npx cap add android
npx cap sync
npx cap open android
```
অ্যান্ড্রয়েড স্টুডিও ওপেন হলে:
- মেনু থেকে `Build > Build Bundle(s) / APK(s) > Build APK(s)` নির্বাচন করুন।
- বিল্ড শেষে `android/app/build/outputs/apk/release/app-release.apk` তৈরি হবে।

---

## 🔐 মূল ফিনটেক ও টেলিকম ফিচারসমূহ:
- **AES-256-GCM Hardware Encrypted Call Recordings**: Room Database-এ হার্ডওয়্যার এনক্রিপ্টেড ভয়েস কল ব্যাকআপ।
- **Category Auto-Recording**: ব্যাংক, ফিনটেক (বিকাশ/নগদ), অফিস ও অপরিচিত কলারদের জন্য স্বয়ংক্রিয় কল রেকর্ডিং রুলস।
- **AI Call Context (Gemini 3.8 Flash)**: রিয়েল-টাইম কলার প্যাটার্ন ও ইন্টেন্ট সামারি।
- **SIM Card Swap & Fraud Protection**: সিম কার্ড পরিবর্তন ও আইপি ভিপিএন স্পুফিং শিল্ড।
