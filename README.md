# 🎩 Sehrli Qalpoqcha (Invisibility Cloak)

Garri Potter filmlaridagi afsonaviy **Sehrli Qalpoqcha** (Invisibility Cloak) endi haqiqiy hayotda! Ushbu loyiha Python va OpenCV (Computer Vision) yordamida yozilgan bo'lib, sizga ma'lum bir rangdagi kepkani kiyganingizda ekrandan g'oyib bo'lish imkonini beradi.

Sariq Dev loyihalaridan ilhomlangan holda, bu dasturga **aqlli yuzni aniqlash** mantig'i qo'shilgan. Ya'ni, kepkani shunchaki qo'lda ushlab tursangiz g'oyib bo'lmaysiz, u **aynan boshingizga kiyilgandagina** "sehr" ishga tushadi! 🪄

---

## 🌟 Imkoniyatlari

- **Avtomatik oyna va Interaktiv UI**: Dastur ishga tushishi bilan kamera ochiladi va siz ekranning o'zida klaviatura orqali kepka rangini tanlaysiz.
- **Aqlli G'oyib Bo'lish (Face Detection)**: Dastur inson yuzini taniydi va kepka aynan boshning tepa qismida ekanligini foizlarda hisoblaydi (kamida 15% qoplanishi kerak).
- **Yorug'likka moslashuvchan**: Xira yorug'likda va to'q rangli (ko'k/qora) kepkalarda ham mukammal ishlashi uchun maxsus HSV chegaralari sozlangan.
- **Bir nechta rang tanlovi**: Oq, Ko'k va Qora rangli kepkalar uchun tayyor filtrlar mavjud.

---

## 🛠 O'rnatish va Ishga tushirish

Loyihani o'z kompyuteringizda sinab ko'rish uchun quyidagi qadamlarni bajaring:

### 1. Kerakli kutubxonalarni o'rnatish
Dastur ishlashi uchun `opencv-python` va `numpy` kerak bo'ladi. Ularni terminalda quyidagi buyruq orqali o'rnating:
```bash
pip install -r requirements.txt
```

### 2. Dasturni ishga tushirish
```bash
python invisibility_cloak.py
```

---

## 🎮 Qanday foydalaniladi?

1. **Dasturni ishga tushiring** va kamera oynasi ochilishini kuting.
2. **Rangni tanlang**: Ekranda so'ralganida klaviaturadan o'zingizdagi kepka rangiga mos raqamni bosing (`1` - Ko'k, `2` - Qora, `3` - Oq).
3. **Fonni saqlash**: Rangni tanlaganingizdan so'ng, ekranda *3 soniyali sanoq* ketadi. Bu vaqt ichida **kameradan chetga chiqing**! Dastur xonangizning bo'sh fonini xotirasiga saqlab oladi.
4. **Sehrni sinab ko'ring!** Endi kameraga qaytib ko'rininishingiz mumkin. Kepkangizni boshingizga kiyganingiz zahoti siz g'oyib bo'lasiz va o'rningizda orqa fon ko'rinib qoladi.
5. Dasturdan chiqish uchun klaviaturadan `q` tugmasini bosing.

---

## 🧠 Qanday ishlaydi?

Bu sehr emas, shunchaki matematika va kompyuterni ko'rish texnologiyasi!
1. **Orqa fonni ajratib olish**: Dastur avval bo'sh xonani rasmga oladi.
2. **Rangni ajratish (Color Masking)**: HSV rang fazosidan foydalanib, siz tanlagan kepka rangining qayerda ekanligini topadi.
3. **Yuzni aniqlash (Haar Cascade)**: OpenCV yordamida yuzingizni topadi va rangli maska aynan yuzdan tepada (boshda) joylashganini tekshiradi.
4. **Piksellarni almashtirish**: Agar kepka kiyilgan bo'lsa, siz turgan joydagi piksellar saqlab qo'yilgan "bo'sh orqa fon" piksellari bilan almashtiriladi. Natijada siz ko'rinmas bo'lib qolasiz!

---
*Dasturchi: [Sardor-Dev-2010](https://github.com/Sardor-Dev-2010)*
