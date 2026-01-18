// --- 패턴 관리 기능 초기화 ---
const patternHoursInput = document.getElementById('patternHours');
const patternMinutesInput = document.getElementById('patternMinutes');
const patternSecondsInput = document.getElementById('patternSeconds');
const patternMessageInput = document.getElementById('patternMessage');
// 체크박스 엘리먼트 참조
const patternUseInput = document.getElementById('patternUse');
const patternRepeatInput = document.getElementById('patternRepeat');

const addPatternBtn = document.getElementById('addPatternBtn');
const patternList = document.getElementById('patternList');

const savePatternBtn = document.getElementById('savePatternBtn');
const loadPatternBtn = document.getElementById('loadPatternBtn');

// 저장하기 기능
if (savePatternBtn) {
    savePatternBtn.addEventListener('click', () => {
        if (window.stopwatch && window.stopwatch.isRunning) {
            const msg = "스톱워치 실행 중에는 저장할 수 없습니다.\n먼저 스톱워치를 정지하거나 리셋해주세요.";
            if (typeof showCustomAlert === 'function') showCustomAlert(msg);
            else alert(msg);
            return;
        }

        // 수정 중인 항목들 저장 처리
        if (typeof saveAllActiveEdits === 'function') {
            saveAllActiveEdits();
        }

        const patterns = [];
        const patternItems = document.querySelectorAll('#patternList .pattern-item');

        patternItems.forEach(li => {
            const messageEl = li.querySelector('.pattern-msg');
            const timeSpans = li.querySelectorAll('.pattern-time');
            
            // 수정 모드가 아닌 건전한 상태의 아이템만 저장
            if (messageEl && timeSpans.length === 3) {
                const message = messageEl.textContent;
                const hours = timeSpans[0].textContent;
                const minutes = timeSpans[1].textContent;
                const seconds = timeSpans[2].textContent;

                patterns.push({
                    hours: hours,
                    minutes: minutes,
                    seconds: seconds,
                    message: message
                });
            }
        });

        const exportData = {
            repeat: patternRepeatInput ? patternRepeatInput.checked : true,
            patterns: patterns
        };

        const now = new Date();
        const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const fileName = `SeagullWatch_${dateStr}.json`;
        
        const jsonContent = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
}

// 불러오기 기능 (파일 선택 창 열기)
if (loadPatternBtn) {
    loadPatternBtn.addEventListener('click', (e) => {
        if (window.stopwatch && window.stopwatch.isRunning) {
            e.preventDefault();
            const msg = "스톱워치 실행 중에는 불러올 수 없습니다.\n먼저 스톱워치를 정지하거나 리셋해주세요.";
            if (typeof showCustomAlert === 'function') showCustomAlert(msg);
            else alert(msg);
            return;
        }

        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                processPatternFile(file);
            }
        };
        
        input.click();
    });
}

function processPatternFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const content = e.target.result;

            if (!content || content.trim() === '') {
                throw new Error('파일 내용이 비어있습니다.');
            }

            let patterns = [];
            let data;
            
            try {
                data = JSON.parse(content);
            } catch (jsonErr) {
                throw new Error('잘못된 JSON 형식입니다. 파일 내용을 확인해주세요.');
            }

            // 데이터 구조 확인 (배열(구버전) 또는 객체(신버전))
            if (Array.isArray(data)) {
                patterns = data;
            } else if (typeof data === 'object' && data !== null && Array.isArray(data.patterns)) {
                patterns = data.patterns;
                // 반복 설정 불러오기
                if (patternRepeatInput && typeof data.repeat === 'boolean') {
                    patternRepeatInput.checked = data.repeat;
                    // 변경 사항 전파 (Stopwatch 등 갱신)
                    if (window.stopwatch) {
                        window.stopwatch.refreshPatterns();
                    }
                }
            } else {
                throw new Error('올바르지 않은 데이터 형식입니다/n(배열 또는 {repeat, patterns} 객체여야 합니다).');
            }

            // 데이터 구조 유효성 검사 (최소한 하나의 유효한 필드는 가지고 있어야 함)
            if (patterns.length > 0) {
                const hasInvalidItem = patterns.some(p => 
                    typeof p !== 'object' || p === null ||
                    (!p.hasOwnProperty('hours') && !p.hasOwnProperty('minutes') && 
                     !p.hasOwnProperty('seconds') && !p.hasOwnProperty('message'))
                );
                
                if (hasInvalidItem) {
                    throw new Error('일부 데이터가 패턴 형식과 일치하지 않습니다.');
                }
            }

            // 기존 패턴 삭제
            const patternItems = document.querySelectorAll('#patternList .pattern-item');
            patternItems.forEach(item => item.remove());
            
            let loadedCount = 0;
            patterns.forEach(p => {
                const hVal = parseInt(p.hours, 10);
                const mVal = parseInt(p.minutes, 10);
                const sVal = parseInt(p.seconds, 10);

                const h = (isNaN(hVal) ? 0 : hVal).toString().padStart(2, '0');
                const m = (isNaN(mVal) ? 0 : mVal).toString().padStart(2, '0');
                const s = (isNaN(sVal) ? 0 : sVal).toString().padStart(2, '0');
                const msg = p.message || '';
                
                addPatternItem(h, m, s, msg);
                loadedCount++;
            });
            
            notifyPatternChanged();
            
            const msg = `${loadedCount}개의 패턴을 불러왔습니다.`;
            if (typeof showCustomAlert === 'function') showCustomAlert(msg);
            else alert(msg);

        } catch (err) {
            console.error(err);
            const msg = '파일 로드 실패: ' + err.message;
            if (typeof showCustomAlert === 'function') showCustomAlert(msg);
            else alert(msg);
        }
    };
    reader.readAsText(file);
}

