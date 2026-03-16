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
        // 解析日期供小方塊使用
        const dateParts = r.created_at.split("-");
        const month = parseInt(dateParts[1]);
        const day = parseInt(dateParts[2]);

        // 建立清單項目
        let li = document.createElement("div");
        li.className = "record-card"; 
        li.onclick = () => showDetail(index); 

        let mySentence = r.item + " | " + r.payer + "爸爸付了" + r.price + "元";

        li.innerHTML = `
            <div class="card-header">
                <div class="date-badge">
                    <span class="month">${month}月</span>
                    <span class="day">${day}</span>
                </div>
                <div class="header-info">
                    <span class="record-text" style="font-size: 0.95rem; color: #444; line-height: 1.4;">
                        ${mySentence}
                    </span>
                </div>
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

    // 清空並填入僅含描述的內容
    detailContent.innerHTML = `
        <div class="details-content">
            <div style="background: #FFF5EE; padding: 20px; border-radius: 15px; border: 1px dashed #FF8C00; color: #333; min-height: 120px; line-height: 1.6; font-size: 1.05rem;">
                ${r.description || '（這筆紀錄沒有填寫描述喔！）'}
            </div>
            
            <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee; font-size: 0.85rem; color: #999;">
                <p>項目名稱：${r.item}</p>
                <p>紀錄時間：${r.created_at}</p>
            </div>
        </div>
    `;

    // 切換區域顯示
    listView.style.display = "none";
    detailView.style.display = "block";
}

// --- 返回列表功能 ---
function backToList() {
    document.getElementById("list-view").style.display = "block";
    document.getElementById("detail-view").style.display = "none";
}