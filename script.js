const CHECK_IN_TIME = { hour: 8, minute: 30 };
const CHECK_OUT_TIME = { hour: 18, minute: 0 };

const checkInBtn = document.getElementById('checkInBtn');
const checkOutBtn = document.getElementById('checkOutBtn');
const welcomeMessage = document.getElementById('welcome-message'); // เปลี่ยนชื่อ ID
const notificationsDiv = document.getElementById('notifications');
const dailyStatusSpan = document.getElementById('dailyStatus');
const checkInTimeSpan = document.getElementById('checkInTime');
const checkOutTimeSpan = document.getElementById('checkOutTime');
const currentTimeSpan = document.getElementById('currentTime'); // สำหรับแสดงเวลาปัจจุบัน

// ปุ่มแจ้งเหตุ
const reportAbsentBtn = document.getElementById('reportAbsentBtn');
const reportLeaveBtn = document.getElementById('reportLeaveBtn');
const reportLateBtn = document.getElementById('reportLateBtn');
const reportReasonInput = document.getElementById('reportReason');
const submitReportBtn = document.getElementById('submitReportBtn');

// URL ของ Web App ที่ deploy จาก Google Apps Script ของคุณ
// คุณจะต้องเปลี่ยน URL นี้เป็นของคุณเอง
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbz2K1BH9pHhwDU2beIcGbcvGF1aJS0OkYY_x7ad4AGD6EzQ0eQeHpU9QuzpCoRQpiWlww/exec'; // *** อย่าลืมเปลี่ยนตรงนี้ ***

// ฟังก์ชันสำหรับแสดงข้อความต้อนรับชั่วคราว
function showWelcomeMessage(message) {
    welcomeMessage.textContent = message;
    welcomeMessage.style.display = 'block';
    setTimeout(() => {
        welcomeMessage.style.display = 'none';
    }, 3000); // ซ่อนหลังจาก 3 วินาที
}

// ฟังก์ชันสำหรับแสดงการแจ้งเตือน
function showNotification(message) {
    notificationsDiv.textContent = message;
    notificationsDiv.style.display = 'block';
    // ตั้งเวลาให้ซ่อนเองหลังจาก 5 วินาที
    setTimeout(() => {
        notificationsDiv.style.display = 'none';
    }, 5000);
}

