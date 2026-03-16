from flask import Flask, request, jsonify, render_template, send_from_directory
from flask_cors import CORS
import mysql.connector
import random
import string
import os

# 1. 加上 template_folder 和 static_folder 設定
app = Flask(__name__, 
            template_folder="templates", 
            static_folder="static")
CORS(app)

# --- 資料庫連線 (建議改用 try-except 包起來) ---
def get_db_connection():
    return mysql.connector.connect(
        host=os.getenv("DB_HOST", "localhost"),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASS", "Zxcvxc1001##"),
        database=os.getenv("DB_NAME", "couple_accounting")
    )

db = get_db_connection()
cursor = db.cursor(dictionary=True)

# --- 新增前端路由 ---

# 讓首頁指向 index.html
@app.route("/")
def index():
    return render_template("index.html")

# 重要：Service Worker 必須放在根目錄路徑下才能覆蓋全站
@app.route("/service-worker.js")
def service_worker():
    return send_from_directory("static", "service-worker.js")

# --- 原有的 API 路由 ---
# ... (保持不變，但建議 cursor 改在 function 內執行確保連線穩定) ...

def generate_code():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))


@app.route("/create_couple", methods=["POST"])
def create_couple():

    code = generate_code()

    cursor.execute(
        "INSERT INTO couples (couple_code) VALUES (%s)",
        (code,)
    )

    db.commit()

    return jsonify({"couple_code": code})


@app.route("/add_expense", methods=["POST"])
def add_expense():

    data = request.json
    print("收到資料:", data)
    
    try:
        cursor.execute(
            """
            INSERT INTO records 
            (couple_id,item,description,price,payer,created_at) 
            VALUES (%s,%s,%s,%s,%s,%s)
            """,
            (
                data["couple_id"],
                data["item"],
                data["description"],
                data["price"],
                data["payer"],
                data["date"]
            )
        )

        db.commit()

        return jsonify({"status": "ok"})
    
    except Exception as e:
        print("SQL錯誤:", e)
        return jsonify({"error": str(e)})


@app.route("/expenses/<couple_id>")
def expenses(couple_id):

    cursor.execute(
        "SELECT * FROM records WHERE couple_id=%s",
        (couple_id,)
    )

    return jsonify(cursor.fetchall())
    
@app.route("/search/<date>")
def search(date):

    cursor.execute(
        "SELECT * FROM records WHERE created_at=%s",
        (date,)
    )

    return jsonify(cursor.fetchall())


if __name__ == "__main__":
    app.run(debug=True, port=8000) # 為了配合你之前的測試改為 8000