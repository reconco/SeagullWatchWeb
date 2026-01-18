class Timer {
    constructor(displayElement, inputContainer, inputs, startBtn, pauseBtn) {
        this.display = displayElement;
        this.inputContainer = inputContainer;
        this.inputs = inputs;
        this.startBtn = startBtn;
        this.pauseBtn = pauseBtn;

        this.duration = 0;
        this.timeLeft = 0;
        this.interval = null;
        this.isRunning = false;
        
        this.alarmSound = new Audio('sounds/BeepBeepBeep.wav');
    }

    getInputValues() {
        const hours = parseInt(this.inputs.hours.value) || 0;
        const minutes = parseInt(this.inputs.minutes.value) || 0;
        const seconds = parseInt(this.inputs.seconds.value) || 0;
        return (hours * 3600 + minutes * 60 + seconds) * 1000;
    }

    start() {
        this.alarmSound.pause();
        this.alarmSound.currentTime = 0;
        if (!this.isRunning) {
            // 처음 시작하거나 리셋 후 시작일 때
            if (this.timeLeft === 0) {
                this.duration = this.getInputValues();
                if (this.duration === 0) return;
                this.timeLeft = this.duration;
            }

            this.updateDisplay();
            this.interval = setInterval(() => this.update(), 1000);
            this.isRunning = true;
            
            // UI 변경
            this.inputContainer.style.display = 'none';
            this.display.style.display = 'block';
            this.updateButtons();
        }
    }

    pause() {
        if (this.isRunning) {
            clearInterval(this.interval);
            this.isRunning = false;
            this.updateButtons();
        }
    }

    reset() {
        this.alarmSound.pause();
        this.alarmSound.currentTime = 0;
        clearInterval(this.interval);
        this.isRunning = false;
        this.timeLeft = 0;
        this.display.textContent = "00:00:00";
        
        // UI 초기화
        this.inputContainer.style.display = 'flex';
        this.display.style.display = 'none';
        
        this.inputs.hours.value = '';
        this.inputs.minutes.value = '';
        this.inputs.seconds.value = '';
        
        this.updateButtons();
        
        this.startBtn.disabled = false;
        this.pauseBtn.disabled = true;
    }

    update() {
        if (this.timeLeft <= 0) {
            this.finish();
            return;
        }
        this.display.textContent = formatTime(this.timeLeft);
        this.timeLeft -= 1000;
    }

    updateDisplay() {
        this.display.textContent = formatTime(this.timeLeft);
    }

    finish() {
        clearInterval(this.interval);
        this.isRunning = false;
        this.timeLeft = 0;
        this.display.textContent = "00:00:00";
        this.reset();
        this.alarmSound.play().catch(error => console.log("Audio play failed:", error));
    }

    updateButtons() {
        this.startBtn.disabled = this.isRunning;
        this.pauseBtn.disabled = !this.isRunning;
    }

    setVolume(volume) {
        this.alarmSound.volume = volume;
    }
}