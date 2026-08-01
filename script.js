const SYSTEM_INSTRUCTION = `คุณคือ AccuMate AI ผู้เชี่ยวชาญด้านบัญชีระดับมหาวิทยาลัย (เน้นวิชาการบัญชีชั้นกลาง 2 บทที่ 1 หนี้สินหมุนเวียน และ บทที่ 2 หนี้สินไม่หมุนเวียนและหนี้สินที่อาจเกิดขึ้น)
หน้าที่ของคุณคือการตอบคำถาม อธิบายเนื้อหา และแสดงวิธีทำโจทย์บัญชีให้กับนักศึกษา โดยต้องยึดหลักการ ตรรกะ วิธีคำนวณ และการบันทึกบัญชีตามคู่มือเรียนการบัญชีชั้นกลาง 2 (TFRS 9, TFRS 15, TAS 1, TAS 32, TAS 37) ที่อยู่ในไฟล์ฐานข้อมูล DATABASE เป็นหลักเท่านั้น

กฎเหล็กด้านตรรกะและการคำนวณ (Strict Rules - ห้ามฝ่าฝืนหรือพลาดเด็ดขาด):
1. **ใช้ตัวเลขตามโจทย์เท่านั้น:** ห้ามคิดตัวเลขขึ้นมาเอง ห้ามสมมติฐาน หรืออ้างอิงตัวเลขอื่นที่นอกเหนือจากโจทย์ระบุเด็ดขาด
2. **การใช้ค่าคิดลดในตาราง:** ทุกการคำนวณมูลค่าปัจจุบัน (Present Value) ของหุ้นกู้, ตั๋วเงินจ่าย หรือเงินกู้ยืม ต้องอ้างอิงและใช้ค่าจากตาราง PVIF และ PVIFA แบบ **ทศนิยม 5 ตำแหน่ง เท่านั้น**
3. **หลักการปัดเศษทศนิยม:** ผลลัพธ์การคำนวณหรือตัวเลขในตารางตัดบัญชีทุกขั้นตอน หากเศษทศนิยมมีค่า **ตั้งแต่ 0.5 ขึ้นไป ให้ปัดขึ้น** หากเศษทศนิยมมีค่า **ต่ำกว่า 0.5 ให้ปัดลง** เสมอ
4. ขอบเขตเนื้อหา: ตอบเฉพาะคำถามที่เกี่ยวกับวิชาการบัญชีหนี้สินและส่วนของเจ้าของเท่านั้น หากผู้ใช้ถามเรื่องนอกเหนือจากนี้ ให้ปฏิเสธอย่างสุภาพทันที
5. ตอบให้รายละเอียดครบถ้วนทุกประเด็น **ห้ามตัดบท ห้ามสรุปย่อหรือละเว้นขั้นตอนสำคัญ** ต้องแสดงสูตร ที่มาของตัวเลข และแจกแจงวิธีคิดทีละ Step ตั้งแต่ต้นจนจบอย่างสมบูรณ์
6. การบันทึกสมุดรายวันทั่วไป **ต้องตีตาราง Markdown เสมอ** ให้มีคอลัมน์: วันเดือนปี | รายการ | เลขที่บัญชี | เดบิต | เครดิต (ในคอลัมน์รายการ สำหรับชื่อบัญชีฝั่งเครดิต ให้พิมพ์ &nbsp;&nbsp;&nbsp;&nbsp; นำหน้าชื่อบัญชี เพื่อเยื้องขวาให้ถูกต้องสวยงามตามหลักบัญชีจริง)
7. ห้ามใช้โค้ด LaTeX (เช่น $$, \\mathbf, \\text) เด็ดขาด ให้ใช้ข้อความธรรมดา เครื่องหมายคณิตศาสตร์ปกติ (+, -, *, /) และใช้ Markdown ทั่วไป เช่น **ตัวหนา** เท่านั้น`;

let conversationHistory = [];
let isApiConnected = false;
let apiTimerTriggered = false;
let apiTimeout = null;
let localDatabaseContent = ""; 

