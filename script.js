const videoElement = document.getElementById('input_video');
const canvasElement = document.getElementById('output_canvas');
const canvasCtx = canvasElement.getContext('2d', { willReadFrequently: true });

// Holatlar
let bgImageData = null;
let isMagicActive = false;
let isPickingColor = false;
let currentFaces = [];

let pickedHSV = null;
let sensitivity = 45;
let lowerBound = [0, 0, 0];
let upperBound = [180, 255, 255];

// UI Elementlar
const statusDot = document.getElementById('status_dot');
const statusText = document.getElementById('status_text');
const sysMsg = document.getElementById('system_message');
const countdownDisplay = document.getElementById('countdown_display');
const colorPreview = document.getElementById('color_preview');
const colorHex = document.getElementById('color_hex');

// Qadamlarni boshqarish
function setStepState(stepNum, isActive) {
    const stepObj = document.getElementById('step_' + stepNum);
    if (isActive) {
        stepObj.classList.remove('disabled');
        stepObj.classList.add('active');
    } else {
        stepObj.classList.remove('active');
        stepObj.classList.add('disabled');
    }
}

function msg(text) { sysMsg.innerText = text; }

// RGB -> HSV
function rgbToHsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    let max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, v = max;
    let d = max - min;
    s = max === 0 ? 0 : d / max;
    
    if (max !== min) {
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return [Math.round(h * 180), Math.round(s * 255), Math.round(v * 255)];
}

