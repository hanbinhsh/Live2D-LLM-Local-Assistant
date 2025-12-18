import json
import os

CONFIG_FILE = "widget_config.json"

DEFAULT_CONFIG = {
    "x": -1,
    "y": -1,
    "width": 380,
    "height": 400,
    "top": True,
    "draggable": False,
    "show_widget": True,

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