// 드래그 앤 드롭 기능
const patternContainer = document.getElementById('patternContainer');
if (patternContainer) {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        patternContainer.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    patternContainer.addEventListener('dragenter', () => {
        patternContainer.classList.add('drag-over');
    });

    patternContainer.addEventListener('dragleave', (e) => {
        // 자식 요소로 이동했을 때는 제거하지 않음
        if (!patternContainer.contains(e.relatedTarget)) {
            patternContainer.classList.remove('drag-over');
        }
    });

    patternContainer.addEventListener('drop', (e) => {
        patternContainer.classList.remove('drag-over');
        
        if (window.stopwatch && window.stopwatch.isRunning) {
            e.preventDefault();
            const msg = "스톱워치 실행 중에는 파일을 불러올 수 없습니다.\n먼저 스톱워치를 정지하거나 리셋해주세요.";
            if (typeof showCustomAlert === 'function') showCustomAlert(msg);
            else alert(msg);
            return;
        }

        const dt = e.dataTransfer;
        const files = dt.files;

        if (files.length > 0) {
            const file = files[0];
            if (file.name.endsWith('.json') || file.type === 'application/json') {
                processPatternFile(file);
            } else {
                const msg = 'JSON 파일만 가능합니다.';
                if (typeof showCustomAlert === 'function') showCustomAlert(msg);
                else alert(msg);
            }
        }
    });
}

// 입력값 변경 감지하여 예정 시간 업데이트
[patternHoursInput, patternMinutesInput, patternSecondsInput].forEach(input => {
    input.addEventListener('input', () => {
        if (window.onNewPatternInput) {
            window.onNewPatternInput();
        }
    });
});

addPatternBtn.addEventListener('click', () => {
    const hours = patternHoursInput.value.padStart(2, '0') || '00';
    const minutes = patternMinutesInput.value.padStart(2, '0') || '00';
    const seconds = patternSecondsInput.value.padStart(2, '0') || '00';
    
    // 메시지 입력값 그대로 사용 (입력 없으면 공백)
    const message = patternMessageInput.value.trim();

    if (hours === '00' && minutes === '00' && seconds === '00') {
        showCustomAlert('시간을 입력해주세요.');
        return;
    }

    addPatternItem(hours, minutes, seconds, message);
    notifyPatternChanged();
    
    // 입력 필드 초기화
    patternHoursInput.value = '';
    patternMinutesInput.value = '';
    patternSecondsInput.value = '';
    patternMessageInput.value = '';
    
    // UI 업데이트 (예정 시간 표시 초기화)
    if (window.onNewPatternInput) {
        window.onNewPatternInput();
    }
    
    patternHoursInput.focus();
});

function addPatternItem(hours, minutes, seconds, message) {
    const li = document.createElement('li');
    li.className = 'pattern-item';
    patternList.appendChild(li);
    updatePatternItemView(li, hours, minutes, seconds, message);
}