// MediaPipe
const faceDetection = new FaceDetection({locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`;
}});
faceDetection.setOptions({ model: 'short', minDetectionConfidence: 0.5 });
faceDetection.onResults((results) => { currentFaces = results.detections; });

// Kamera va Loop
const camera = new Camera(videoElement, {
    onFrame: async () => {
        await faceDetection.send({image: videoElement});
        drawFrame();
    },
    width: 640,
    height: 480
});

function drawFrame() {
    canvasCtx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
    
    if (isMagicActive && bgImageData) {
        let frameData = canvasCtx.getImageData(0, 0, canvasElement.width, canvasElement.height);
        let pixels = frameData.data;
        let bgPixels = bgImageData.data;
        
        let head_y1 = 0, head_y2 = 0, head_x1 = 0, head_x2 = 0, head_w = 0, head_h = 0;
        
        // Yuz kordinatalarini aniqlash
        if (currentFaces && currentFaces.length > 0) {
            let face = currentFaces[0];
            let box = face.boundingBox;
            let w = box.width * canvasElement.width;
            let h_face = box.height * canvasElement.height;
            let cx = box.xCenter !== undefined ? box.xCenter : (box.xMin !== undefined ? box.xMin + box.width / 2 : 0.5);
            let cy = box.yCenter !== undefined ? box.yCenter : (box.yMin !== undefined ? box.yMin + box.height / 2 : 0.5);
            
            let x = cx * canvasElement.width - w/2;
            let y = cy * canvasElement.height - h_face/2;
            
            head_y1 = Math.max(0, Math.floor(y - h_face * 0.9)); // Kengroq olingan
            head_y2 = Math.floor(y + h_face * 0.4);
            head_x1 = Math.max(0, Math.floor(x - w * 0.3));
            head_x2 = Math.min(canvasElement.width, Math.floor(x + w * 1.3));
            
            head_w = head_x2 - head_x1;
            head_h = head_y2 - head_y1;
        }

        let matchCount = 0;
        let width = canvasElement.width;
        
        // Pixel-by-pixel sehrli plash (orqa fon bilan almashtirish)
        for(let i = 0; i < pixels.length; i += 4) {
            let idx = i / 4;
            let px = idx % width;
            let py = Math.floor(idx / width);
            
            let hsv = rgbToHsv(pixels[i], pixels[i+1], pixels[i+2]);
            if(hsv[0] >= lowerBound[0] && hsv[0] <= upperBound[0] &&
               hsv[1] >= lowerBound[1] && hsv[1] <= upperBound[1] &&
               hsv[2] >= lowerBound[2] && hsv[2] <= upperBound[2]) {
                
                // Matoni fon bilan almashtirish (Plash effekti)
                pixels[i]   = bgPixels[i];
                pixels[i+1] = bgPixels[i+1];
                pixels[i+2] = bgPixels[i+2];
                
                // Agar shu piksel yuzning tepasida (kepka joyida) bo'lsa
                if (head_w > 0 && px >= head_x1 && px <= head_x2 && py >= head_y1 && py <= head_y2) {
                    matchCount++;
                }
            }
        }
        
        let full_vanish = false;
        if (head_w > 0) {
            let roi_area = head_w * head_h;
            let cap_ratio = matchCount / roi_area;
            
            // Agar kepka kiyilgan bo'lsa (kepka joyining 8% idan ko'pi mato rangi bo'lsa)
            if (cap_ratio > 0.08) {
                full_vanish = true;
            }
        }
        
        // Natijani chizish
        if (full_vanish) {
            // Odam butunlay g'oyib bo'ladi
            canvasCtx.putImageData(bgImageData, 0, 0);
        } else {
            // Faqat mato (plash) g'oyib bo'ladi
            canvasCtx.putImageData(frameData, 0, 0);
        }
    }
}

// ---------------- VOQEALAR BOSHQRUVI ----------------

// Qadam 1: Kamerani yoqish
document.getElementById('btn_start_camera').addEventListener('click', () => {
    msg("Kamera yoqilmoqda...");
    camera.start().then(() => {
        statusDot.className = "dot active";
        statusText.innerText = "Kamera yoniq";
        msg("Kamera muvaffaqiyatli yoqildi!");
        setStepState(2, true);
        document.getElementById('btn_start_camera').disabled = true;
    });
});

// Qadam 2: Fonni saqlash
document.getElementById('btn_save_bg').addEventListener('click', () => {
    let timeLeft = 3;
    countdownDisplay.style.display = 'block';
    countdownDisplay.innerText = `Kutish: ${timeLeft}...`;
    msg("Iltimos, kadrdan chetga chiqing!");
    
    let interval = setInterval(() => {
        timeLeft--;
        countdownDisplay.innerText = `Kutish: ${timeLeft}...`;
        if (timeLeft <= 0) {
            clearInterval(interval);
            bgImageData = canvasCtx.getImageData(0, 0, canvasElement.width, canvasElement.height);
            countdownDisplay.innerText = "Fon saqlandi!";
            msg("Ajoyib! Endi ekrandan kepka rangini tanlang.");
            setStepState(3, true);
            isPickingColor = true;
            document.getElementById('color_picker_overlay').style.display = 'flex';
        }
    }, 1000);
});

// Qadam 3: Rangni tanlash (Canvas ustiga bosish)
canvasElement.addEventListener('click', (e) => {
    if (!isPickingColor) return;
    
    // Canvas CSS orqali (transform: scaleX(-1)) teskari qilingan. 
    // Shuning uchun x o'qini teskarisiga o'zgartiramiz.
    const rect = canvasElement.getBoundingClientRect();
    const scaleX = canvasElement.width / rect.width;
    const scaleY = canvasElement.height / rect.height;
    
    let clickX = (e.clientX - rect.left) * scaleX;
    let realX = canvasElement.width - clickX; // Mirroring fix
    let realY = (e.clientY - rect.top) * scaleY;
    
    let pixel = canvasCtx.getImageData(realX, realY, 1, 1).data;
    pickedHSV = rgbToHsv(pixel[0], pixel[1], pixel[2]);
    
    // UI yangilash
    colorPreview.style.backgroundColor = `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;
    colorHex.innerText = `Tanlangan rang (RGB: ${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;
    
    updateColorBounds();
    
    msg("Rang muvaffaqiyatli tanlandi! Endi sehrni yoqishingiz mumkin.");
    document.getElementById('color_picker_overlay').style.display = 'none';
    isPickingColor = false; // Boshqa bosilmaydi
    
    setStepState(4, true);
    document.getElementById('btn_start_magic').disabled = false;
});

// Sezgirlik Slayderi
document.getElementById('sensitivity').addEventListener('input', (e) => {
    sensitivity = parseInt(e.target.value);
    document.getElementById('sens_val').innerText = sensitivity;
    if (pickedHSV) updateColorBounds();
});

function updateColorBounds() {
    if (!pickedHSV) return;
    let h = pickedHSV[0], s = pickedHSV[1], v = pickedHSV[2];
    
    // Hue diapazoni (sekuvchi sezgirlikka qarab)
    let hue_tol = Math.min(sensitivity / 2, 90);
    // Saturation va Value uchun kengroq ochiqlik
    let sv_tol = sensitivity * 1.5;
    
    lowerBound = [
        Math.max(0, h - hue_tol),
        Math.max(40, s - sv_tol), // S juda pasayib ketmasligi uchun (kulrang/qorani olmasin)
        Math.max(40, v - sv_tol)  // V juda pasayib qora soyalarni olmasligi uchun
    ];
    upperBound = [
        Math.min(180, h + hue_tol),
        Math.min(255, s + sv_tol + 50),
        Math.min(255, v + sv_tol + 50)
    ];
}

// Qadam 4: Sehrni yoqish
document.getElementById('btn_start_magic').addEventListener('click', () => {
    isMagicActive = !isMagicActive;
    let btn = document.getElementById('btn_start_magic');
    if(isMagicActive) {
        btn.innerText = "Sehrni o'chirish";
        btn.style.background = "#e74c3c";
        btn.style.borderColor = "#c0392b";
        msg("Sehr ishga tushdi! Kepkani kiying.");
    } else {
        btn.innerText = "Sehrni yoqish";
        btn.style.background = "var(--primary-btn)";
        btn.style.borderColor = "var(--primary-btn)";
        msg("Sehr o'chirildi.");
    }
});
