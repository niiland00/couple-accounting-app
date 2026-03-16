const API = "";

// 頁面載入時：檢查是否有存過 ID
window.onload = function() {
    const savedID = localStorage.getItem('coupleID');
    if (savedID) {
        showMainApp(savedID);
    }
};

// 切換 UI 顯示
function showMainApp(id) {
    document.getElementById('id-section').style.display = 'none';
    document.getElementById('main-app').style.display = 'block';
    document.getElementById('display-id').innerText = id;
    loadRecords();
}

// 儲存 ID
async function saveCoupleID() {
    const codeInput = document.getElementById('couple-id-input').value.trim();
    if (!codeInput) return alert("請輸入 ID");

    // 呼叫新的 join_couple 路由
    const response = await fetch("/join_couple", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ couple_code: codeInput })
    });

    const data = await response.json();

    if (data.couple_id) {
        // 重要：這裏存入的是資料庫給的【數字 ID】，這樣 records 表才讀得到
        localStorage.setItem('coupleID', data.couple_id); 
        localStorage.setItem('coupleCode', data.couple_code); 
        showMainApp(data.couple_id, data.couple_code);
    } else {
        alert("登入失敗：" + data.error);
    }
}

// 重設 ID
function resetID() {
    if(confirm("確定要更換 ID 嗎？")) {
        localStorage.removeItem('coupleID');
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

        function search(){
    let date = document.getElementById("searchDate").value;
    if (!date) return loadRecords();

    fetch(API + "/search/" + date)
    .then(r => r.json())
    .then(data => {
        renderUI(data);
    });
}

// 5. 核心渲染功能：保留你的句子 + 方塊排版
function renderUI(data) {
    let list = document.getElementById("records");
    list.innerHTML = "";

    data.forEach(r => {
        // 拆解日期做小方塊
        const dateObj = new Date(r.created_at);
        const month = dateObj.getMonth() + 1;
        const day = dateObj.getDate();

        // 這是你原本組合的句子
        let mySentence = r.created_at + " | " + r.item + " | " + r.payer + "爸爸付了" + r.price + "元";

        // 建立漂亮的清單項目
        let li = document.createElement("li");
        li.className = "record-card"; // 套用我們漂亮的 CSS
        li.innerHTML = `
            <div class="date-badge">
                <span class="month">${month}月</span>
                <span class="day">${day}</span>
            </div>
            <div class="record-info">
                <span class="record-text">${mySentence}</span>
            </div>
        `;
        list.appendChild(li);
    });
}