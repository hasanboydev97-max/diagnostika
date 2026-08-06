# Asosiy Sahifaning Yangilanishi (Premium Portfolio Uslubi)

Siz taqdim etgan "Premium Minimalist UI Konsepsiyasi" asosida Asosiy sahifa (Landing) va maxsus kursor muvaffaqiyatli yangilandi!

## 1. Maxsus Kursor (Lupa)
Rasmdagi kabi katta, nafis va "mix-blend-difference" xususiyatiga ega kursor yaratildi.
- **O'lchami**: 64x64px (Oldingisidan 2 barobar katta)
- **Rangi**: Sof oq, orqadagi fon va matnlarni inversiya qilib ("rentgen" effektida) ko'rsatadi.
- **Interaktivlik**: Havolalar va tugmalar ustiga borganida u 1.5 barobar silliq kattalashadi.

## 2. 12-Ustunli (Column) Asimmetrik Layout
Asosiy sahifa to'liq qayta yozildi.
- Sahifaning chap qismida (4 ustun) kategoriyalar (Masalan: PORTALS, F.A.Q) sahifa bilan birga pastga aylanmay, yopishib turadigan qilib (sticky top-32) sozlandi.
- O'ng qismida (8 ustun) esa asosiy kontent va sarlavhalar katta ekranlarga mos katta shriftlarda joylashtirildi.

## 3. Tipografiya va Bo'shliqlar (Spacing)
- Kategoriya nomlari kichik harflarda, orasi ochiq qilib (`tracking-[0.3em]`, uppercase) dizayn qilindi.
- Qatorlar orasidagi masofa kengaytirildi (`py-24`, `md:py-32`), natijada ma'lumotlar bir-biriga yopishib qolmasligi va "nafas olishi" ta'minlandi.
- Ortiqcha borderlar o'chirilib, faqag 10% qora shaffof chiziqlar bilan ajratildi.

## 4. Framer Motion Animatsiyalari
- Sahifani pastga aylantirganingizda har bir bo'lim sekin, pastdan tepaga qarab (fade in, slide up) silliq paydo bo'ladi.
- **Akordionlar (F.A.Q)**: O'ng tarafdagi `+` belgisi ustiga bosganda javoblar vizual tarzda uzilishlarsiz va silkinishsiz ochiladi, belgi esa chiroyli tarzda aylanib `x` shaklini oladi.

Ushbu uslub endi butun platformaning yuzini "Senior" va juda qimmatbaho loyihalardek ko'rsatishini ta'minlaydi. 
Iltimos, Vercel Build tugagach tizimga kirib kursor va Asosiy Sahifa o'zgarishini baholang!
