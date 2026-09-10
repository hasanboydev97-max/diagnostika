# 🚀 Maktab Diagnostika Platformasi - Senior Architecture & Project Overview

Ushbu hujjat **Maktab Diagnostika Platformasi** loyihasini har qanday Cloud AI (Gemini, ChatGPT, Claude va b.) uchun to'liq tushuntirib berish va kelgusida loyihaga texnik o'zgartirishlar kiritishda "Context" (Kontekst) sifatida ishlatish uchun mo'ljallangan. Ushbu hujjatni o'qigan AI loyihaning maqsadi, arxitekturasi va texnologik steki haqida to'liq Senior-level tasavvurga ega bo'ladi.

---

## 1. 📌 Loyiha Haqida Umumiy Ma'lumot (Executive Summary)
**Maktab Diagnostika Platformasi** — bu o'quv markazlari va maktablar uchun mo'ljallangan **MERN** (MongoDB, Express, React, Node.js) stekiga asoslangan Fullstack tizim. 
Loyiha o'quvchilarning bilimini turli mezonlar bo'yicha baholash, natijalarni vizualizatsiya qilish (Radar-chart, Infografikalar) va natijalarga asoslanib Google Gemini AI yordamida ota-onalar hamda o'qituvchilar uchun psixologik va akademik xulosalar yaratishga xizmat qiladi.

- **Ishlash prinsipi:** Monorepo uslubida bitta papka ichida frontend (`src/`) va backend (`server/`) birlashtirilgan.
- **O'ziga xosligi:** "Bulk actions" (ommaviy baholash), AI-asosida xulosalar generatsiyasi (Gemini API), DOCX/PDF formatda hisobotlar yaratish, Telegram orqali bildirishnomalar va WebSockets orqali Real-time aloqa.

---

## 2. 🛠 Texnologik Stek (Tech Stack)

