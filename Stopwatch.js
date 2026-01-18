class Stopwatch {
    constructor(displayElement, startBtn, pauseBtn) {
        this.display = displayElement;
        this.startBtn = startBtn;
        this.pauseBtn = pauseBtn;
        this.titleElement = document.getElementById('stopwatchTitle');
        
        this.startTime = 0;
        this.elapsedTime = 0;
        this.interval = null;
        this.isRunning = false;

        this.alarmSound = new Audio('sounds/BeepBeepBeep.wav');
        this.patterns = [];
        this.currentPatternIndex = 0;
        this.nextTriggerTime = 0;
        this.volume = 1;
        this.alarmSound.volume = this.volume;
    }

    setVolume(value) {
        this.volume = value;
        if(this.alarmSound) {
            this.alarmSound.volume = value;
        }
    }

    refreshPatterns() {
        // 패턴 다시 로드 및 상태 업데이트
        if (typeof getPatterns === 'function') {
            const usePattern = document.getElementById('patternUse');
            if (usePattern && usePattern.checked) {
                this.patterns = getPatterns();
                this.initPatternState(this.elapsedTime);
                this.updatePatternHighlight();
            } else {
                this.patterns = [];
                // 패턴이 비활성화되면 디스플레이 초기화
                this.clearPatternTimesDisplay();
                if (typeof clearPatternHighlights === 'function') {
                    clearPatternHighlights();
                }
                if (this.titleElement) {
                    this.titleElement.textContent = "스톱워치";
                }
            }
            
            // 패턴 상태가 변경되었으므로 예측 시간도 업데이트
            this.updateNewPatternPrediction();
        }
    }

    clearPatternTimesDisplay() {
        if (typeof updatePatternNextTime === 'function') {
            // 모든 패턴의 시간 표시 제거
            const patterns = typeof getPatterns === 'function' ? getPatterns() : [];
            patterns.forEach(p => updatePatternNextTime(p.element, ''));
        }
    }

    start() {
        if (!this.isRunning) {
            // 수정 중인 패턴이 있다면 저장
            if (typeof saveAllActiveEdits === 'function') {
                saveAllActiveEdits();
            }

            this.refreshPatterns(); // start 시에도 refresh 호출로 통합

            this.startTime = Date.now();
            this.interval = setInterval(() => this.update(), 10);
            this.isRunning = true;
            this.updateButtons();

            if (typeof setPatternInteractionState === 'function') {
                setPatternInteractionState(false);
            }
        }
    }

    initPatternState(elapsedTime) {
        if (this.patterns.length === 0) return;

        let accumulatedTime = 0;
        const totalLoopTime = this.patterns.reduce((sum, p) => sum + p.timeMs, 0);
        const repeatCheckbox = document.getElementById('patternRepeat');
        const isRepeating = repeatCheckbox && repeatCheckbox.checked;

        if (totalLoopTime === 0) return;

        // 이미 지나간 전체 루프 계산
        let baseTime = 0;
        if (isRepeating && elapsedTime > 0) {
            baseTime = Math.floor(elapsedTime / totalLoopTime) * totalLoopTime;
        }

        // 현재 루프 내에서 첫 번째로 elapsedTime보다 큰 패턴 찾기
        let currentLoopAccumulated = 0;
        let found = false;

        // 루프 시뮬레이션
        // 패턴을 순회하며 각 패턴의 절대 시간을 계산
        for (let i = 0; i < this.patterns.length; i++) {
            // 패턴의 지속 시간만 더해나감
            currentLoopAccumulated += this.patterns[i].timeMs;
            
            let triggerTime = baseTime + currentLoopAccumulated;
            
            // 만약 현재 계산된 트리거 시간이 이미 지난 시간이라면
            if (triggerTime <= elapsedTime) {
                // 아직 찾지 못했다면(현재 실행해야 할 패턴을 찾는 중이라면) 계속 진행
                // 마지막 패턴까지 왔는데 계속 triggerTime <= elapsedTime이면
                // 다음 루프로 넘어가야 함.
                continue;
            } else {
                 // 드디어 미래의 시간을 찾음
                 this.nextTriggerTime = triggerTime;
                 this.currentPatternIndex = i;
                 found = true;
                 break;
            }
        }
        
        // 현재 루프에서 못 찾았고 반복 모드라면 다음 루프의 첫번째가 타겟
        if (!found) {
            if (isRepeating) {
                 this.currentPatternIndex = 0;
                 this.nextTriggerTime = baseTime + totalLoopTime + this.patterns[0].timeMs;
            } else {
                 // 더 이상 패턴 없음
                 this.currentPatternIndex = this.patterns.length;
                 this.nextTriggerTime = Infinity;
            }
        }

        this.updateAllPatternTimesDisplay(elapsedTime, totalLoopTime, isRepeating);
    }

    updateAllPatternTimesDisplay(elapsedTime, totalLoopTime, isRepeating) {
        if (typeof updatePatternNextTime !== 'function') return;
        
        // 함께 업데이트
        this.updateNewPatternPrediction();

        let baseTime = 0;
        if (isRepeating && elapsedTime > 0) {
            baseTime = Math.floor(elapsedTime / totalLoopTime) * totalLoopTime;
        }

        let loopAccumulated = 0;
        
        for (let i = 0; i < this.patterns.length; i++) {
            loopAccumulated += this.patterns[i].timeMs;
            let triggerTime = baseTime + loopAccumulated;

            // 이미 지난 패턴 처리
            if (triggerTime <= elapsedTime) {
                if (isRepeating) {
                    triggerTime += totalLoopTime;
                } else {
                    updatePatternNextTime(this.patterns[i].element, "(완료)");
                    continue;
                }
            }
            
            // 디스플레이 포맷팅
            const timeStr = formatTime(triggerTime);
            updatePatternNextTime(this.patterns[i].element, `(알림 시간 : ${timeStr})`);
        }
    }

    pause() {
        if (this.isRunning) {
            this.elapsedTime += Date.now() - this.startTime;
            clearInterval(this.interval);
            this.isRunning = false;
            this.updateButtons();

            this.alarmSound.pause();
            this.alarmSound.currentTime = 0;

            if (typeof setPatternInteractionState === 'function') {
                setPatternInteractionState(true);
            }
        }
    }

    reset() {
        clearInterval(this.interval);
        this.startTime = 0;
        this.elapsedTime = 0;
        this.isRunning = false;
        this.display.textContent = "00:00:00";
        this.updateButtons();
        
        this.pauseBtn.disabled = true; 
        this.startBtn.disabled = false;

        this.alarmSound.pause();
        this.alarmSound.currentTime = 0;
        this.currentPatternIndex = 0;
        this.nextTriggerTime = 0;
        
        if (typeof clearPatternHighlights === 'function') {
            clearPatternHighlights();
        }
        
        // 패턴 시간 초기화
        this.refreshPatterns();
        this.updateNewPatternPrediction();

        if (typeof setPatternInteractionState === 'function') {
            setPatternInteractionState(true);
        }
    }

    update() {
        const currentTime = Date.now();
        const time = this.elapsedTime + (currentTime - this.startTime);
        this.display.textContent = formatTime(time);
        
        this.checkPatterns(time);
    }

    checkPatterns(currentTimeMs) {
        const usePattern = document.getElementById('patternUse');
        if (!usePattern || !usePattern.checked) return;
        
        if (this.patterns.length > 0 && currentTimeMs >= this.nextTriggerTime) {
             const pattern = this.patterns[this.currentPatternIndex];
             this.triggerPattern(pattern);
             this.advancePattern(currentTimeMs); // currentTimeMs 전달
             this.updatePatternHighlight();
        }
    }

    advancePattern(currentTimeMs) {
        const repeatCheckbox = document.getElementById('patternRepeat');
        const isRepeating = repeatCheckbox && repeatCheckbox.checked;

        // 현재 완료된 패턴의 인덱스
        const completedIndex = this.currentPatternIndex;
        let nextIndex = completedIndex + 1;
        
        if (nextIndex >= this.patterns.length) {
            if (isRepeating) {
                nextIndex = 0;
            } else {
                this.currentPatternIndex = this.patterns.length;
                this.nextTriggerTime = Infinity;
                // 완료되었으므로 화면 갱신 (마지막 패턴이 완료됨으로 뜨게)
                const totalLoopTime = this.patterns.reduce((sum, p) => sum + p.timeMs, 0);
                this.updateAllPatternTimesDisplay(currentTimeMs, totalLoopTime, isRepeating);
                return;
            }
        }
        
        this.currentPatternIndex = nextIndex;
        this.nextTriggerTime += this.patterns[nextIndex].timeMs;

        // 알람이 울려서 다음 단계로 넘어갔으므로, 디스플레이 갱신
        const totalLoopTime = this.patterns.reduce((sum, p) => sum + p.timeMs, 0);
        this.updateAllPatternTimesDisplay(currentTimeMs, totalLoopTime, isRepeating);
    }


    triggerPattern(pattern) {
        this.alarmSound.pause();
        this.alarmSound.currentTime = 0;
        this.alarmSound.play().catch(e => console.log('Audio play failed', e));
    }

    updatePatternHighlight() {
        if (typeof highlightPattern === 'function' && typeof clearPatternHighlights === 'function') {
            if (this.currentPatternIndex < this.patterns.length) {
                const pattern = this.patterns[this.currentPatternIndex];
                highlightPattern(pattern.element);
                if (this.titleElement) {
                    this.titleElement.textContent = pattern.message || "스톱워치";
                }
            } else {
                // 더 이상 패턴이 없으면 하이라이트 제거
                clearPatternHighlights();
                if (this.titleElement) {
                    this.titleElement.textContent = "스톱워치";
                }
            }
        }
    }

    updateNewPatternPrediction() {
        const predictionEl = document.getElementById('newPatternPrediction');
        if (!predictionEl) return;

        const hInput = document.getElementById('patternHours');
        const mInput = document.getElementById('patternMinutes');
        const sInput = document.getElementById('patternSeconds');
        
        const h = parseInt(hInput.value) || 0;
        const m = parseInt(mInput.value) || 0;
        const s = parseInt(sInput.value) || 0;
        const pendingMs = (h * 3600 + m * 60 + s) * 1000;

        if (pendingMs === 0) {
            predictionEl.textContent = '';
            return;
        }

        const usePattern = document.getElementById('patternUse');
        if (!usePattern || !usePattern.checked) {
             predictionEl.textContent = '';
             return;
        }

        // 시뮬레이션: 현재 패턴 리스트에 pendingMs 패턴을 추가했다고 가정
        const simulatedPatterns = [...this.patterns, { timeMs: pendingMs }];
        
        let triggerTime = this.calculateNextTriggerTimeForPattern(simulatedPatterns, simulatedPatterns.length - 1, this.elapsedTime);
        
        if (triggerTime !== null) {
             predictionEl.textContent = `(알림 시간 : ${formatTime(triggerTime)})`;
        } else {
             predictionEl.textContent = '(알림 시간 : 이미 지남)';
        }
    }

    // 특정 패턴(index)의 다음 트리거 시간을 계산하는 로직 추출
    calculateNextTriggerTimeForPattern(patterns, targetIndex, elapsedTime) {
         if (!patterns || patterns.length === 0) return null;
         
         const totalLoopTime = patterns.reduce((sum, p) => sum + p.timeMs, 0);
         const repeatCheckbox = document.getElementById('patternRepeat');
         const isRepeating = repeatCheckbox && repeatCheckbox.checked;

         let baseTime = 0;
         if (isRepeating && elapsedTime > 0 && totalLoopTime > 0) {
            baseTime = Math.floor(elapsedTime / totalLoopTime) * totalLoopTime;
         }

         let loopAccumulated = 0;
         for (let i = 0; i < patterns.length; i++) {
             loopAccumulated += patterns[i].timeMs;
             if (i === targetIndex) {
                 let triggerTime = baseTime + loopAccumulated;
                 
                 // 이미 지났다면
                 if (triggerTime <= elapsedTime) {
                     if (isRepeating) {
                         return triggerTime + totalLoopTime;
                     } else {
                         return null; // 이미 완료됨
                     }
                 }
                 return triggerTime;
             }
         }
         return null;
    }
    
    getPredictionForPattern(index, timeMs) {
        // 현재 patterns 배열 범위 확인
        if (!this.patterns || index < 0 || index >= this.patterns.length) return null;

        // 시뮬레이션용 패턴 배열 생성
        const simulatedPatterns = this.patterns.map((p, i) => {
            if (i === index) return { timeMs: timeMs };
            return p; // 기존 패턴 객체 유지 (여기선 timeMs만 중요)
        });

        return this.calculateNextTriggerTimeForPattern(simulatedPatterns, index, this.elapsedTime);
    }

    updateButtons() {
        this.startBtn.disabled = this.isRunning;
        this.pauseBtn.disabled = !this.isRunning;
    }
}