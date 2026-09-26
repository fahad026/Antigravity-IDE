# GasRMS Telemetry Monitor — ডেপ্লয়মেন্ট গাইড (Deployment Guide)

এই প্রোজেক্টটি একটি **Full-Stack SCADA & Industrial IoT Telemetry** অ্যাপ্লিকেশন (React 19 + Vite Frontend, Express 5 + Server-Sent Events Backend, এবং SQLite/JSON পারসিস্টেন্স)।

আমরা প্রোজেক্টটিকে এমনভাবে কনফিগার করেছি যাতে এটি **একটি সিঙ্গেল সার্ভার কমান্ডেই ফ্রন্টএন্ড এবং ব্যাকএন্ড উভয়েই একসাথে রান করতে পারে**।

---

## 🚀 পদ্ধতি ১: Render.com (সবচেয়ে সহজ এবং ফ্রি)

[Render.com](https://render.com) এ ফুলস্ট্যাক Node.js অ্যাপ ফ্রি হোস্টিং করা যায়।

### ধাপসমূহ:
1. কোডটি আপনার **GitHub** রিপোজিটরিতে Push করুন:
   ```bash
   git init
   git add .
   git commit -m "feat: Gas RMS 4-Stage IoT SCADA Dashboard"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/gas-rms-telemetry.git
   git push -u origin main
   ```
2. [Render Dashboard](https://dashboard.render.com/) এ গিয়ে **New +** ➔ **Web Service** সিলেক্ট করুন।
3. আপনার GitHub রিপোজিটরি কানেক্ট করুন।
4. সেটিংস কনফিগার করুন:
   - **Name:** `gas-rms-telemetry`
   - **Environment:** `Node`
   - **Branch:** `main`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
5. **Create Web Service** বাটনে ক্লিক করুন। ২ মিনিটের মধ্যে আপনার লাইভ URL চালু হয়ে যাবে (যেমন: `https://gas-rms-telemetry.onrender.com`)!

---

## ⚡ পদ্ধতি ২: Railway.app

[Railway.app](https://railway.app) স্বয়ংক্রিয়ভাবে `package.json`-এর `build` ও `start` স্ক্রিপ্ট ডিটেক্ট করে ফেলে।

### ধাপসমূহ:
1. [Railway.app](https://railway.app) এ লগইন করে **New Project** ➔ **Deploy from GitHub repo** সিলেক্ট করুন।
2. আপনার রিপোজিটরি পছন্দ করুন।
3. Railway স্বয়ংক্রিয়ভাবে `npm run build` চালিয়ে `npm start` এক্সিকিউট করবে।
4. **Settings** ➔ **Networking** ➔ **Generate Domain**-এ ক্লিক করলেই পাবলিক লিংক পেয়ে যাবেন।

---

## 🐳 পদ্ধতি ৩: Docker দিয়ে যে কোনো ক্লাউড বা VPS-এ ডেপ্লয়

প্রোজেক্টে একটি প্রোডাকশন-রেডি `Dockerfile` যুক্ত করা আছে।

### ১. ডকার ইমেজ তৈরি:
```bash
docker build -t gasrms-app .
```

### ২. ডকার কনটেইনার রান:
```bash
docker run -d -p 3001:3001 --name gasrms-container --restart always gasrms-app
```
এখন ব্রাউজারে `http://SERVER_IP:3001` ওপেন করলেই ড্যাশবোর্ড পেয়ে যাবেন।

---

## 💻 পদ্ধতি ৪: নিজস্ব VPS (Ubuntu / Debian / AWS EC2 / DigitalOcean)

যদি আপনার নিজস্ব লিনাক্স সার্ভার থাকে:

```bash
# ১. রিপোজিটরি ক্লোন করুন
git clone https://github.com/YOUR_USERNAME/gas-rms-telemetry.git
cd gas-rms-telemetry

# ২. ডিপেন্ডেন্সি ইনস্টল ও বিল্ড করুন
npm install
npm run build

# ৩. PM2 দিয়ে ব্যাকগ্রাউন্ডে পারসিস্টেন্টলি চালু রাখুন
npm install -g pm2
pm2 start "npm start" --name "gasrms-scada"
pm2 save
pm2 startup
```

Nginx রিভার্স প্রক্সি কনফিগারেশন (`/etc/nginx/sites-available/default`):
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;

        # SSE (Server-Sent Events) এর জন্য বাফারিং বন্ধ রাখা প্রয়োজন
        proxy_buffering off;
        proxy_read_timeout 86400s;
    }
}
```

---

## 🧪 পদ্ধতি ৫: লোকাল নেটওয়ার্কে প্রোডাকশন টেস্ট

লোকাল মেশিনে প্রোডাকশন বিল্ড টেস্ট করতে চাইলে:
```bash
# ১. প্রোডাকশন বান্ডিল তৈরি করুন
npm run build

# ২. প্রোডাকশন মোডে সার্ভার রান করুন
npm start
```
ব্রাউজারে ভিজিট করুন: **`http://localhost:3001`**
(একই পোর্টে ফ্রন্টএন্ড এবং ব্যাকএন্ড উভয়ই স্মুথলি চলবে)।
