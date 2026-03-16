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
    # 優先讀取雲端環境變數，若無則使用本地預設值
    return mysql.connector.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", 3306)),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASS", "Zxcvxc1001##"),
        database=os.getenv("DB_NAME", "couple_accounting"),
        autocommit=True  # 自動提交，確保資料即時寫入
    )

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

@app.route("/create_couple", methods=["POST"])
def create_couple():
    code = generate_code()
    #db = get_db_connection()
    #cursor = db.cursor(dictionary=True)
    try:
        cursor.execute(
            "INSERT INTO couples (couple_code) VALUES (%s)",
            (code,)
        )
        return jsonify({"couple_code": code})
    except Exception as e:
        return jsonify({"error": str(e)})
    finally:
        cursor.close()
        db.close()

@app.route("/add_expense", methods=["POST"])
def add_expense():
    data = request.json
    #db = get_db_connection()
    #cursor = db.cursor(dictionary=True)
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
    #db = get_db_connection()
    #cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM records WHERE couple_id=%s ORDER BY created_at DESC", (couple_id,))
        result = cursor.fetchall()
        # 轉換日期格式為字串，避免 JSON 序列化失敗
        for row in result:
            if row['created_at']:
                row['created_at'] = str(row['created_at'])
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)})
    finally:
        cursor.close()
        db.close()

@app.route("/search/<date>")
def search(date):
    #db = get_db_connection()
    #cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM records WHERE created_at=%s", (date,))
        result = cursor.fetchall()
        for row in result:
            if row['created_at']:
                row['created_at'] = str(row['created_at'])
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)})
    finally:
        cursor.close()
        db.close()

if __name__ == "__main__":
    # 部署到雲端時，雲端會自動給 port，本地則維持 8000
    port = int(os.environ.get("PORT", 8000))
    app.run(debug=True, host="0.0.0.0", port=port)