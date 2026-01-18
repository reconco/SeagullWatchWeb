// 스톱워치 인스턴스 생성
const stopwatch = new Stopwatch(
    document.getElementById('display'),
    document.getElementById('startBtn'),
    document.getElementById('pauseBtn')
);
// 전역 접근 허용
window.stopwatch = stopwatch;

// 타이머 인스턴스 생성
const timerInputs = {
    hours: document.getElementById('timerHours'),
    minutes: document.getElementById('timerMinutes'),
    seconds: document.getElementById('timerSeconds')
};

const timer = new Timer(
    document.getElementById('timerDisplay'),
    document.querySelector('.timer-inputs'),
    timerInputs,
    document.getElementById('timerStartBtn'),
    document.getElementById('timerPauseBtn')
);

// --- 이벤트 리스너 연결 ---

// 스톱워치 이벤트
document.getElementById('startBtn').addEventListener('click', () => stopwatch.start());
document.getElementById('pauseBtn').addEventListener('click', () => stopwatch.pause());
document.getElementById('resetBtn').addEventListener('click', () => stopwatch.reset());

// 타이머 이벤트
document.getElementById('timerStartBtn').addEventListener('click', () => timer.start());
document.getElementById('timerPauseBtn').addEventListener('click', () => timer.pause());
document.getElementById('timerResetBtn').addEventListener('click', () => timer.reset());

// 탭 전환 기능
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // 실행 중일 경우 탭 전환 방지
        if (stopwatch.isRunning || timer.isRunning) {
            showCustomAlert("실행 중에는 탭을 전환할 수 없습니다.\n먼저 정지하거나 리셋해주세요.");
            return;
        }

        // 탭 UI 전환
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        
        btn.classList.add('active');
        const tabId = btn.getAttribute('data-tab');
        document.getElementById(tabId).classList.add('active');

        // 패턴 컨테이너 표시/숨김 처리
        const patternContainer = document.getElementById('patternContainer');
        if (tabId === 'timer') {
            patternContainer.style.display = 'none';
        } else {
            patternContainer.style.display = 'block';
        }
    });
});

// 초기 버튼 상태 설정
stopwatch.pauseBtn.disabled = true;
timer.pauseBtn.disabled = true;

// --- 볼륨 조절 기능 ---
const volumeSliders = [
    { slider: document.getElementById('stopwatchVolumeSlider'), icon: document.getElementById('stopwatchVolumeIcon') },
    { slider: document.getElementById('timerVolumeSlider'), icon: document.getElementById('timerVolumeIcon') }
];

// --- 패턴 관리 기능 초기화 중 제거됨 (PatternManager.js로 이동) ---

function updateVolume(volume) {
    timer.setVolume(volume);
    stopwatch.setVolume(volume);
    const iconText = volume === 0 ? '🔇' : '🔊';
    
    volumeSliders.forEach(item => {
        if(item.slider) {
             item.slider.value = volume;
             item.icon.textContent = iconText;
        }
    });
}

volumeSliders.forEach(item => {
    if(item.slider) {
        item.slider.addEventListener('input', (e) => {
            updateVolume(parseFloat(e.target.value));
        });
    }
});

// --- 설정 모달 기능 ---
const modal = document.getElementById('settingsModal');
const settingsBtn = document.getElementById('settingsBtn');
const closeBtn = document.getElementsByClassName('close-btn')[0];

window.onPatternChanged = () => {
    if (stopwatch) {
        stopwatch.refreshPatterns();
        stopwatch.updateNewPatternPrediction();
    }
};

window.onNewPatternInput = () => {
    if (stopwatch) {
        stopwatch.updateNewPatternPrediction();
    }
};

window.calculatePatternPrediction = (index, ms) => {
    if (stopwatch) {
        return stopwatch.getPredictionForPattern(index, ms);
    }
    return null;
};


// 체크박스 변경 시에도 업데이트
[document.getElementById('patternRepeat'), document.getElementById('patternUse')].forEach(checkbox => {
    checkbox.addEventListener('click', (e) => {
        if (stopwatch && stopwatch.isRunning) {
            e.preventDefault();
            showCustomAlert("스톱워치 실행 중에는 설정을 변경할 수 없습니다.\n먼저 정지하거나 리셋해주세요.");
        }
    });

    checkbox.addEventListener('change', () => {
        if (stopwatch) stopwatch.refreshPatterns();
    });
});

settingsBtn.addEventListener('click', () => {
    modal.style.display = 'block';
});

closeBtn.addEventListener('click', () => {
    modal.style.display = 'none';
});

window.addEventListener('click', (event) => {
    if (event.target == modal) {
        modal.style.display = 'none';
    }
});


// --- �˸� ��� ��� ---
const alertModal = document.getElementById('alertModal');
const alertCloseBtn = document.getElementById('alertCloseBtn');
const alertOkBtn = document.getElementById('alertOkBtn');
const alertMessage = document.getElementById('alertMessage');

function showCustomAlert(msg) {
    alertMessage.textContent = msg;
    alertMessage.style.whiteSpace = 'pre-wrap';
    alertModal.style.display = 'block';
}

alertCloseBtn.addEventListener('click', () => {
    alertModal.style.display = 'none';
});

alertOkBtn.addEventListener('click', () => {
    alertModal.style.display = 'none';
});

window.addEventListener('click', (event) => {
    if (event.target == alertModal) {
        alertModal.style.display = 'none';
    }
});

