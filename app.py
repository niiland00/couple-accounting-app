from flask import Flask, request, jsonify, render_template, send_from_directory
from flask_cors import CORS
import mysql.connector
import os

app = Flask(__name__, 
            template_folder="templates", 
            static_folder="static")
CORS(app)

# --- 資料庫連線設定 (優化版) ---
def get_db_connection():
    try:
        # 確保從環境變數讀取，否則 Render 會連不到 Aiven
        conn = mysql.connector.connect(
            host=os.getenv("DB_HOST"),
            port=int(os.getenv("DB_PORT", 15967)),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASS"), 
            database=os.getenv("DB_NAME"),
            autocommit=True,
            # Aiven 建議加上這行來確保 SSL 啟動
            ssl_ca=None, # 如果有下載 Aiven 的 ca.pem，請指向該路徑
            ssl_verify_cert=False # 在沒設定 ca.pem 時，暫時跳過驗證以確保能連上
        )
        return conn
    except Exception as e:
        print(f"❌ 資料庫連線失敗: {e}")
        return None

# --- API 路由 (加上安全檢查) ---

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/service-worker.js")
def service_worker():
    return send_from_directory("static", "service-worker.js")

@app.route("/join_couple", methods=["POST"])
def join_couple():
    data = request.json
    code = data.get("couple_code", "").strip().upper()
    if not code:
        return jsonify({"error": "請輸入暗號"}), 400

    db = get_db_connection()
    if not db:
        return jsonify({"error": "伺服器資料庫連線中，請稍後再試"}), 503
    
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id FROM couples WHERE couple_code=%s", (code,))
        result = cursor.fetchone()
        if result:
            return jsonify({"couple_id": result["id"], "couple_code": code})
        else:
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
    if not db: return jsonify({"error": "資料庫連線失敗"}), 503
    
    cursor = db.cursor()
    try:
        cursor.execute(
            "INSERT INTO records (couple_id, item, description, price, payer, created_at) VALUES (%s, %s, %s, %s, %s, %s)",
            (data["couple_id"], data["item"], data["description"], data["price"], data["payer"], data.get("date"))
        )
        return jsonify({"status": "ok"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        db.close()

@app.route("/expenses/<couple_id>")
def expenses(couple_id):
    db = get_db_connection()
    if not db: return jsonify({"error": "資料庫連線失敗"}), 503
    
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM records WHERE couple_id=%s ORDER BY created_at DESC, id DESC", (couple_id,))
        result = cursor.fetchall()
        for row in result:
            if row['created_at']: row['created_at'] = str(row['created_at'])
        return jsonify(result)
    finally:
        cursor.close()
        db.close()

@app.route("/search/<couple_id>/<date>")
def search(couple_id, date):
    db = get_db_connection()
    if not db: return jsonify({"error": "資料庫連線失敗"}), 503
    
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM records WHERE couple_id=%s AND created_at=%s ORDER BY id DESC", (couple_id, date))
        result = cursor.fetchall()
        for row in result:
            if row['created_at']: row['created_at'] = str(row['created_at'])
        return jsonify(result)
    finally:
        cursor.close()
        db.close()

@app.route("/add_anniversary", methods=["POST"])
def add_anniversary():
    data = request.json
    db = get_db_connection()
    if not db: return jsonify({"error": "資料庫連線失敗"}), 503
    
    cursor = db.cursor()
    try:
        cursor.execute("INSERT INTO anniversaries (couple_id, title, date) VALUES (%s, %s, %s)",
                       (data["couple_id"], data["title"], data["date"]))
        return jsonify({"status": "ok"})
    finally:
        cursor.close()
        db.close()

@app.route("/anniversaries/<couple_id>")
def get_anniversaries(couple_id):
    db = get_db_connection()
    if not db: return jsonify({"error": "資料庫忙碌中"}), 503
    
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM anniversaries WHERE couple_id=%s", (couple_id,))
        result = cursor.fetchall()
        for row in result: row['date'] = str(row['date'])
        return jsonify(result)
    finally:
        cursor.close()
        db.close()

@app.route("/delete_anniversary/<int:anniversary_id>", methods=["DELETE"])
def delete_anniversary(anniversary_id):
    db = get_db_connection()
    if not db: return jsonify({"error": "連線失敗"}), 503
    
    cursor = db.cursor()
    try:
        cursor.execute("DELETE FROM anniversaries WHERE id = %s", (anniversary_id,))
        return jsonify({"status": "ok"})
    finally:
        cursor.close()
        db.close()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port, debug=False)