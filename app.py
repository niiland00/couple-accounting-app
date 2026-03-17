from flask import Flask, request, jsonify, render_template, send_from_directory
from flask_cors import CORS
import mysql.connector
import random
import string
import os

app = Flask(__name__, 
            template_folder="templates", 
            static_folder="static")
CORS(app)

# --- 資料庫連線設定 ---
def get_db_connection():
    # 這裡的 "YOUR_LOCAL_PASSWORD" 隨便填一個，
    # 只要確保 Render 上的 DB_PASS 環境變數有填 Aiven 密碼就好
    return mysql.connector.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", 3306)),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASS", "password_here"), # 這裡改回假的
        database=os.getenv("DB_NAME", "couple_accounting"),
        autocommit=True,
        ssl_disabled=False if os.getenv("DB_HOST") else True
    )
        return conn
    except Exception as e:
        print(f"連線失敗原因: {e}")
        return None

def generate_code():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

# --- 前端路由 ---

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/service-worker.js")
def service_worker():
    return send_from_directory("static", "service-worker.js")

# --- API 路由 ---

@app.route("/join_couple", methods=["POST"])
def join_couple():
    data = request.json
    code = data.get("couple_code", "").strip().upper() # 轉大寫一致化
    
    if not code:
        return jsonify({"error": "請輸入暗號"}), 400

    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    try:
        # 1. 先查看看這個暗號存不存在
        cursor.execute("SELECT id FROM couples WHERE couple_code=%s", (code,))
        result = cursor.fetchone()
        
        if result:
            # 如果存在，回傳現有的整數 ID
            return jsonify({"couple_id": result["id"], "couple_code": code})
        else:
            # 2. 如果不存在，就幫他新增一個
            cursor.execute("INSERT INTO couples (couple_code) VALUES (%s)", (code,))
            return jsonify({"couple_id": cursor.lastrowid, "couple_code": code})
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        db.close()

@app.route("/add_expense", methods=["POST"])
def add_expense():
    data = request.json
    
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute(
            """
            INSERT INTO records 
            (couple_id, item, description, price, payer, created_at) 
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (
                data["couple_id"],
                data["item"],
                data["description"],
                data["price"],
                data["payer"],
                data.get("date")  # 確保前端傳過來的 key 是 date
            )
        )
        return jsonify({"status": "ok"})
    except Exception as e:
        print("SQL錯誤:", e)
        return jsonify({"error": str(e)})
    finally:
        cursor.close()
        db.close()

@app.route("/expenses/<couple_id>")
def expenses(couple_id):
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    try:
        # 加上 ORDER BY created_at DESC (由新到舊)
        # 如果你想由舊到新，就改成 ASC
        cursor.execute("""
            SELECT * FROM records 
            WHERE couple_id=%s 
            ORDER BY created_at DESC, id DESC
        """, (couple_id,))
        
        result = cursor.fetchall()
        for row in result:
            if row['created_at']:
                row['created_at'] = str(row['created_at'])
        return jsonify(result)
    finally:
        cursor.close()
        db.close()

@app.route("/search/<couple_id>/<date>") # 這裡改為接收兩個參數
def search(couple_id, date):
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    try:
        # 關鍵：必須同時檢查 couple_id 和 date，才不會搜到別人的資料
        cursor.execute("""
            SELECT * FROM records 
            WHERE couple_id=%s AND created_at=%s 
            ORDER BY id DESC
        """, (couple_id, date))
        
        result = cursor.fetchall()
        
        for row in result:
            if row['created_at']:
                row['created_at'] = str(row['created_at'])
        return jsonify(result)
    except Exception as e:
        print("搜尋 SQL 錯誤:", e) # 在 Logs 裡看這個
        return jsonify({"error": str(e)})
    finally:
        cursor.close()
        db.close()

if __name__ == "__main__":
    import os
    # 確保這行有在裡面，雲端平台一定要靠它
    port = int(os.environ.get("PORT", 8000))
    app.run(host="0.0.0.0", port=port, debug=False)