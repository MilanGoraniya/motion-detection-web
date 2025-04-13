const video = document.getElementById('video');
const motionCanvas = document.getElementById('motion');
const startButton = document.getElementById('startButton');
const statusText = document.getElementById('status');
const ctx = motionCanvas.getContext('2d');

let isRunning = false;
let previousFrame = null;
let stream = null;
let motionTimeout = null;

// Motion detection sensitivity (0-255)
const MOTION_THRESHOLD = 30;
// Minimum number of changed pixels to trigger motion detection
const MOTION_PIXEL_COUNT = 1000;
// Time in milliseconds before clearing motion markers
const MOTION_CLEAR_DELAY = 1000;

startButton.addEventListener('click', toggleCamera);

async function toggleCamera() {
    if (!isRunning) {
        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
            video.srcObject = stream;
            isRunning = true;
            startButton.textContent = 'Stop Camera';
            statusText.textContent = 'Camera is active - Detecting motion';
            statusText.classList.add('active');
            detectMotion();
        } catch (err) {
            console.error('Error accessing camera:', err);
            alert('Could not access the camera. Please make sure you have granted camera permissions.');
        }
    } else {
        stopCamera();
    }
}

function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        video.srcObject = null;
    }
    isRunning = false;
    startButton.textContent = 'Start Camera';
    statusText.textContent = 'Camera is off';
    statusText.classList.remove('active');
    clearMotionCanvas();
    previousFrame = null;
    if (motionTimeout) {
        clearTimeout(motionTimeout);
        motionTimeout = null;
    }
}

function clearMotionCanvas() {
    ctx.clearRect(0, 0, motionCanvas.width, motionCanvas.height);
}

function detectMotion() {
    if (!isRunning) return;

    ctx.drawImage(video, 0, 0, motionCanvas.width, motionCanvas.height);
    const currentFrame = ctx.getImageData(0, 0, motionCanvas.width, motionCanvas.height);

    if (previousFrame) {
        const motionPixels = compareFrames(currentFrame.data, previousFrame.data);
        if (motionPixels.length > MOTION_PIXEL_COUNT) {
            // Motion detected
            drawMotion(motionPixels);
            // Reset the timeout since motion was detected
            if (motionTimeout) {
                clearTimeout(motionTimeout);
            }
            // Set new timeout to clear motion markers
            motionTimeout = setTimeout(() => {
                clearMotionCanvas();
            }, MOTION_CLEAR_DELAY);
        }
    }

    previousFrame = currentFrame;
    requestAnimationFrame(detectMotion);
}

function compareFrames(current, previous) {
    const motionPixels = [];
    
    for (let i = 0; i < current.length; i += 4) {
        const rDiff = Math.abs(current[i] - previous[i]);
        const gDiff = Math.abs(current[i + 1] - previous[i + 1]);
        const bDiff = Math.abs(current[i + 2] - previous[i + 2]);
        
        if (rDiff > MOTION_THRESHOLD || gDiff > MOTION_THRESHOLD || bDiff > MOTION_THRESHOLD) {
            const pixelIndex = i / 4;
            const x = pixelIndex % motionCanvas.width;
            const y = Math.floor(pixelIndex / motionCanvas.width);
            motionPixels.push({ x, y });
        }
    }
    
    return motionPixels;
}

function drawMotion(motionPixels) {
    ctx.clearRect(0, 0, motionCanvas.width, motionCanvas.height);
    
    if (motionPixels.length > MOTION_PIXEL_COUNT) {
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
        ctx.lineWidth = 2;
        
        motionPixels.forEach(pixel => {
            ctx.beginPath();
            ctx.arc(pixel.x, pixel.y, 5, 0, 2 * Math.PI);
            ctx.stroke();
        });
    }
}
