import cv2
import numpy as np
import time
import os
import urllib.request

target_hsv = None

def select_color(event, x, y, flags, param):
    global target_hsv
    if event == cv2.EVENT_LBUTTONDOWN:
        frame = param
        hsv_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
        target_hsv = hsv_frame[y, x]
        print(f"Rang muvaffaqiyatli tanlandi! HSV: {target_hsv}")

def main():
    cap = cv2.VideoCapture(0)
    cv2.namedWindow("Sehrli Qalpoqcha")
    
    color_name = "Oq"
    lower_bound = np.array([0, 0, 160])
    upper_bound = np.array([180, 60, 255])
    
    # 1. Rangni UI orqali tanlash
    while cap.isOpened():
        ret, img = cap.read()
        if not ret: break
        img = cv2.flip(img, 1)
        
        cv2.putText(img, "Kepka rangini tanlang (Klaviaturadan bosing):", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        cv2.putText(img, "1 - Ko'k", (10, 70), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 0, 0), 2)
        cv2.putText(img, "2 - Qora", (10, 110), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
        cv2.putText(img, "3 - Oq", (10, 150), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        
        cv2.imshow("Sehrli Qalpoqcha", img)
        
        key = cv2.waitKey(1) & 0xFF
        if key == ord('1'):
            lower_bound = np.array([70, 30, 10])
            upper_bound = np.array([150, 255, 255])
            color_name = "Ko'k"
            break
        elif key == ord('2'):
            lower_bound = np.array([0, 0, 0])
            upper_bound = np.array([180, 255, 90])
            color_name = "Qora"
            break
        elif key == ord('3'):
            lower_bound = np.array([0, 0, 160])
            upper_bound = np.array([180, 60, 255])
            color_name = "Oq"
            break
        elif key == ord('q'):
            cap.release()
            cv2.destroyAllWindows()
            return
            
    # 2. Orqa fonni olish qismi
    background = None
    for i in range(100):
        ret, img = cap.read()
        if not ret: break
        img = cv2.flip(img, 1)
        
        cv2.putText(img, "Diqqat! Orqa fon rasmga olinmoqda.", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
        cv2.putText(img, "Kameradan chetga chiqing!", (10, 70), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
        cv2.putText(img, f"Kutish: {100-i} kadr", (10, 110), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
        
        cv2.imshow("Sehrli Qalpoqcha", img)
        cv2.waitKey(30)
        
        # Eng oxirgi kadrni orqa fon sifatida saqlaymiz
        if i == 99:
            background = img.copy()

    if background is None:
        print("Kameradan tasvir olishda xatolik yuz berdi.")
        return
    
    # Yuzni aniqlovchi klassifikatorni yuklash (odam yuzini topish uchun)
    cascade_path = "haarcascade_frontalface_default.xml"
    if not os.path.exists(cascade_path):
        print("Yuzni aniqlash fayli yuklab olinmoqda...")
        url = "https://raw.githubusercontent.com/opencv/opencv/master/data/haarcascades/haarcascade_frontalface_default.xml"
        urllib.request.urlretrieve(url, cascade_path)
    
    face_cascade = cv2.CascadeClassifier(cascade_path)
    
    # Oynani oldindan yaratgan edik
    
    is_currently_invisible = False

    while cap.isOpened():
        ret, img = cap.read()
        if not ret:
            break
            
        img = cv2.flip(img, 1)
        
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        mask = cv2.inRange(hsv, lower_bound, upper_bound)
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8), iterations=2)
        mask = cv2.morphologyEx(mask, cv2.MORPH_DILATE, np.ones((3, 3), np.uint8), iterations=1)
        
        # 1. Yuzlarni aniqlash (xira yorug'lik uchun sezgirlik oshirildi)
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, 1.1, 4)
        
        # Agar yuz topilsa, kepka uning tepasida (boshida) ekanligini tekshiramiz
        if len(faces) > 0:
            # Eng katta yuzni topish (kamera oldidagi foydalanuvchi)
            faces = sorted(faces, key=lambda f: f[2]*f[3], reverse=True)
            x, y, w, h_face = faces[0]
            
            # Yuz aniqlanganini bildirish uchin chizilgan ramka olib tashlandi
            # cv2.rectangle(img, (x, y), (x+w, y+h_face), (255, 0, 0), 2)
            
            # Bosh qismi uchun koordinatalar (yuzdan tepasi va peshona)
            head_y1 = max(0, int(y - h_face * 0.8))
            head_y2 = int(y + h_face * 0.3)
            head_x1 = max(0, int(x - w * 0.2))
            head_x2 = min(img.shape[1], int(x + w * 1.2))
            
            # Bosh qismidagi maskani ajratib olamiz
            head_roi_mask = mask[head_y1:head_y2, head_x1:head_x2]
            cap_pixels_on_head = cv2.countNonZero(head_roi_mask)
            
            # Bosh qismining umumiy maydoni (piksellarda)
            roi_area = (head_y2 - head_y1) * (head_x2 - head_x1)
            
            # Kepka rangi bosh qismining necha foizini egallaganini hisoblaymiz
            cap_ratio = cap_pixels_on_head / roi_area if roi_area > 0 else 0
            
            # Agar boshning tepa qismida kamida 15% kepka rangi bo'lsagina kiyilgan hisoblanadi
            if cap_ratio > 0.15:
                is_currently_invisible = True
            elif cap_ratio < 0.05:
                # Kepka boshida emas! Yuz ko'rinib turibdi
                is_currently_invisible = False

        if is_currently_invisible:
            final_output = background.copy()
            yozuv = "Sehrli qalpoqcha kiydingiz! Siz ko'rinmayapsiz!"
        else:
            final_output = img.copy()
            yozuv = f"{color_name} kepkani boshingizga kiysangiz yashirinasiz..."
        
        final_output = np.ascontiguousarray(final_output, dtype=np.uint8)
        cv2.putText(final_output, yozuv, (20, 40), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        
        # Ekranlar
        cv2.imshow("Sehrli Qalpoqcha", final_output)
        
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
