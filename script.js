const SYSTEM_INSTRUCTION = `คุณคือ AccuMate AI ผู้เชี่ยวชาญด้านบัญชีระดับมหาวิทยาลัย (เน้นวิชาการบัญชีชั้นกลาง 2 บทที่ 1 หนี้สินหมุนเวียน และ บทที่ 2 หนี้สินไม่หมุนเวียนและหนี้สินที่อาจเกิดขึ้น)
หน้าที่ของคุณคือการตอบคำถาม อธิบายเนื้อหา และแสดงวิธีทำโจทย์บัญชีให้กับนักศึกษา โดยต้องยึดหลักการ ตรรกะ วิธีคำนวณ และการบันทึกบัญชีตามหนังสือการบัญชีชั้นกลาง 2 (TFRS 9, TFRS 15, TAS 1, TAS 32, TAS 37) เป็นหลักเท่านั้น

กฎการคำนวณและตรรกะสูงสุด (Strict Rules - ห้ามฝ่าฝืนเด็ดขาด):
1. **ใช้ตัวเลขตามโจทย์เท่านั้น:** ห้ามสมมติหรืออ้างอิงตัวเลขใดๆ นอกเหนือจากที่ระบุในโจทย์เด็ดขาด
2. **การใช้ค่า PVIF และ PVIFA:** ทุกการคำนวณมูลค่าปัจจุบัน ต้องใช้ค่าตาราง PVIF และ PVIFA แบบ **ทศนิยม 5 ตำแหน่ง เท่านั้น**
3. **หลักการปัดเศษ:** ผลลัพธ์การคำนวณหรือตัวเลขเงินตราทุกขั้นตอน หากมีเศษทศนิยม **ตั้งแต่ 0.5 ขึ้นไป ให้ปัดขึ้น** หากมีเศษทศนิยม **ต่ำกว่า 0.5 ให้ปัดลง** เสมอ
4. ขอบเขตเนื้อหา: ตอบคำถามเฉพาะที่เกี่ยวกับเนื้อหาวิชาบัญชีเท่านั้น หากนอกเหนือจากนี้ ให้ปฏิเสธอย่างสุภาพ
5. ตอบให้ละเอียดครบถ้วนทุกประเด็น ห้ามตัดบท ห้ามสรุปย่อหรือละเว้นขั้นตอนสำคัญ ต้องแสดงวิธีคิดและการคำนวณให้ครบถ้วนตั้งแต่ต้นจนจบ
6. ในส่วนของการคำนวณ วิธีทำ ให้แสดงสูตร ที่มาของตัวเลข และแจกแจงทีละ Step อย่างละเอียด ห้ามข้ามขั้นตอน
7. การบันทึกสมุดรายวันทั่วไป **ต้องตีตาราง Markdown เสมอ** ให้เหมือนสมุดบัญชีจริง โดยมีคอลัมน์: วันเดือนปี | รายการ | เลขที่บัญชี | เดบิต | เครดิต
8. ห้ามใช้โค้ด LaTeX เด็ดขาด ให้ใช้ข้อความธรรมดาและ Markdown เท่านั้น`;

let conversationHistory = [];
let isApiConnected = false;
let apiTimerTriggered = false;
let apiTimeout = null;
let attachedFile = null;

function clearApiKey() {
    document.getElementById('manualApiKey').value = '';
    
    const btn = document.getElementById('saveKeyBtn');
    const textSpan = document.getElementById('keyBtnText');
    const iconSpan = document.getElementById('keyBtnIcon');
    
    btn.classList.remove('bg-emerald-500', 'hover:bg-emerald-600', 'bg-red-500', 'hover:bg-red-600');
    btn.classList.add('bg-blue-600', 'hover:bg-blue-700');
    if(textSpan) textSpan.innerText = 'เชื่อมต่อ';
    iconSpan.className = 'fa-solid fa-plug';
    
    isApiConnected = false;
    alert('ระบบได้ทำการยกเลิกการเชื่อมต่อและลบข้อมูล API Key ของท่านเรียบร้อยแล้ว');
}

document.addEventListener('DOMContentLoaded', async () => {
    apiTimeout = setTimeout(() => {
        if (!isApiConnected && !apiTimerTriggered) {
            apiTimerTriggered = true;
            const helpMsg = '⚠️ หากยังไม่ได้รับ API Key หรือ API มีปัญหา โปรดติดต่อผู้ดูแลระบบครับ<br><br><a href="https://www.instagram.com/porumors?igsh=MWE0Zml1eDFsdDdhdg==" target="_blank" style="display: inline-flex; align-items: center; gap: 8px; padding: 8px 14px; background: linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%); color: white; border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: 500; box-shadow: 0 2px 4px rgba(220, 39, 67, 0.3); transition: transform 0.2s;"><i class="fa-brands fa-instagram text-lg"></i> ติดต่อผู้ดูแลระบบ (IG: porumors)</a>';
            appendMessage('ai', helpMsg);
        }
    }, 10000);
});

