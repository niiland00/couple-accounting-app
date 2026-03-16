const API = "";

function addRecord(){

    let item = document.getElementById("item").value;
	let desc = document.getElementById("desc").value;
	let price = document.getElementById("price").value;
	let payer = document.getElementById("payer").value;
	let date = document.getElementById("date").value;

    fetch(API + "/add_expense",{
        method:"POST",
        headers:{
            "Content-Type":"application/json"
        },
        body:JSON.stringify({
            couple_id:1,
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
        document.getElementById("price").value = "";
        loadRecords();
    })
    .catch(err => {
        console.error("新增失敗:", err);
        alert("新增失敗，請看 Console 報錯");
    });
}

function loadRecords(){

    fetch(API + "/expenses/1")
    .then(r=>r.json())
    .then(data=>{

        let list = document.getElementById("records");
        list.innerHTML="";

        data.forEach(r=>{

            let li=document.createElement("li");
            li.innerText =
			r.created_at + " | " +
			r.item + " | " +
			r.payer + "爸爸付了" +
			r.price + "元";
			
            list.appendChild(li);

        });

    });

}

function search(){

let date = document.getElementById("searchDate").value;

fetch(API + "/search/" + date)
.then(r=>r.json())
.then(data=>{

let list = document.getElementById("records");
list.innerHTML="";

data.forEach(r=>{
	let li=document.createElement("li");

	li.innerText =
		r.created_at + " | " +
		r.item + " | " +
		r.payer + "爸爸付了" +
		r.price + "元";

list.appendChild(li);
});

});
}

loadRecords();