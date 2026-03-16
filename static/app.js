const API = "";

// 頁面載入時：檢查是否有存過 ID
window.onload = function() {
    const savedID = localStorage.getItem('coupleID');
    const savedCode = localStorage.getItem('coupleCode'); // 也要拿原本的文字暗號
    if (savedID && savedCode) {
        showMainApp(savedID, savedCode);
    }
};

// 切換 UI 顯示 (修正：明確區分 ID 與 Code)
function showMainApp(id, code) {
    document.getElementById('id-section').style.display = 'none';
    document.getElementById('main-app').style.display = 'block';
    
    // 顯示給人看的是文字 Code，背後跑的是數字 ID
    document.getElementById('display-id').innerText = code;
    loadRecords();
}

// 儲存 ID
async function saveCoupleID() {
    const codeInput = document.getElementById('couple-id-input').value.trim();
    if (!codeInput) return alert("請輸入 ID");

    try {
        const response = await fetch("/join_couple", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ couple_code: codeInput })
        });

        const data = await response.json();

        if (data.couple_id) {
            localStorage.setItem('coupleID', data.couple_id); 
            localStorage.setItem('coupleCode', data.couple_code); 
            showMainApp(data.couple_id, data.couple_code);
        } else {
            alert("登入失敗：" + (data.error || "未知錯誤"));
        }
    } catch (err) {
        alert("連線伺服器失敗，請檢查網路");
    }
}

// 重設 ID
function resetID() {
    if(confirm("確定要更換 ID 嗎？")) {
        localStorage.removeItem('coupleID');
        localStorage.removeItem('coupleCode');
        location.reload();
    }
}

function addRecord(){
    const coupleId = localStorage.getItem('coupleID'); // 動取取得 ID
    let item = document.getElementById("item").value;
    let desc = document.getElementById("desc").value;
    let price = document.getElementById("price").value;
    let payer = document.getElementById("payer").value;
    let date = document.getElementById("date").value;
    
    if (!item || !price || !date) return alert("項目、金額與日期均為必填喔！");

    fetch(API + "/add_expense",{
        method:"POST",
        headers:{
            "Content-Type":"application/json"
        },
        body:JSON.stringify({
            couple_id: coupleId,
            item:item,
            description:desc,
            price:price,
            payer:payer,
            date:date
        })
    })
    .then(async r => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "伺服器報錯");
        return data;
    })
    .then(data => {
        console.log("新增成功:", data);
        alert("記帳成功！");
        // 清空輸入框
        document.getElementById("item").value = "";
        document.getElementById("desc").value = "";
        document.getElementById("price").value = "";
        document.getElementById("payer").value = "";
        loadRecords();
    })
    .catch(err => {
        console.error("新增失敗:", err);
        alert("新增失敗，請看 Console 報錯");
    });
}

// 全域變數，暫存紀錄以利詳細頁面顯示
let currentRecords = [];

function loadRecords(){
    const coupleId = localStorage.getItem('coupleID');
    fetch(API + "/expenses/" + coupleId)
    .then(r=>r.json())
    .then(data => {
        currentRecords = data;
        renderUI(data);
    });
}

function search() {
    const coupleId = localStorage.getItem('coupleID');
    let date = document.getElementById("searchDate").value;
    
    if (!date) return loadRecords();

    fetch(API + "/search/" + coupleId + "/" + date)
    .then(r => r.json())
    .then(data => {
        currentRecords = data;
        renderUI(data); 
    })
    .catch(err => console.error("搜尋發生錯誤:", err));
}

// --- 核心渲染功能：改為點擊切換區域顯示 ---
function renderUI(data) {
    let list = document.getElementById("records");
    if (!list) return;
    list.innerHTML = "";

    data.forEach((r, index) => {
        // 建立清單項目
        let li = document.createElement("li");
        li.className = "record-card"; // 依然套用橘色卡片樣式
        li.style.padding = "15px";    // 確保文字有呼吸空間
        li.onclick = () => showDetail(index); 

        // 這裡完全保留你組合的句子
        let mySentence = r.created_at + " | " + r.item + " | " + r.payer + "爸爸付了" + r.price + "元";

        li.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                <span class="record-text" style="font-size: 0.95rem; color: #444;">${mySentence}</span>
                <span class="arrow-icon">❯</span>
            </div>
        `;
        list.appendChild(li);
    });
}

// --- 跳轉詳細資訊功能 ---
function showDetail(index) {
    const r = currentRecords[index];
    const listView = document.getElementById("list-view");
    const detailView = document.getElementById("detail-view");
    const detailContent = document.getElementById("detail-content");

    // 這裡修改為只顯示描述
    detailContent.innerHTML = `
        <div class="details-content">
            <h3 style="color: #FF8C00; margin-top: 0;">項目描述</h3>
            <p style="background: #FFF5EE; padding: 15px; border-radius: 12px; border: 1px dashed #FF8C00; color: #333; min-height: 100px; line-height: 1.6;">
                ${r.description || '（沒有填寫描述喔！）'}
            </p>
            <p style="font-size: 0.8rem; color: #999; text-align: right; margin-top: 10px;">
                紀錄日期：${r.created_at}
            </p>
        </div>
    `;

    listView.style.display = "none";
    detailView.style.display = "block";
}

// --- 返回列表功能 ---
function backToList() {
    document.getElementById("list-view").style.display = "block";
    document.getElementById("detail-view").style.display = "none";
}