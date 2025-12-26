import sqlite3
import time
import os
import psutil
import win32gui
import win32process
import threading
import datetime
import json

import config_manager

# === 路径配置 ===
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
# 根目录/storage/user_report/database/
REPORT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, "..", "storage", "user_report"))
DB_DIR = os.path.join(REPORT_ROOT, "database")
HTML_DIR = os.path.join(REPORT_ROOT, "html")
DB_PATH = os.path.join(DB_DIR, "activity_log.db")

# 确保目录存在
for d in [DB_DIR, HTML_DIR]:
    if not os.path.exists(d):
        os.makedirs(d)

class ActivityTracker:
    def __init__(self):
        self.running = False
        self._init_db()
        self.HTML_DIR = HTML_DIR 
        self.DB_PATH = DB_PATH
        self.config = {
            "enabled": True,
            "prompt": "请根据以下数据生成HTML报告...",
        }

    def _init_db(self):
        conn = sqlite3.connect(DB_PATH, check_same_thread=False)
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS activities (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp REAL,
                date_str TEXT,
                time_str TEXT,
                app_name TEXT,
                window_title TEXT,
                duration INTEGER DEFAULT 5
            )
        ''')
        conn.commit()
        conn.close()

    def get_active_window_info(self):
        """获取当前前台窗口的标题和进程名"""
        try:
            hwnd = win32gui.GetForegroundWindow()
            if hwnd == 0: return None, None
            
            # 获取标题
            title = win32gui.GetWindowText(hwnd)
            
            # 获取进程名
            _, pid = win32process.GetWindowThreadProcessId(hwnd)
            try:
                process = psutil.Process(pid)
                app_name = process.name()
            except:
                app_name = "unknown"
                
            return app_name, title
        except Exception as e:
            # print(f"Tracker Error: {e}")
            return None, None

    def start_recording(self):
        if self.running: return
        self.running = True
        threading.Thread(target=self._loop, daemon=True).start()
        print(f"[Tracker] Recording to {DB_PATH}")

    def stop_recording(self):
        self.running = False

    def _loop(self):
        conn = sqlite3.connect(DB_PATH, check_same_thread=False)
        cursor = conn.cursor()
        
        while self.running:
            # 【核心修改】每次循环读取最新配置
            # 这样用户在 settings_window 改了之后，这里哪怕不重启也能大概5秒后生效
            cfg = config_manager.load_config()
            if not cfg.get("record_activity", True):
                # 如果关闭了，就空转
                time.sleep(5)
                continue

            try:
                app_name, title = self.get_active_window_info()
                
                if app_name and title:
                    now = time.time()
                    dt = datetime.datetime.fromtimestamp(now)
                    date_str = dt.strftime("%Y-%m-%d")
                    time_str = dt.strftime("%H:%M:%S")

                    # 1. 查询最后一条记录
                    cursor.execute('''
                        SELECT id, app_name, window_title, date_str 
                        FROM activities 
                        ORDER BY id DESC LIMIT 1
                    ''')
                    last_row = cursor.fetchone()

                    is_merged = False
                    
                    if last_row:
                        last_id, last_app, last_title, last_date = last_row
                        
                        # 2. 判断逻辑：应用名相同 AND 标题相同 AND 日期相同（防止跨天聚合）
                        if last_app == app_name and last_title == title and last_date == date_str:
                            # 3. 更新操作：只增加时长
                            cursor.execute('''
                                UPDATE activities 
                                SET duration = duration + 5 
                                WHERE id = ?
                            ''', (last_id,))
                            is_merged = True

                    # 4. 插入操作：如果无法合并（不同程序、不同标题、或第一条记录）
                    if not is_merged:
                        cursor.execute('''
                            INSERT INTO activities (timestamp, date_str, time_str, app_name, window_title, duration)
                            VALUES (?, ?, ?, ?, ?, ?)
                        ''', (now, date_str, time_str, app_name, title, 5))
                    
                    conn.commit()

            except Exception as e:
                print(f"[Tracker] Error: {e}")
            
            time.sleep(5)
        conn.close()

    # === ④ 查看数据 (分页/搜索) ===
    def get_data_grid(self, page=1, page_size=20, search=""):
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        offset = (page - 1) * page_size
        
        query = "SELECT id, date_str, time_str, app_name, window_title, duration FROM activities"
        params = []
        
        if search:
            query += " WHERE app_name LIKE ? OR window_title LIKE ?"
            params = [f"%{search}%", f"%{search}%"]
            
        query += " ORDER BY id DESC LIMIT ? OFFSET ?"
        params.extend([page_size, offset])
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        
        # 获取总数
        count_query = "SELECT COUNT(*) FROM activities"
        if search:
            count_query += " WHERE app_name LIKE ? OR window_title LIKE ?"
            count_params = [f"%{search}%", f"%{search}%"]
            cursor.execute(count_query, count_params)
        else:
            cursor.execute(count_query)
            
        total = cursor.fetchone()[0]
        conn.close()
        
        return {"rows": rows, "total": total, "page": page}

    # === ③ 删除数据 ===
    def clear_data(self):
        conn = sqlite3.connect(DB_PATH)
        conn.execute("DELETE FROM activities") # 或 DROP TABLE
        conn.commit()
        conn.close()

    # === ⑤ & ⑥ 查询逻辑与生成 ===
    def execute_query_for_report(self, query_type="daily", custom_sql=None):
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        today = datetime.datetime.now().strftime("%Y-%m-%d")
        
        sql = ""
        params = []
        
        if custom_sql:
            sql = custom_sql # 高级模式：直接执行用户SQL
        elif query_type == "daily":
            # 每日聚合：按APP汇总时长
            sql = '''
                SELECT app_name, SUM(duration)/60 as mins, GROUP_CONCAT(DISTINCT window_title)
                FROM activities WHERE date_str = ? 
                GROUP BY app_name ORDER BY mins DESC
            '''
            params = [today]
        elif query_type == "weekly":
            # 每周聚合 (最近7天)
            # SQLite 的 date function
            sql = '''
                SELECT date_str, app_name, SUM(duration)/60 as mins
                FROM activities 
                WHERE date_str >= date('now', '-7 days')
                GROUP BY date_str, app_name
                ORDER BY date_str DESC, mins DESC
            '''
        
        try:
            cursor.execute(sql, params)
            rows = cursor.fetchall()
            # 获取列名
            columns = [description[0] for description in cursor.description]
            return {"columns": columns, "data": rows, "success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}
        finally:
            conn.close()

    def save_html_report(self, html_content):
        filename = f"report_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.html"
        filepath = os.path.join(HTML_DIR, filename)
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(html_content)
        return filepath

# 全局单例
tracker = ActivityTracker()