function updatePatternItemView(li, hours, minutes, seconds, message) {
    li.innerHTML = ''; // 기존 내용 초기화

    // --- Row 1: 메시지 + 수정 버튼 ---
    const row1 = document.createElement('div');
    row1.className = 'pattern-row';

    const msgSpan = document.createElement('span');
    msgSpan.className = 'pattern-msg';
    msgSpan.textContent = message;

    const editBtn = document.createElement('button');
    editBtn.className = 'edit-btn';
    editBtn.textContent = '수정';
    editBtn.onclick = () => {
        enableEditMode(li, hours, minutes, seconds, message);
    };

    row1.appendChild(msgSpan);
    row1.appendChild(editBtn);

    // --- Row 2: 시간 + 삭제 버튼 ---
    const row2 = document.createElement('div');
    row2.className = 'pattern-row';

    const timeWrapper = document.createElement('div');
    timeWrapper.className = 'pattern-time-wrapper'; // 중앙 정렬 스타일 유지

    const timeSpan = document.createElement('span');
    timeSpan.style.fontFamily = "'Courier New', Courier, monospace";
    timeSpan.style.fontSize = "1.25rem";
    
    const hSpan = document.createElement('span');
    hSpan.className = 'pattern-time';
    hSpan.textContent = hours;
    
    const mSpan = document.createElement('span');
    mSpan.className = 'pattern-time';
    mSpan.textContent = minutes;
    
    const sSpan = document.createElement('span');
    sSpan.className = 'pattern-time';
    sSpan.textContent = seconds;

    timeSpan.appendChild(hSpan);
    timeSpan.appendChild(document.createTextNode(' : '));
    timeSpan.appendChild(mSpan);
    timeSpan.appendChild(document.createTextNode(' : '));
    timeSpan.appendChild(sSpan);
    timeWrapper.appendChild(timeSpan);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = '삭제';
    deleteBtn.onclick = () => {
        li.remove();
        notifyPatternChanged();
    };

    row2.appendChild(timeWrapper);
    row2.appendChild(deleteBtn);

    // --- Next Time ---
    const nextTimeDiv = document.createElement('div');
    nextTimeDiv.className = 'next-pattern-time';
    nextTimeDiv.style.fontSize = '0.9rem';
    nextTimeDiv.style.color = '#7f8c8d';
    nextTimeDiv.style.marginTop = '4px';

    li.appendChild(row1);
    li.appendChild(row2);
    li.appendChild(nextTimeDiv);
}

function notifyPatternChanged() {
    if (window.onPatternChanged) {
        window.onPatternChanged();
    }
}

function enableEditMode(li, currentHours, currentMinutes, currentSeconds, currentMessage) {
    li.innerHTML = ''; // 기존 내용 초기화

    // --- Row 1: 메시지 입력 + 저장 버튼 ---
    const row1 = document.createElement('div');
    row1.className = 'pattern-row';

    // 메시지 입력 필드
    const msgInput = document.createElement('input');
    msgInput.type = 'text';
    msgInput.className = 'pattern-message-input';
    msgInput.value = currentMessage;
    msgInput.placeholder = '패턴 메시지';

    // 저장 버튼
    const saveBtn = document.createElement('button');
    saveBtn.className = 'edit-btn'; // 크기 규격 사용 (.edit-btn)
    saveBtn.textContent = '저장';
    saveBtn.style.backgroundColor = '#3498db'; // 파란색 (저장)
    saveBtn.title = '저장';
    saveBtn.onmouseover = () => { saveBtn.style.backgroundColor = '#2980b9'; };
    saveBtn.onmouseout = () => { saveBtn.style.backgroundColor = '#3498db'; };
    
    // 시간 입력 필드들을 나중에 정의하므로, 여기서는 참조를 위해 클로저 내에서 접근하거나 순서를 조정해야 함.
    // 일단 버튼 생성 후 나중에 onclick 할당

    row1.appendChild(msgInput);
    row1.appendChild(saveBtn);

    // --- Row 2: 시간 입력 + 취소 버튼 ---
    const row2 = document.createElement('div');
    row2.className = 'pattern-row';

    // 시간 입력 및 버튼 컨테이너
    const timeWrapper = document.createElement('div');
    timeWrapper.className = 'time-inputs'; 
    timeWrapper.style.justifyContent = 'center';
    
    const hInput = createTimeInput(currentHours, 99);
    const mInput = createTimeInput(currentMinutes, 59);
    const sInput = createTimeInput(currentSeconds, 59);

    timeWrapper.appendChild(hInput);
    timeWrapper.appendChild(document.createTextNode(' : '));
    timeWrapper.appendChild(mInput);
    timeWrapper.appendChild(document.createTextNode(' : '));
    timeWrapper.appendChild(sInput);

    // 취소 버튼
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'delete-btn'; 
    cancelBtn.textContent = '취소';
    cancelBtn.title = '취소';
    
    cancelBtn.onclick = () => {
        updatePatternItemView(li, currentHours, currentMinutes, currentSeconds, currentMessage);
        notifyPatternChanged();
    };

    row2.appendChild(timeWrapper);
    row2.appendChild(cancelBtn);

    // 저장 버튼 이벤트 할당
    saveBtn.onclick = () => {
        const newHours = hInput.value.padStart(2, '0') || '00';
        const newMinutes = mInput.value.padStart(2, '0') || '00';
        const newSeconds = sInput.value.padStart(2, '0') || '00';
        const newMessage = msgInput.value.trim();
        
        updatePatternItemView(li, newHours, newMinutes, newSeconds, newMessage);
        notifyPatternChanged();
    };

    // --- Prediction ---
    const predictionDiv = document.createElement('div');
    predictionDiv.className = 'next-pattern-time';
    predictionDiv.style.fontSize = '0.9rem';
    predictionDiv.style.color = '#7f8c8d';
    predictionDiv.style.marginTop = '8px';
    predictionDiv.style.textAlign = 'center';

    // 입력 이벤트 연결하여 실시간 예측
    const updatePrediction = () => {
        const h = parseInt(hInput.value) || 0;
        const m = parseInt(mInput.value) || 0;
        const s = parseInt(sInput.value) || 0;
        const ms = (h * 3600 + m * 60 + s) * 1000;
        
        const index = Array.from(patternList.children).indexOf(li);
        
        if (ms === 0) {
            predictionDiv.textContent = '';
            return;
        }

        if (window.calculatePatternPrediction) {
            const triggerTime = window.calculatePatternPrediction(index, ms);
            if (triggerTime !== null) {
                // formatTime 함수는 utils.js에 있음 (전역)
                predictionDiv.textContent = `(알림 시간 : ${formatTime(triggerTime)})`;
            } else {
                predictionDiv.textContent = '(알림 시간 : 이미 지남)';
            }
        }
    };

    hInput.addEventListener('input', updatePrediction);
    mInput.addEventListener('input', updatePrediction);
    sInput.addEventListener('input', updatePrediction);

    // 초기값으로 한번 실행
    updatePrediction();

    // Li에 추가
    li.appendChild(row1);
    li.appendChild(row2);
    li.appendChild(predictionDiv);
}