### Frontend (Client-side)
- **Framework:** React 19, Vite, TypeScript
- **Styling:** Tailwind CSS (v4), Framer Motion (Murakkab va psixologik ta'sir ko'rsatuvchi animatsiyalar uchun), `clsx`, `tailwind-merge`
- **Routing:** React Router v7
- **UI Components:** Lucide-react (ikonkalar), Sonner (toast xabarlari), Recharts (diagrammalar)
- **Tahlil va Render:** React-markdown, KaTeX (matematik formulalar uchun), React-latex-next
- **Boshqalar:** Html-to-image, Socket.io-client, i18next (Ko'p tillilik)

### Backend (Server-side)
- **Muhit:** Node.js, Express (v5.2)
- **Ma'lumotlar Bazasi:** MongoDB (Atlas), Mongoose (v9.9)
- **Autentifikatsiya:** JWT (JSON Web Token), Bcryptjs (Parollarni heshlash)
- **Fayllar Boshqaruvi:** Multer, Cloudinary (rasmlarni bulutga yuklash)
- **AI Integratsiya:** `@google/generative-ai` (Gemini API - Prompt engineering bilan)
- **Hujjat Generatsiyasi:** Puppeteer, docx, docx-templates, PDFKit, jsPDF
- **Real-time:** Socket.io
- **Xavfsizlik & Performans:** Helmet, Express-rate-limit, CORS, p-limit

---

## 3. 🏗 Arxitektura va Papkalar Strukturasi

Loyiha "Monolithic/Monorepo" strukturasiga ega, `package.json` dagi `concurrently` orqali frontend va backend bitta terminalda ishga tushadi.

```text
maktab-test/
│
├── src/                # Frontend React ilovasi (UI, State, API calls)
│   ├── components/     # Qayta ishlatiluvchi UI komponentlar
│   ├── pages/          # Asosiy sahifalar (Dashboard, Test, Result)
│   ├── hooks/          # Custom React Hookslar
│   ├── utils/          # Yordamchi funksiyalar
│   └── ...
│
├── server/             # Backend Express ilovasi
│   ├── controllers/    # Biznes mantiq (Business logic)
│   ├── models/         # Mongoose Schemalar
│   ├── routes/         # Express API marshrutlari (Endpoints)
│   ├── middleware/     # Auth, Error handling, Rate limiting
│   ├── sockets/        # Socket.io eventlari
│   └── utils/          # Gemini AI promptlari, fayl yuklash utilitalari
│
├── dist/               # Build qilingan frontend fayllari
├── public/             # Ommaviy statik fayllar
├── uploads/            # Vaqtinchalik serverga yuklangan fayllar
├── .env                # Maxfiy kalitlar (DB URI, Gemini API, JWT secret)
└── package.json        # Asosiy konfiguratsiya (NPM)
```

---

## 4. 🗄 Ma'lumotlar Bazasi Modeli (Database Schema)

Tizimda asosan quyidagi Mongoose kolleksiyalari mavjud (`server/models/index.js`):

1. **`Teacher` (O'qituvchi / Admin):**
   - Tizimdan foydalanuvchi asosiy shaxslar. Role-based Access Control (RBAC) o'rnatilgan (`teacher` yoki `admin`).
   - Obuna tizimi (`free`, `standard`, `premium`) va AI limitlari (`dailyAiCount`) boshqariladi.
2. **`Result` (Diagnostika Natijasi):**
   - O'quvchining oflayn/diagnostika testlari natijalari saqlanadi.
   - O'z ichiga savollar kesimidagi natijalar va **Gemini AI tomonidan yozilgan** xulosa (`aiSummaryText`) hamda tavsiyalarni (`aiAdviceText`) oladi.
3. **`OnlineTest` & `OnlineTestResult` (Onlayn Testlar):**
   - O'qituvchi tomonidan yaratilgan onlayn testlar va o'quvchilarning real-vaqtdagi javoblari, AI feedbacklari saqlanadi.
4. **`TelegramSubscription` (Bildirishnomalar):**
   - Ota-onalarga farzandlarining natijasi tayyor bo'lganda avtomatik xabar yuborish uchun ChatID va o'quvchi aloqasi saqlanadi.
5. **`GameRecord`:** Gamifikatsiya yoki interaktiv o'yinlar uchun natijalar.

---

## 5. 🧠 Asosiy Biznes Mantiq (Core Business Logic)

- **AI-Powered Analysis (Gemini Integration):** Natijalar hisoblanib bo'lgach, tizim parametrlar, ballar va yo'nalishlarni to'playdi va kompleks "Prompt" orqali Gemini AI ga yuboradi. AI psixologik va akademik tahlil matnini qaytaradi.
- **Performance & Bulk Evaluation:** Tizim 15 yillik dasturchilar amaliyotiga mos tarzda "Ommaviy baholash" mexanizmini qo'llab-quvvatlaydi. O'qituvchi bir necha o'quvchi natijalarini "Select all", "Invert selection" orqali juda tezkor kiritishi mumkin.
- **Hujjatlarni Generatsiya Qilish (Reports Engine):** O'ziga xos murakkab backend funksiyalaridan biri – dinamik DOCX va PDF yaratish. Tizim matematik formulalarni (`mathml2omml`) Word formatiga to'g'ri o'tkaza oladi. `Puppeteer` yordamida esa ba'zi murakkab HTML/CSS sahifalar sifatli PDF ga o'giriladi.
- **Xavfsizlik va Arxitektura:** 
   - Backendda rate-limiting o'rnatilgan (DDoS va spamdan himoya).
   - "Intriga-Loading" maxsus animatsiya tizimi ishlab chiqilgan (Ota-onalarda xolis tekshiruv va tizim tahliliga bo'lgan ishonchni oshirish uchun).

---

## 6. 🤖 Cloud AI (Siz) Uchun Ko'rsatmalar

Agar foydalanuvchi sizdan kod yozishni, xatolikni tuzatishni yoki yangi imkoniyat qo'shishni so'rasa, quyidagilarga qat'iy amal qiling:
1. **ES Modules (`import/export`):** Backend va Frontend ham to'liq ES Modules orqali ishlaydi (`package.json` da `"type": "module"`).
2. **Fayl Strukturasini Hurmat Qiling:** Yangi marshrut qo'shilganda uni `server/routes/` ga, logikani esa `server/controllers/` ga yozing. Frontend uchun `src/components/` yoki `src/pages/` dan foydalaning.
3. **Tailwind v4+:** Styling uchun Tailwind css klasslaridan foydalaning, iloji boricha custom CSS yozmaslikka harakat qiling.
4. **AI Xarajatlarini Optimizatsiya Qiling:** AI so'rovlarini qisqartirish, keshdan foydalanish yoki Promptlarni qisqa-londa yozish bo'yicha maslahatlar bering.
5. **Xavfsizlikni Unutmang:** Har qanday API o'zgarishlarida foydalanuvchi (Teacher) limitlarini (`dailyAiCount`) va obuna turini (`plan`) hisobga oluvchi middleware'larni chaqiring.

Ushbu loyiha sifat, tezlik va avtomatlashtirishga qaratilgan **Senior-level** arxitektura bo'lib, har qanday o'zgartirish shu darajadagi ehtiyotkorlik va "Best Practices" orqali qilinishi shart.