async function verifyApiKey(key) {
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
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
        appendMessage('ai', '⚠️ กรุณาวาง API Key ก่อนกดเชื่อมต่อครับ');
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
        if(textSpan) textSpan.innerText = 'พร้อมใช้งาน';
        iconSpan.className = 'fa-solid fa-check-circle';
        
        appendMessage('ai', '✅ **ระบบเชื่อมต่อ API Key สำเร็จเรียบร้อยแล้วครับ!** พิมพ์โจทย์ อัปโหลดภาพ/PDF หรือคลิกหัวข้อด้านบนเพื่อเริ่มติวได้เลยครับ');
    } else {
        btn.classList.remove('bg-blue-600', 'hover:bg-blue-700', 'bg-emerald-500', 'hover:bg-red-600');
        btn.classList.add('bg-red-500', 'hover:bg-red-600');
        if(textSpan) textSpan.innerText = 'คีย์ผิดพลาด';
        iconSpan.className = 'fa-solid fa-xmark';
        
        appendMessage('ai', '❌ **ข้อผิดพลาด:** สิทธิ์การเข้าถึงระบบไม่ถูกต้อง กรุณาตรวจสอบความถูกต้องของ API Key อีกครั้งครับ');
    }
    btn.disabled = false;
}

function handleFileSelected(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
        alert('กรุณาอัปโหลดเฉพาะไฟล์รูปภาพ (JPG, PNG) หรือไฟล์ PDF เท่านั้นครับ');
        event.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const base64String = e.target.result.split(',')[1];
        attachedFile = {
            mimeType: file.type,
            data: base64String,
            name: file.name
        };

        document.getElementById('fileNameDisplay').textContent = file.name;
        document.getElementById('filePreviewContainer').classList.remove('hidden');
    };
    reader.readAsDataURL(file);
}

function removeAttachedFile() {
    attachedFile = null;
    document.getElementById('fileInput').value = '';
    document.getElementById('filePreviewContainer').classList.add('hidden');
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

    if (!query && !attachedFile) return;

    if (!apiKey) {
        appendMessage('ai', '⚠️ คุณยังไม่ได้เชื่อมต่อ API Key ครับ กรุณาวางคีย์ที่มุมขวาบนแล้วกด "เชื่อมต่อ" ก่อนส่งข้อความนะครับ');
        apiKeyInputEl.focus();
        return;
    }

    let displayMessage = query;
    if (attachedFile) {
        displayMessage = query ? `${query} (แนบไฟล์: ${attachedFile.name})` : `[แนบไฟล์: ${attachedFile.name}]`;
    }
    appendMessage('user', displayMessage);

    inputEl.value = '';
    inputEl.blur();
    btnEl.disabled = true;

    const contentParts = [];
    if (attachedFile) {
        contentParts.push({
            inlineData: {
                mimeType: attachedFile.mimeType,
                data: attachedFile.data
            }
        });
    }

    contentParts.push({ 
        text: query ? query : "โปรดช่วยวิเคราะห์และแสดงวิธีทำโจทย์บัญชีจากไฟล์ที่อัปโหลดนี้อย่างละเอียดเป็นขั้นตอน" 
    });

    conversationHistory.push({
        role: 'user',
        parts: contentParts
    });

    if (conversationHistory.length > 16) {
        conversationHistory = conversationHistory.slice(-16);
    }

    removeAttachedFile();

    const loadingId = appendLoading();

    try {
        const modelName = 'gemini-3-flash-preview';
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

        const requestBody = {
            contents: conversationHistory,
            systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
            generationConfig: { 
                temperature: 0.1,      
                maxOutputTokens: 8192  
            }
        };

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error("ข้อผิดพลาด: สิทธิ์การเข้าถึงระบบไม่ถูกต้อง หรือโมเดล gemini-3-flash-preview อาจยังไม่เปิดให้บริการบนคีย์นี้ กรุณาตรวจสอบ API Key อีกครั้ง");
        }

        const data = await response.json();
        const aiResponseText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'ไม่สามารถประมวลผลคำตอบได้';

        conversationHistory.push({
            role: 'model',
            parts: [{ text: aiResponseText }]
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
            <div class="relative group bg-white border border-slate-200/80 p-4 md:p-6 rounded-2xl rounded-tl-sm text-xs md:text-[15px] text-slate-700 markdown-body shadow-sm flex-1 overflow-x-auto">
                <button onclick="copyMessageText(this, \`${escapeJsString(plainText)}\`)" title="คัดลอกข้อความ" 
                    class="absolute top-2.5 right-2.5 md:top-3 md:right-3 p-1.5 rounded-lg bg-slate-100 hover:bg-gray-200 text-slate-600 border border-slate-200 opacity-70 group-hover:opacity-100 transition-all text-xs cursor-pointer">
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
            <i class="fa-solid fa-robot animate-pulse"></i>
        </div>
        <div class="bg-white border border-slate-200/80 p-3.5 md:p-4 rounded-2xl rounded-tl-sm text-xs md:text-sm text-slate-500 flex items-center gap-3 shadow-xs">
            <div class="w-4 h-4 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin"></div>
            <span>กำลังคิดคำนวณตามหลักการบัญชีอย่างละเอียดถี่ถ้วน...</span>
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
