import subprocess
import sys
import os
import time
import threading
import webbrowser
from pystray import Icon, Menu, MenuItem
from PIL import Image, ImageDraw

print("[tray] start_tray.py launched")

# ==================================================
# Python 路径
# ==================================================

PYTHON_EXE = sys.executable
PYTHONW_EXE = PYTHON_EXE.replace("python.exe", "pythonw.exe")

print(f"[tray] python.exe  = {PYTHON_EXE}")
print(f"[tray] pythonw.exe = {PYTHONW_EXE}")

# ==================================================
# 全局状态
# ==================================================

http_proc = None
server_proc = None

server_console_visible = False   # 是否显示控制台
server_running = False           # 是否正在运行

# ==================================================
# HTTP SERVER
# ==================================================

def start_http():
    print("[tray] starting http.server")
    return subprocess.Popen(
        [PYTHON_EXE, "-m", "http.server", "10452"],
        creationflags=subprocess.CREATE_NO_WINDOW
    )

def stop_http():
    global http_proc
    if http_proc and http_proc.poll() is None:
        print("[tray] stopping http.server")
        http_proc.terminate()
    http_proc = None

# ==================================================
# SERVER.PY
# ==================================================

def start_server():
    global server_proc, server_running

    base_dir = os.path.dirname(os.path.abspath(__file__))
    log_dir = os.path.join(base_dir, "log", "python_server")

    if not os.path.exists(log_dir):
        try:
            os.makedirs(log_dir)
            print(f"[tray] Created log directory: {log_dir}")
        except Exception as e:
            print(f"[tray] Failed to create log directory: {e}")

    env = os.environ.copy()
    env["PYTHONIOENCODING"] = "utf-8"
    env["PYTHONUNBUFFERED"] = "1"

    if server_console_visible:
        print("[tray] starting server.py WITH console")
        server_proc = subprocess.Popen(
            [PYTHON_EXE, "server.py"],
            creationflags=subprocess.CREATE_NEW_CONSOLE,
            env=env
        )
    else:
        stdout_path = os.path.join(log_dir, "server_stdout.log")
        stderr_path = os.path.join(log_dir, "server_stderr.log")
        
        print(f"[tray] starting server.py HIDDEN")
        print(f"[tray] Logging to: {log_dir}")

        try:
            stdout_file = open(stdout_path, "w", encoding="utf-8")
            stderr_file = open(stderr_path, "w", encoding="utf-8")
        except Exception as e:
            print(f"[tray] Error opening log files: {e}")
            return

        server_proc = subprocess.Popen(
            [PYTHONW_EXE, "server.py"],
            creationflags=subprocess.CREATE_NO_WINDOW,
            stdout=stdout_file,
            stderr=stderr_file,
            stdin=subprocess.DEVNULL,
            env=env,
            text=True
        )

    server_running = True
    update_tray_icon()

def stop_server():
    global server_proc, server_running

    if server_proc and server_proc.poll() is None:
        print("[tray] stopping server.py")
        server_proc.terminate()
        try:
            server_proc.wait(timeout=3)
        except subprocess.TimeoutExpired:
            print("[tray] server.py kill")
            server_proc.kill()

    server_proc = None
    server_running = False
    update_tray_icon()

def restart_server():
    print("[tray] restarting server.py")
    stop_server()
    time.sleep(0.3)
    start_server()

# ==================================================
# 控制台切换
# ==================================================

def toggle_server_console(icon=None, item=None):
    global server_console_visible
    server_console_visible = not server_console_visible

    print(
        f"[tray] toggle console -> "
        f"{'SHOW' if server_console_visible else 'HIDE'}"
    )

    restart_server()

# ==================================================
# server.py 退出监控
# ==================================================

def monitor_server_exit():
    global server_proc, server_console_visible, server_running

    print("[tray] server monitor thread started")

    while True:
        time.sleep(1)

        if not server_proc:
            continue

        if server_proc.poll() is not None:
            print(
                "[tray] detected server.py exit | "
                f"console_mode={'ON' if server_console_visible else 'OFF'}"
            )

            server_proc = None
            server_running = False
            update_tray_icon()

            if server_console_visible:
                print("[tray] reverting to hidden mode")
                server_console_visible = False
                time.sleep(0.5)
                start_server()

# ==================================================
# 浏览器跳转 [修改部分]
# ==================================================

def open_live2d(icon=None, item=None):
    """新增：打开看板娘页面"""
    url = "http://127.0.0.1:10452/live2d.html"
    print(f"[tray] Opening browser: {url}")
    webbrowser.open(url)

def open_settings(icon=None, item=None):
    """打开设置页面"""
    url = "http://127.0.0.1:10452/settings.html"
    print(f"[tray] Opening browser: {url}")
    webbrowser.open(url)

# ==================================================
# 托盘图标（颜色状态）
# ==================================================

def create_icon_image(color):
    img = Image.new("RGB", (64, 64), "black")
    d = ImageDraw.Draw(img)
    d.ellipse((8, 8, 56, 56), fill=color)
    return img

def update_tray_icon():
    if tray_icon is None:
        return

    if not server_running:
        tray_icon.icon = create_icon_image("red")
        tray_icon.title = "Live2d Server: stopped"
    elif server_console_visible:
        tray_icon.icon = create_icon_image("yellow")
        tray_icon.title = "Live2d Server: running (console)"
    else:
        tray_icon.icon = create_icon_image("green")
        tray_icon.title = "Live2d Server: running (hidden)"

# ==================================================
# 托盘
# ==================================================

tray_icon = None

def menu_console_text(item):
    return "隐藏控制台" if server_console_visible else "显示控制台"

def on_exit(icon, item):
    print("[tray] exiting, stopping all services")
    stop_server()
    stop_http()
    icon.stop()
    os._exit(0)

def run_tray():
    global tray_icon

    print("[tray] tray starting")

    # 在 Menu 中添加了 "打开看板娘"
    tray_icon = Icon(
        "PythonService",
        create_icon_image("red"),
        "Server: stopped",
        menu=Menu(
            MenuItem("打开看板娘", open_live2d),         # <--- [新增] 1. 打开看板娘
            MenuItem("打开设置页面", open_settings),      # <--- 2. 打开设置
            MenuItem(menu_console_text, toggle_server_console),
            MenuItem("重启 server.py", lambda i, x: restart_server()),
            MenuItem("关闭所有服务", on_exit),
        )
    )

    update_tray_icon()
    tray_icon.run()

# ==================================================
# main
# ==================================================

if __name__ == "__main__":
    print("[tray] boot services")

    http_proc = start_http()
    start_server()

    threading.Thread(
        target=monitor_server_exit,
        daemon=True
    ).start()

    run_tray()