// ฟังก์ชันสำหรับฟอร์แมตเวลา
function formatTime(date) {
    return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// ฟังก์ชันสำหรับรับวันที่ปัจจุบันในรูปแบบYYYY-MM-DD
function getTodayDateString() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// ฟังก์ชันบันทึกข้อมูลไปยัง Google Sheet
async function sendToGoogleSheet(data) {
    if (WEB_APP_URL === 'https://script.google.com/macros/s/AKfycbz2K1BH9pHhwDU2beIcGbcvGF1aJS0OkYY_x7ad4AGD6EzQ0eQeHpU9QuzpCoRQpiWlww/exec' || !WEB_APP_URL) {
        console.error('https://script.google.com/macros/s/AKfycbz2K1BH9pHhwDU2beIcGbcvGF1aJS0OkYY_x7ad4AGD6EzQ0eQeHpU9QuzpCoRQpiWlww/exec');
        showNotification('เกิดข้อผิดพลาด: URL การเชื่อมต่อยังไม่ได้ตั้งค่า', 'warning');
        return;
    }
    try {
        const response = await fetch(WEB_APP_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        console.log('ข้อมูลถูกส่งไปยัง Google Sheet แล้ว (อาจไม่เห็น response ด้วย no-cors)');
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการส่งข้อมูลไป Google Sheet:', error);
        showNotification('เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่', 'warning');
    }
}

// ฟังก์ชันสำหรับดึงข้อมูลบันทึกประจำวันจาก Local Storage
function getDailyRecord() {
    const today = getTodayDateString();
    const records = JSON.parse(localStorage.getItem('attendanceRecords') || '{}');
    return records[today] || { checkIn: null, checkOut: null, status: '', lateCount: 0, reports: [] }; // เพิ่ม reports
}

// ฟังก์ชันสำหรับบันทึกข้อมูลประจำวันลง Local Storage
function saveDailyRecord(record) {
    const today = getTodayDateString();
    const records = JSON.parse(localStorage.getItem('attendanceRecords') || '{}');
    records[today] = record;
    localStorage.setItem('attendanceRecords', JSON.stringify(records));
    updateDisplay();
}

// ฟังก์ชันสำหรับดึงจำนวนครั้งที่มาสายในเดือนปัจจุบัน
function getMonthlyLateCount() {
    const records = JSON.parse(localStorage.getItem('attendanceRecords') || '{}');
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    let lateCount = 0;

    for (const dateStr in records) {
        const recordDate = new Date(dateStr);
        if (recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear) {
            if (records[dateStr].status === 'มาสาย' || (records[dateStr].reports && records[dateStr].reports.some(r => r.type === 'แจ้งมาสาย'))) {
                lateCount++;
            }
        }
    }
    return lateCount;
}

// ฟังก์ชันอัปเดตการแสดงผลบนหน้าจอ
function updateDisplay() {
    const record = getDailyRecord();
    dailyStatusSpan.textContent = record.status || 'รอการเช็คอิน';
    checkInTimeSpan.textContent = record.checkIn ? formatTime(new Date(record.checkIn)) : '-';
    checkOutTimeSpan.textContent = record.checkOut ? formatTime(new Date(record.checkOut)) : '-';
}

// ฟังก์ชันสำหรับอัปเดตเวลาปัจจุบันบนหน้าจอ
function updateCurrentTime() {
    currentTimeSpan.textContent = formatTime(new Date());
}

// ฟังก์ชันสำหรับเช็คอิน
checkInBtn.addEventListener('click', () => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

    if (dayOfWeek === 0) { // วันอาทิตย์
        showNotification('วันนี้เป็นวันหยุดทำการ ไม่สามารถเช็คอินได้');
        return;
    }

    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    let status = 'ปกติ';
    let isLate = false;

    // ตรวจสอบว่ามาสายหรือไม่
    if (currentHour > CHECK_IN_TIME.hour || (currentHour === CHECK_IN_TIME.hour && currentMinute > CHECK_IN_TIME.minute)) {
        status = 'มาสาย';
        isLate = true;
    }

    const record = getDailyRecord();
    if (record.checkIn) {
        showWelcomeMessage('คุณได้เช็คอินไปแล้ววันนี้'); // เปลี่ยนเป็น welcomeMessage
        return;
    }

    record.checkIn = now.toISOString();
    record.status = status;
    if (isLate) {
        // เพิ่ม lateCount ใน local storage สำหรับการนับรายเดือน
        record.lateCount = (record.lateCount || 0) + 1;
    }
    saveDailyRecord(record);

    // ส่งข้อมูลไป Google Sheet
    sendToGoogleSheet({
        type: 'checkIn',
        date: getTodayDateString(),
        time: formatTime(now),
        status: status,
        reason: '', // ไม่มีเหตุผลสำหรับการเช็คอินปกติ
        deviceName: navigator.userAgent
    });

    showWelcomeMessage('ขอให้วันนี้เป็นวันที่ดี ไม่มีอุปสรรคในการทำงาน');

    // ตรวจสอบการมาสายรายเดือน
    const monthlyLateCount = getMonthlyLateCount();
    if (monthlyLateCount > 3) {
        showNotification(`คุณมาสายไปแล้ว ${monthlyLateCount} ครั้งในเดือนนี้! กรุณาปรับปรุง.`);
    }
});

// ฟังก์ชันสำหรับเช็คเอาต์
checkOutBtn.addEventListener('click', () => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

    if (dayOfWeek === 0) { // วันอาทิตย์
        showNotification('วันนี้เป็นวันหยุดทำการ ไม่สามารถเช็คเอาต์ได้');
        return;
    }

    const record = getDailyRecord();
    if (!record.checkIn) {
        showWelcomeMessage('กรุณาเช็คอินก่อน'); // เปลี่ยนเป็น welcomeMessage
        return;
    }
    if (record.checkOut) {
        showWelcomeMessage('คุณได้เช็คเอาต์ไปแล้ววันนี้'); // เปลี่ยนเป็น welcomeMessage
        return;
    }

    record.checkOut = now.toISOString();
    saveDailyRecord(record);

    // ส่งข้อมูลไป Google Sheet
    sendToGoogleSheet({
        type: 'checkOut',
        date: getTodayDateString(),
        time: formatTime(now),
        status: record.status, // ใช้สถานะเดิมที่เช็คอิน
        reason: '', // ไม่มีเหตุผลสำหรับการเช็คเอาต์ปกติ
        deviceName: navigator.userAgent
    });

    showWelcomeMessage('เช็คเอาต์เรียบร้อยแล้ว');
});

