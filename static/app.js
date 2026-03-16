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
	
	if (!item || !price) return alert("項目與金額必填喔！");

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

function loadRecords(){
	const coupleId = localStorage.getItem('coupleID');
    fetch(API + "/expenses/" + coupleId)
    .then(r=>r.json())
    .then(data => {
        renderUI(data);
    });
}

function search() {
    const coupleId = localStorage.getItem('coupleID'); // 取得當前帳號數字 ID
    let date = document.getElementById("searchDate").value;
    
    // 如果沒選日期就點搜尋，就載入全部紀錄
    if (!date) return loadRecords();

    // 注意：這裡的路徑要加上 coupleId
    fetch(API + "/search/" + coupleId + "/" + date)
    .then(r => r.json())
    .then(data => {
        renderUI(data); // 使用統一的渲染函數
    })
    .catch(err => console.error("搜尋發生錯誤:", err));
}

// --- 核心渲染功能：升級為可展開式卡片 ---
function renderUI(data) {
    let list = document.getElementById("records");
    if (!list) return;
    list.innerHTML = "";

    data.forEach(r => {
        // 解析日期
        const dateParts = r.created_at.split("-");
        const month = parseInt(dateParts[1]);
        const day = parseInt(dateParts[2]);

        // 建立清單項目 (li)
        let li = document.createElement("li");
        li.className = "record-card"; // 依然套用卡片樣式

        // 生成卡片的 HTML 結構
        li.innerHTML = `
            <div class="card-header" onclick="toggleDetails(this)">
                <div class="date-badge">
                    <span class="month">${month}月</span>
                    <span class="day">${day}</span>
                </div>
                <div class="header-info">
                    <span class="record-item">${r.item}</span>
                    <span class="record-price">$${r.price}</span>
                </div>
                <span class="arrow-icon">▼</span> </div>

            <div class="card-details">
                <div class="details-content">
                    <p><strong>描述：</strong>${r.description || '（無描述）'}</p>
                    <p><strong>付款人：</strong>${r.payer}爸爸</p>
                </div>
            </div>
        `;
        list.appendChild(li);
    });
}

// --- 控制細項展開/折疊的函數 ---
function toggleDetails(headerElement) {
    // 找到這張卡片內的 .card-details 區塊
    const card = headerElement.parentElement;
    const details = card.querySelector('.card-details');
    const arrow = headerElement.querySelector('.arrow-icon');

    // 切換 'active' 類別
    const isActive = details.classList.toggle('active');
    
    // 旋轉箭頭
    if (isActive) {
        arrow.style.transform = 'rotate(180deg)';
    } else {
        arrow.style.transform = 'rotate(0deg)';
    }
}