function createTimeInput(value, max) {
    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'pattern-input';
    input.value = value;
    input.min = 0;
    input.max = max;
    return input;
}

// --- 외부 참조용 함수 ---
function getPatterns() {
    const listItems = document.querySelectorAll('#patternList .pattern-item');
    const patterns = [];
    
    listItems.forEach((li, index) => {
        const timeSpans = li.querySelectorAll('.pattern-time');
        const msgSpan = li.querySelector('.pattern-msg');

        if (timeSpans.length === 3) {
            const h = parseInt(timeSpans[0].textContent, 10);
            const m = parseInt(timeSpans[1].textContent, 10);
            const s = parseInt(timeSpans[2].textContent, 10);
            const ms = (h * 3600 + m * 60 + s) * 1000;
            const message = msgSpan ? msgSpan.textContent : '';
            
            patterns.push({
                timeMs: ms,
                element: li,
                message: message
            });
        }
    });

    // 시간 순 정렬 제거 (입력 순서 유지)
    // patterns.sort((a, b) => a.timeMs - b.timeMs);
    return patterns;
}

function clearPatternHighlights() {
    const listItems = document.querySelectorAll('#patternList .pattern-item');
    listItems.forEach(li => {
        li.style.border = '';
    });
}

function highlightPattern(element) {
    clearPatternHighlights();
    if (element) {
        element.style.border = '3px solid #e74c3c';
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function updatePatternNextTime(li, text) {
    const nextTimeSpan = li.querySelector('.next-pattern-time');
    if (nextTimeSpan) {
        nextTimeSpan.textContent = text;
    }
}

function setPatternInteractionState(enabled) {
    const addBtn = document.getElementById('addPatternBtn');
    if (addBtn) addBtn.disabled = !enabled;

    // patternList 내부의 버튼들
    const editBtns = document.querySelectorAll('.edit-btn');
    editBtns.forEach(btn => btn.disabled = !enabled);

    const deleteBtns = document.querySelectorAll('.delete-btn');
    deleteBtns.forEach(btn => btn.disabled = !enabled);
}

function saveAllActiveEdits() {
    const editBtns = document.querySelectorAll('.edit-btn');
    editBtns.forEach(btn => {
        if (btn.textContent === '저장') {
            btn.click();
        }
    });
}
