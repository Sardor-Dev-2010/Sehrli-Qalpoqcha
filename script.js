const videoElement = document.getElementById('input_video');
const canvasElement = document.getElementById('output_canvas');
const canvasCtx = canvasElement.getContext('2d', { willReadFrequently: true });

let bgImageData = null;
let isMagicActive = false;
let isCountingDown = false;
let currentFaces = [];

let lowerBound = [0, 0, 0];
let upperBound = [180, 255, 255];

const colors = {
    'blue': { lower: [70, 30, 10], upper: [150, 255, 255] },
    'black': { lower: [0, 0, 0], upper: [180, 255, 140] }, // Qora rangni yorug'roq joyda ham olishi uchun V 140 gacha ko'tarildi
    'white': { lower: [0, 0, 160], upper: [180, 60, 255] }
};

// RGB dan OpenCV HSV ga o'tkazish funksiyasi
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

// MediaPipe Face Detection o'rnatish
const faceDetection = new FaceDetection({locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`;
}});

faceDetection.setOptions({
    model: 'short',
    minDetectionConfidence: 0.5
});

faceDetection.onResults((results) => {
    currentFaces = results.detections;
});

// Asosiy rasm chizish tsikli
function drawFrame() {
    canvasCtx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
    
    if (isCountingDown) {
        return; // Sanoq paytida sehr ishlamaydi
    }
    
    if (isMagicActive && bgImageData && currentFaces && currentFaces.length > 0) {
        // Eng yirik yuzni olish
        let face = currentFaces[0];
        let box = face.boundingBox;
        
        let w = box.width * canvasElement.width;
        let h_face = box.height * canvasElement.height;
        
        // Kutubxona versiyalaridagi farqlarni oldini olish (xCenter yoki xMin)
        let cx = box.xCenter !== undefined ? box.xCenter : (box.xMin !== undefined ? box.xMin + box.width / 2 : 0.5);
        let cy = box.yCenter !== undefined ? box.yCenter : (box.yMin !== undefined ? box.yMin + box.height / 2 : 0.5);
        
        let x = cx * canvasElement.width - w/2;
        let y = cy * canvasElement.height - h_face/2;
        
        let head_y1 = Math.max(0, Math.floor(y - h_face * 0.8));
        let head_y2 = Math.floor(y + h_face * 0.3);
        let head_x1 = Math.max(0, Math.floor(x - w * 0.2));
        let head_x2 = Math.min(canvasElement.width, Math.floor(x + w * 1.2));
        
        let head_w = head_x2 - head_x1;
        let head_h = head_y2 - head_y1;
        
        if (head_w > 0 && head_h > 0) {
            let imgData = canvasCtx.getImageData(head_x1, head_y1, head_w, head_h);
            let pixels = imgData.data;
            let matchCount = 0;
            
            for(let i = 0; i < pixels.length; i += 4) {
                let hsv = rgbToHsv(pixels[i], pixels[i+1], pixels[i+2]);
                
                if(hsv[0] >= lowerBound[0] && hsv[0] <= upperBound[0] &&
                   hsv[1] >= lowerBound[1] && hsv[1] <= upperBound[1] &&
                   hsv[2] >= lowerBound[2] && hsv[2] <= upperBound[2]) {
                    matchCount++;
                }
            }
            
            let roi_area = head_w * head_h;
            let cap_ratio = matchCount / roi_area;
            
            // Debug uchun: ekranda izlayotgan joyimizni va foizni ko'rsatamiz (foydalanuvchiga yordam uchun)
            canvasCtx.strokeStyle = "rgba(255, 0, 0, 0.5)";
            canvasCtx.lineWidth = 2;
            canvasCtx.strokeRect(head_x1, head_y1, head_w, head_h);
            canvasCtx.fillStyle = "red";
            canvasCtx.font = "16px Arial";
            canvasCtx.fillText(`Rang mosligi: ${(cap_ratio * 100).toFixed(1)}%`, head_x1, head_y1 - 10);
            
            // Agar yuzning tepasida kamida 15% tanlangan rang bo'lsa -> g'oyib bo'lish
            if (cap_ratio > 0.15) {
                canvasCtx.putImageData(bgImageData, 0, 0);
            }
        }
    }
}

// Kamerani ulash
const camera = new Camera(videoElement, {
    onFrame: async () => {
        await faceDetection.send({image: videoElement});
        drawFrame();
    },
    width: 640,
    height: 480
});

camera.start().then(() => {
    document.getElementById('status_overlay').style.display = 'none';
});

// UI tugmalari mantiqlari
document.querySelectorAll('.color-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        let color = e.target.dataset.color;
        lowerBound = colors[color].lower;
        upperBound = colors[color].upper;
        
        document.getElementById('step_1').style.display = 'none';
        document.getElementById('step_2').style.display = 'block';
        
        startCountdown();
    });
});

function startCountdown() {
    isCountingDown = true;
    let timeLeft = 3;
    let bar = document.getElementById('progress_bar');
    let text = document.getElementById('countdown_text');
    
    let interval = setInterval(() => {
        timeLeft -= 0.1;
        bar.style.width = ((3 - timeLeft) / 3 * 100) + '%';
        text.innerText = Math.ceil(timeLeft) + " soniya qoldi";
        
        if(timeLeft <= 0) {
            clearInterval(interval);
            // Orqa fonni rasmga olish va saqlash
            bgImageData = canvasCtx.getImageData(0, 0, canvasElement.width, canvasElement.height);
            isCountingDown = false;
            isMagicActive = true;
            
            document.getElementById('step_2').style.display = 'none';
            document.getElementById('step_3').style.display = 'block';
        }
    }, 100);
}

document.getElementById('reset_btn').addEventListener('click', () => {
    isMagicActive = false;
    bgImageData = null;
    document.getElementById('step_3').style.display = 'none';
    document.getElementById('step_1').style.display = 'block';
});
