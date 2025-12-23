import json
import os

# 1. 获取当前脚本所在目录 (即 python_server/)
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))

# 2. 计算 storage 目录 (python_server 的上一级 -> storage)
STORAGE_DIR = os.path.abspath(os.path.join(CURRENT_DIR, "..", "storage"))

# 3. 定义配置文件全路径
CONFIG_FILE = os.path.join(STORAGE_DIR, "widget_config.json")

# 4. 确保 storage 目录存在 (防止首次运行报错)
if not os.path.exists(STORAGE_DIR):
    try:
        os.makedirs(STORAGE_DIR)
        print(f"[Config] Created storage directory: {STORAGE_DIR}")
    except Exception as e:
        print(f"[Config] Failed to create storage directory: {e}")

DEFAULT_CONFIG = {
    "x": -1,
    "y": -1,
    "width": 380,
    "height": 400,
    "top": True,
    "draggable": False,
    "show_widget": True,
    "auto_start": False,    # 开机自启
    "use_d3d9": False,    # 兼容模式 (D3D9)

    "opacity": 1.0,         # 透明度 (0.1 ~ 1.0)
    "click_through": False, # 点击穿透 (鼠标穿过窗口)
    
    # --- 性能/交互 ---
    "track_refresh": 30,    # 鼠标刷新率 ms
    "track_threshold": 10,  # 防抖阈值 px
    "idle_timeout": 2.0,    # 闲置判定时间 s
}

def load_config():
    if not os.path.exists(CONFIG_FILE):
        return DEFAULT_CONFIG.copy()
    try:
        with open(CONFIG_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            config = DEFAULT_CONFIG.copy()
            config.update(data)
            return config
    except:
        return DEFAULT_CONFIG.copy()

def save_config(config_data):
    try:
        current = load_config()
        current.update(config_data)
        with open(CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(current, f, indent=4)
    except Exception as e:
        print(f"[Config] Save failed: {e}")