// ฟังก์ชันจัดการการกดปุ่มแจ้งเหตุ
let selectedReportType = ''; // เพื่อเก็บประเภทการแจ้งเหตุที่เลือก

function selectReportType(type) {
    selectedReportType = type;
    // อาจจะเปลี่ยนสีปุ่มที่เลือก หรือแสดงข้อความยืนยัน
    showNotification(`คุณเลือกแจ้งเหตุ: ${type}`);
}

reportAbsentBtn.addEventListener('click', () => selectReportType('ขาดงาน'));
reportLeaveBtn.addEventListener('click', () => selectReportType('ลางาน'));
reportLateBtn.addEventListener('click', () => selectReportType('แจ้งมาสาย'));

submitReportBtn.addEventListener('click', () => {
    if (!selectedReportType) {
        showNotification('กรุณาเลือกประเภทการแจ้งเหตุก่อน (ขาดงาน, ลางาน, แจ้งมาสาย)');
        return;
    }

    const reason = reportReasonInput.value.trim();
    const now = new Date();
    const dayOfWeek = now.getDay();

    if (dayOfWeek === 0) { // วันอาทิตย์
        showNotification('วันนี้เป็นวันหยุดทำการ ไม่สามารถแจ้งเหตุได้');
        return;
    }

    const record = getDailyRecord();
    // บันทึกการแจ้งเหตุลงใน reports array
    record.reports.push({
        type: selectedReportType,
        time: now.toISOString(),
        reason: reason
    });
    // อัปเดตสถานะหลักถ้าเป็นขาด/ลา
    if (selectedReportType === 'ขาดงาน' || selectedReportType === 'ลางาน') {
        record.status = selectedReportType;
    }
    saveDailyRecord(record);

    // ส่งข้อมูลไป Google Sheet
    sendToGoogleSheet({
        type: 'report',
        date: getTodayDateString(),
        time: formatTime(now),
        status: selectedReportType, // สถานะจะมาจากประเภทการแจ้งเหตุ
        reason: reason,
        deviceName: navigator.userAgent
    });

    showWelcomeMessage(`แจ้งเหตุ ${selectedReportType} เรียบร้อยแล้ว`);
    reportReasonInput.value = ''; // ล้างช่องเหตุผล
    selectedReportType = ''; // ล้างประเภทที่เลือก

    // ตรวจสอบการมาสายรายเดือน หากเพิ่งแจ้งมาสาย
    if (selectedReportType === 'แจ้งมาสาย') {
        const monthlyLateCount = getMonthlyLateCount();
        if (monthlyLateCount > 3) {
            showNotification(`คุณมาสายไปแล้ว ${monthlyLateCount} ครั้งในเดือนนี้! กรุณาปรับปรุง.`);
        }
    }
});