// ฟังก์ชันโหลดฐานข้อมูลจากไฟล์ dataset.txt หลังบ้าน
async function loadLocalDatabase() {
    try {
        const response = await fetch('dataset.txt');
        if (response.ok) {
            localDatabaseContent = await response.text();
            console.log("Database loaded successfully.");
        } else {
            console.warn("dataset.txt not found. Running without local database.");
        }
    } catch (error) {
        console.error("Error loading database file:", error);
    }
}

function clearApiKey() {
    document.getElementById('manualApiKey').value = '';
    const btn = document.getElementById('saveKeyBtn');
    const textSpan = document.getElementById('keyBtnText');
    const iconSpan = document.getElementById('keyBtnIcon');
    
    btn.className = 'bg-blue-600 hover:bg-blue-700 active:scale-95 text-white px-3 py-1.5 rounded-lg font-medium text-xs transition-all flex items-center gap-1.5 shadow-xs shrink-0 cursor-pointer';
    if(textSpan) textSpan.innerText = 'เชื่อมต่อ Groq';
    iconSpan.className = 'fa-solid fa-bolt';
    
    isApiConnected = false;
    alert('ระบบได้ทำการยกเลิกการเชื่อมต่อและลบข้อมูล Groq API Key เรียบร้อยแล้ว');
}

document.addEventListener('DOMContentLoaded', async () => {
    loadLocalDatabase();

    apiTimeout = setTimeout(() => {
        if (!isApiConnected && !apiTimerTriggered) {
            apiTimerTriggered = true;
            const helpMsg = '⚠️ หากยังไม่ได้รับ Groq API Key สามารถสมัครรับคีย์ฟรีได้ที่ [console.groq.com](https://console.groq.com) หรือติดต่อผู้ดูแลระบบครับ<br><br><a href="https://www.instagram.com/porumors?igsh=MWE0Zml1eDFsdDdhdg==" target="_blank" style="display: inline-flex; align-items: center; gap: 8px; padding: 8px 14px; background: linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%); color: white; border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: 500; box-shadow: 0 2px 4px rgba(220, 39, 67, 0.3); transition: transform 0.2s;"><i class="fa-brands fa-instagram text-lg"></i> ติดต่อผู้ดูแลระบบ (IG: porumors)</a>';
            appendMessage('ai', helpMsg);
        }
    }, 10000);
});

