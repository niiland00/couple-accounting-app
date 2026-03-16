const API = "";

// 新增全域變數
let currentRecords = [];
let displayDate = new Date(); // 追蹤目前顯示的月份
let myChart = null; // 儲存圖表實例

// 頁面載入時：檢查是否有存過 ID
window.onload = function() {
    const savedID = localStorage.getItem('coupleID');
    const savedCode = localStorage.getItem('coupleCode');
    if (savedID && savedCode) {
        showMainApp(savedID, savedCode);
    }
};

// 切換 UI 顯示
function showMainApp(id, code) {
    document.getElementById('id-section').style.display = 'none';
    document.getElementById('main-app').style.display = 'block';
    
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
    const coupleId = localStorage.getItem('coupleID');
    let item = document.getElementById("item").value;
    let desc = document.getElementById("desc").value;
    let price = document.getElementById("price").value;
    let payer = document.getElementById("payer").value;
    let date = document.getElementById("date").value;
    
    if (!item || !price || !date) return alert("項目、金額與日期均為必填喔！");

    fetch(API + "/add_expense",{
        method:"POST",
        headers:{ "Content-Type":"application/json" },
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
        alert("記帳成功！");
        document.getElementById("item").value = "";
        document.getElementById("desc").value = "";
        document.getElementById("price").value = "";
        document.getElementById("payer").value = "";
        loadRecords();
    })
    .catch(err => alert("新增失敗，請看 Console 報錯"));
}

// --- 修改：載入紀錄 (加入月份顯示與過濾) ---
function loadRecords(){
    const coupleId = localStorage.getItem('coupleID');
    const year = displayDate.getFullYear();
    const month = (displayDate.getMonth() + 1).toString().padStart(2, '0');
    
    // 更新介面上的月份文字
    document.getElementById('current-month-display').innerText = `${year}年 ${month}月`;

    fetch(API + "/expenses/" + coupleId)
    .then(r=>r.json())
    .then(data => {
        currentRecords = data;
        // 只過濾出符合該年月的資料
        const filtered = data.filter(r => r.created_at.startsWith(`${year}-${month}`));
        renderUI(filtered);
    });
}

// --- 新增：月份切換功能 ---
function changeMonth(step) {
    displayDate.setMonth(displayDate.getMonth() + step);
    loadRecords();
}

function search() {
    const coupleId = localStorage.getItem('coupleID');
    let date = document.getElementById("searchDate").value;
    
    if (!date) return loadRecords();

    fetch(API + "/search/" + coupleId + "/" + date)
    .then(r => r.json())
    .then(data => {
        // 搜尋時不考慮月份過濾，直接顯示結果
        renderUI(data); 
    })
    .catch(err => console.error("搜尋發生錯誤:", err));
}

// --- 渲染 UI ---
function renderUI(data) {
    let list = document.getElementById("records");
    if (!list) return;
    list.innerHTML = "";

    data.forEach((r) => {
        // 為了讓 showDetail 能在全域紀錄中找到正確的那筆，我們用 r.id 或在過濾後的資料中找
        const dateParts = r.created_at.split("-");
        const month = parseInt(dateParts[1]);
        const day = parseInt(dateParts[2]);

        let li = document.createElement("div");
        li.className = "record-card"; 
        // 改用傳遞整筆資料物件的索引
        const realIndex = currentRecords.findIndex(item => item.id === r.id);
        li.onclick = () => showDetail(realIndex); 

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

// --- 詳細資訊功能 ---
function showDetail(index) {
    const r = currentRecords[index];
    if (!r) return;
    const listView = document.getElementById("list-view");
    const detailView = document.getElementById("detail-view");
    const detailContent = document.getElementById("detail-content");

    detailContent.innerHTML = `
        <div class="details-content">
            <div style="background: #FFF5EE; padding: 20px; border-radius: 15px; border: 1px dashed #FF8C00; color: #333; min-height: 120px; line-height: 1.6; font-size: 1.05rem;">
                ${r.description || '（這筆紀錄沒有填寫描述喔！）'}
            </div>
        </div>
    `;

    listView.style.display = "none";
    detailView.style.display = "block";
}

// --- 新增：大比拚統計功能 ---
function showStats() {
    document.getElementById('list-view').style.display = 'none';
    document.getElementById('stats-view').style.display = 'block';

    const year = displayDate.getFullYear();
    const month = (displayDate.getMonth() + 1).toString().padStart(2, '0');
    const filtered = currentRecords.filter(r => r.created_at.startsWith(`${year}-${month}`));

    const summary = {};
    filtered.forEach(r => {
        summary[r.payer] = (summary[r.payer] || 0) + parseFloat(r.price);
    });

    const labels = Object.keys(summary).map(p => p + "爸爸");
    const values = Object.values(summary);

    const ctx = document.getElementById('payerChart').getContext('2d');
    if (myChart) myChart.destroy();

    myChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: ['#FF8C00', '#FFB347', '#FFD580', '#E65100'],
                borderWidth: 1
            }]
        },
        options: { plugins: { legend: { position: 'bottom' } } }
    });

    const total = values.reduce((a, b) => a + b, 0);
    document.getElementById('stats-summary').innerHTML = `本月總支出：<strong>$${total}</strong>`;
}

// --- 返回列表功能 (包含從統計頁面返回) ---
function backToList() {
    document.getElementById("list-view").style.display = "block";
    document.getElementById("detail-view").style.display = "none";
    document.getElementById("stats-view").style.display = "none";
}