// ตรวจสอบเวลาแจ้งเตือน 15:30 น. (ข้อความใหม่)
function checkAfternoonReminder() {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    // เฉพาะวันจันทร์-เสาร์ และช่วงเวลา 15:30 น.
    // ตรวจสอบในช่วง 15:30:00 ถึง 15:30:59 เพื่อให้แน่ใจว่าแจ้งเตือนเพียงครั้งเดียวต่อนาที
    if (dayOfWeek >= 1 && dayOfWeek <= 6 && currentHour === 15 && currentMinute === 30) {
        // เพิ่มเงื่อนไขเพื่อให้แจ้งเตือนแค่ครั้งเดียวต่อวัน
        const today = getTodayDateString();
        const reminderKey = `reminder_1530_${today}`;
        if (!localStorage.getItem(reminderKey)) {
            showNotification('ใกล้เลิกงานแล้ว! เร่งเคลียร์งานออกก่อนหมดเวลางาน');
            localStorage.setItem(reminderKey, 'true'); // บันทึกว่าแจ้งเตือนแล้ว
        }
    } else {
        // รีเซ็ตการแจ้งเตือนเมื่อไม่ใช่เวลา 15:30 น. เพื่อให้แจ้งเตือนใหม่ได้ในวันถัดไป
        // (ส่วนนี้อาจจะทำในฟังก์ชันที่รันตอนเที่ยงคืนจะดีกว่า แต่ใส่ไว้ตรงนี้เผื่อการทดสอบ)
        const today = getTodayDateString();
        const reminderKey = `reminder_1530_${today}`;
        if (localStorage.getItem(reminderKey) && (currentHour > 15 || currentHour < 15 || currentMinute !== 30)) {
             localStorage.removeItem(reminderKey); // ลบสถานะการแจ้งเตือน
        }
    }
}


// ตรวจสอบสถานะ "ขาด" (ถ้ายังไม่มีการเช็คอินเลยหลังจากเวลาทำการ)
function checkAbsence() {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const currentHour = now.getHours();

    // ตรวจสอบหลังจากเวลาเริ่มงาน หากยังไม่มีการเช็คอิน และยังไม่ถูกตั้งค่าเป็นขาดหรือลา
    if (dayOfWeek >= 1 && dayOfWeek <= 6 && currentHour >= CHECK_IN_TIME.hour + 1) { // ตรวจสอบ 1 ชั่วโมงหลังเวลาเริ่มงาน เพื่อให้มีเวลาเช็คอิน
        const record = getDailyRecord();
        const alreadyReportedAbsentOrLeave = record.reports.some(r => r.type === 'ขาดงาน' || r.type === 'ลางาน');

        if (!record.checkIn && record.status !== 'ขาด' && record.status !== 'ลา' && !alreadyReportedAbsentOrLeave) {
            record.status = 'ขาด';
            saveDailyRecord(record);
            sendToGoogleSheet({
                type: 'absence_auto', // ระบุว่าเป็นขาดอัตโนมัติ
                date: getTodayDateString(),
                time: formatTime(now),
                status: 'ขาด',
                reason: 'ระบบบันทึกเป็นขาดอัตโนมัติ',
                deviceName: navigator.userAgent
            });
            showNotification('คุณยังไม่ได้เช็คอินวันนี้ ระบบบันทึกเป็น "ขาด" อัตโนมัติ');
        }
    }
}

// เรียกใช้ฟังก์ชันเมื่อโหลดหน้าเว็บ
document.addEventListener('DOMContentLoaded', () => {
    updateDisplay(); // อัปเดตข้อมูลบนหน้าจอเมื่อโหลด
    updateCurrentTime(); // แสดงเวลาปัจจุบันทันที

    // ตั้งเวลาสำหรับตรวจสอบการแจ้งเตือนและสถานะ "ขาด"
    setInterval(updateCurrentTime, 1000); // อัปเดตเวลาทุก 1 วินาที
    setInterval(checkAfternoonReminder, 60 * 1000); // ตรวจสอบทุก 1 นาที
    setInterval(checkAbsence, 10 * 60 * 1000); // ตรวจสอบสถานะขาดทุก 10 นาที (เพื่อให้มีเวลาเช็คอิน)

    // เรียกใช้ครั้งแรกเมื่อโหลดหน้า
    checkAfternoonReminder();
    checkAbsence();
});