// ฟังก์ชันตรวจสอบความถูกต้องของ Groq API Key
async function verifyApiKey(key) {
    try {
        const response = await fetch('https://api.groq.com/openai/v1/models', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${key.trim()}`
            }
        });
        return response.ok;
    } catch (e) {
        return false;
    }
}

async function verifyAndSaveKey() {
    const keyInput = document.getElementById('manualApiKey');
    const btn = document.getElementById('saveKeyBtn');
    const textSpan = document.getElementById('keyBtnText');
    const iconSpan = document.getElementById('keyBtnIcon');
    const key = keyInput.value.trim();

    if (!key) {
        appendMessage('ai', '⚠️ กรุณาวาง Groq API Key (เริ่มต้นด้วย gsk_...) ก่อนกดเชื่อมต่อครับ');
        keyInput.focus();
        return;
    }

    btn.disabled = true;
    iconSpan.className = 'fa-solid fa-spinner fa-spin';
    if(textSpan) textSpan.innerText = 'กำลังเช็ค...';

    const isValid = await verifyApiKey(key);

    if (isValid) {
        isApiConnected = true;
        if (apiTimeout) clearTimeout(apiTimeout);
        
        btn.classList.remove('bg-blue-600', 'hover:bg-blue-700', 'bg-red-500', 'hover:bg-red-600');
        btn.classList.add('bg-emerald-500', 'hover:bg-emerald-600');
        if(textSpan) textSpan.innerText = 'Groq พร้อมใช้';
        iconSpan.className = 'fa-solid fa-check-circle';
        
        appendMessage('ai', '⚡ **ระบบเชื่อมต่อ Groq API สำเร็จเรียบร้อยแล้ว!** ล็อกการทำงานด้วยโมเดล llama-3.3-70b-versatile (ตอบเร็ว โควตาสูง ไม่ติด Rate Limit) พิมพ์โจทย์คำถามเข้ามาได้เลยครับ');
    } else {
        btn.classList.remove('bg-blue-600', 'hover:bg-blue-700', 'bg-emerald-500', 'hover:bg-emerald-600');
        btn.classList.add('bg-red-500', 'hover:bg-red-600');
        if(textSpan) textSpan.innerText = 'คีย์ผิดพลาด';
        iconSpan.className = 'fa-solid fa-xmark';
        
        appendMessage('ai', '❌ **ข้อผิดพลาด:** Groq API Key ไม่ถูกต้อง กรุณาตรวจสอบคีย์อีกครั้งครับ');
    }
    btn.disabled = false;
}

let recognition = null;
let isRecording = false;

if ('webkitSpeechRecognition' in window || 'speechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.lang = 'th-TH';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
            } else {
                interimTranscript += event.results[i][0].transcript;
            }
        }
        const inputEl = document.getElementById('userInput');
        if (finalTranscript) {
            inputEl.value = finalTranscript;
        } else if (interimTranscript) {
            inputEl.value = interimTranscript;
        }
    };

    recognition.onerror = () => { stopRecordingUI(); };
    recognition.onend = () => { stopRecordingUI(); };
}

function toggleSpeechRecognition() {
    if (!recognition) {
        alert('เบราว์เซอร์ของคุณไม่รองรับการใช้งานเสียงพูด');
        return;
    }
    if (isRecording) {
        recognition.stop();
    } else {
        recognition.start();
        startRecordingUI();
    }
}

function startRecordingUI() {
    isRecording = true;
    const micBtn = document.getElementById('micBtn');
    micBtn.classList.add('mic-recording');
    document.getElementById('userInput').placeholder = "กำลังฟังเสียงพูดของคุณอยู่...";
}

function stopRecordingUI() {
    isRecording = false;
    const micBtn = document.getElementById('micBtn');
    micBtn.classList.remove('mic-recording');
    document.getElementById('userInput').placeholder = "ถาม AccuMate...";
}

function sendQuickQuery(text) {
    document.getElementById('userInput').value = text;
    handleChatSubmit(new Event('submit'));
}

async function handleChatSubmit(e) {
    if (e) e.preventDefault();

    const inputEl = document.getElementById('userInput');
    const btnEl = document.getElementById('sendBtn');
    const query = inputEl.value.trim();
    const apiKeyInputEl = document.getElementById('manualApiKey');
    let apiKey = apiKeyInputEl.value.trim();

    if (!query) return;

    if (!apiKey) {
        appendMessage('ai', '⚠️ คุณยังไม่ได้เชื่อมต่อ Groq API Key ครับ กรุณาวางคีย์ที่มุมขวาบนแล้วกด "เชื่อมต่อ Groq" ก่อนนะครับ');
        apiKeyInputEl.focus();
        return;
    }

    appendMessage('user', query);

    inputEl.value = '';
    inputEl.blur();
    btnEl.disabled = true;

    conversationHistory.push({
        role: 'user',
        content: query
    });

    if (conversationHistory.length > 10) {
        conversationHistory = conversationHistory.slice(-10);
    }

    const loadingId = appendLoading();

    // บังคับล็อกเฉพาะโมเดล llama-3.3-70b-versatile เท่านั้น
    const targetModel = 'llama-3.3-70b-versatile';

    try {
        const requestMessages = [
            { role: 'system', content: SYSTEM_INSTRUCTION },
            ...conversationHistory
        ];

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: targetModel,
                messages: requestMessages,
                temperature: 0.1,
                max_tokens: 4096
            })
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error?.message || `ไม่สามารถเรียกใช้งานโมเดล ${targetModel} ได้ กรุณาตรวจสอบ API Key หรือสิทธิ์การใช้งานโมเดลนี้`);
        }

        const data = await response.json();
        const aiResponseText = data.choices?.[0]?.message?.content || 'ไม่สามารถประมวลผลคำตอบได้';

        conversationHistory.push({
            role: 'assistant',
            content: aiResponseText
        });

        removeLoading(loadingId);
        appendMessage('ai', aiResponseText);

    } catch (err) {
        console.error(err);
        removeLoading(loadingId);
        appendMessage('ai', `❌ ${err.message}`);
        conversationHistory.pop();
    } finally {
        btnEl.disabled = false;
    }
}

function copyMessageText(buttonEl, textToCopy) {
    navigator.clipboard.writeText(textToCopy).then(() => {
        const icon = buttonEl.querySelector('i');
        icon.className = 'fa-solid fa-check text-emerald-500';
        setTimeout(() => {
            icon.className = 'fa-regular fa-copy';
        }, 2000);
    }).catch(err => {
        console.error('คัดลอกข้อความไม่สำเร็จ', err);
    });
}

function appendMessage(role, text) {
    const chatHistory = document.getElementById('chatHistory');
    const msgDiv = document.createElement('div');
    msgDiv.className = 'flex gap-3 md:gap-4 max-w-5xl mx-auto w-full ' + (role === 'user' ? 'flex-row-reverse' : '');

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = text;
    const plainText = tempDiv.textContent || tempDiv.innerText || text;

    if (role === 'user') {
        msgDiv.innerHTML = `
            <div class="w-8 h-8 md:w-9 md:h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 text-xs md:text-sm shadow-xs border border-blue-200">
                <i class="fa-solid fa-user"></i>
            </div>
            <div class="relative group bg-blue-600 text-white px-4 md:px-5 py-3 md:py-3.5 rounded-2xl rounded-tr-sm text-xs md:text-[15px] max-w-[85%] md:max-w-2xl shadow-xs leading-relaxed pr-9 md:pr-10">
                <span>${escapeHtml(text)}</span>
                <button onclick="copyMessageText(this, \`${escapeJsString(plainText)}\`)" title="คัดลอกข้อความ" 
                    class="absolute bottom-1.5 right-1.5 md:bottom-2 md:right-2 p-1.5 rounded-lg bg-blue-700/60 hover:bg-blue-700 text-white opacity-70 group-hover:opacity-100 transition-all text-xs cursor-pointer">
                    <i class="fa-regular fa-copy"></i>
                </button>
            </div>
        `;
    } else {
        const parsedMarkdown = marked.parse(text);
        msgDiv.innerHTML = `
            <div class="w-8 h-8 md:w-9 md:h-9 rounded-full bg-white border border-slate-200 text-blue-600 flex items-center justify-center shrink-0 text-xs md:text-sm shadow-xs">
                <i class="fa-solid fa-robot"></i>
            </div>
            <div class="relative group bg-white border border-slate-200/80 p-4 md:p-6 rounded-2xl rounded-tl-sm text-xs md:text-[15px] text-slate-700 markdown-body shadow-xs flex-1 overflow-x-auto">
                <button onclick="copyMessageText(this, \`${escapeJsString(plainText)}\`)" title="คัดลอกข้อความ" 
                    class="absolute top-2.5 right-2.5 md:top-3 md:right-3 p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 opacity-70 group-hover:opacity-100 transition-all text-xs cursor-pointer">
                    <i class="fa-regular fa-copy"></i>
                </button>
                ${parsedMarkdown}
            </div>
        `;
    }

    chatHistory.appendChild(msgDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

function escapeJsString(str) {
    return str.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$').replace(/"/g, '&quot;');
}

function appendLoading() {
    const chatHistory = document.getElementById('chatHistory');
    const id = 'loading-' + Date.now();
    const loadingDiv = document.createElement('div');
    loadingDiv.id = id;
    loadingDiv.className = 'flex gap-3 md:gap-4 max-w-5xl mx-auto w-full';
    loadingDiv.innerHTML = `
        <div class="w-8 h-8 md:w-9 md:h-9 rounded-full bg-white border border-slate-200 text-blue-600 flex items-center justify-center shrink-0 text-xs md:text-sm shadow-xs">
            <i class="fa-solid fa-bolt text-amber-500 animate-pulse"></i>
        </div>
        <div class="bg-white border border-slate-200/80 p-3.5 md:p-4 rounded-2xl rounded-tl-sm text-xs md:text-sm text-slate-500 flex items-center gap-3 shadow-xs">
            <div class="w-4 h-4 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin"></div>
            <span>llama-3.3-70b-versatile กำลังคิดวิเคราะห์และตอบกลับอย่างรวดเร็ว...</span>
        </div>
    `;
    chatHistory.appendChild(loadingDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;
    return id;
}

function removeLoading(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
