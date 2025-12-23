import subprocess
import sys
import os
import time
import threading
import webbrowser
import socket
import tkinter as tk
from tkinter import messagebox
from pystray import Icon, Menu, MenuItem
from PIL import Image, ImageDraw

print("[tray] start_tray.py launched")

# 添加模块搜索路径，以便能 import python_server 下的模块 (如 config_manager)
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), "python_server"))

# ==================================================
# Python 路径
# ==================================================

PYTHON_EXE = sys.executable
PYTHONW_EXE = PYTHON_EXE.replace("python.exe", "pythonw.exe")
WIDGET_CMD_PORT = 10453  # 必须与 live2d_window.py 一致

# 定义子目录名称，方便后续拼接路径
SUB_DIR = "python_server"

print(f"[tray] python.exe  = {PYTHON_EXE}")
print(f"[tray] pythonw.exe = {PYTHONW_EXE}")

# ==================================================
# 全局状态
# ==================================================

http_proc = None
server_proc = None
webview_proc = None

server_console_visible = False   # 是否显示控制台
server_running = False           # 是否正在运行
widget_is_top = True             # 记录挂件是否置顶的状态
widget_show_border = False       # 记录边框是否显示
widget_can_drag = False          # 记录是否允许拖拽

# ==================================================
# UDP 通信工具 (用于控制挂件)
# ==================================================

def send_widget_cmd(msg):
    """向桌面挂件发送指令"""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.sendto(msg.encode('utf-8'), ('127.0.0.1', WIDGET_CMD_PORT))
        sock.close()
        print(f"[tray] Sent command to widget: {msg}")
    except Exception as e:
        print(f"[tray] Failed to send command: {e}")

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
# 端口检测与清理工具 (交互式版)
# ==================================================

def get_process_name_by_pid(pid):
    """通过 PID 获取进程名称"""
    try:
        # tasklist /FI "PID eq 12345" /FO CSV /NH
        cmd = f'tasklist /FI "PID eq {pid}" /FO CSV /NH'
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        if result.stdout:
            # 输出格式通常为: "image_name","pid",...
            # 例如: "python.exe","12345","Console","1","10,000 K"
            parts = result.stdout.strip().split(',')
            if len(parts) > 0:
                return parts[0].replace('"', '')
    except:
        pass
    return "Unknown"

def check_and_kill_port(port):
    """
    检查端口占用，弹出窗口询问用户是否查杀
    """
    print(f"[tray] Checking port {port}...")
    try:
        # 1. 查找占用端口的 PID
        cmd = f'netstat -ano | findstr :{port}'
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        
        if not result.stdout:
            print(f"[tray] Port {port} is free.")
            return

        lines = result.stdout.strip().split('\n')
        pids = set()
        for line in lines:
            parts = line.split()
            # TCP 0.0.0.0:10452 ... LISTENING 12345
            if len(parts) > 4 and str(port) in parts[1]: 
                pid = parts[-1]
                if pid != "0": # 忽略 System Idle Process
                    pids.add(pid)
        
        if not pids:
            return

        print(f"[tray] Port {port} occupied by PIDs: {pids}")

        # 2. 遍历 PID 并询问用户
        for pid in pids:
            proc_name = get_process_name_by_pid(pid)
            
            # 初始化一个隐藏的 tk 主窗口用于弹窗
            root = tk.Tk()
            root.withdraw() # 隐藏主窗口
            root.attributes('-topmost', True) # 确保弹窗在最前
            
            msg = (f"端口 {port} 正被进程占用：\n\n"
                   f"进程名: {proc_name}\n"
                   f"PID: {pid}\n\n"
                   f"是否强制关闭该进程？\n"
                   f"(点击'是'关闭进程，点击'否'忽略)")
            
            user_choice = messagebox.askyesno("端口冲突警告", msg)
            root.destroy() # 销毁 tk 窗口

            if user_choice:
                try:
                    subprocess.run(f'taskkill /F /PID {pid}', shell=True, capture_output=True)
                    print(f"[tray] User chose to KILL PID {pid} ({proc_name})")
                except Exception as e:
                    print(f"[tray] Failed to kill PID {pid}: {e}")
            else:
                print(f"[tray] User chose to IGNORE PID {pid} ({proc_name})")
                
        time.sleep(0.5)
        
    except Exception as e:
        print(f"[tray] Port check failed: {e}")

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
    
    # 【修改点】路径拼接
    script_path = os.path.join(SUB_DIR, "server.py")

    if server_console_visible:
        print("[tray] starting server.py WITH console")
        server_proc = subprocess.Popen(
            [PYTHON_EXE, script_path], # 修改这里
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
            [PYTHONW_EXE, script_path], # 修改这里
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

def restart_all_services(icon=None, item=None):
    """重启所有服务 (HTTP, Server, Webview)"""
    print("[tray] Restarting ALL services...")
    
    # 1. 停止
    stop_webview()
    stop_server()
    stop_http()
    
    time.sleep(1) # 缓冲
    
    # 2. 启动
    global http_proc
    http_proc = start_http()
    start_server()
    
    # 根据配置决定是否启动挂件
    import config_manager
    cfg = config_manager.load_config()
    if cfg.get("show_widget", True):
        start_webview()
        
    print("[tray] All services restarted.")

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
# 实时读取子进程输出并打印 (辅助函数)
# ==================================================
def log_subprocess_output(pipe, prefix):
    """
    在独立线程中运行，实时读取子进程管道并在主控制台打印
    """
    try:
        # iter(pipe.readline, '') 会持续读取直到管道关闭
        for line in iter(pipe.readline, ''):
            # line 包含换行符，strip() 去掉它，避免多余空行
            print(f"{prefix} {line.strip()}")
    except Exception as e:
        print(f"{prefix} Log Error: {e}")
    finally:
        pipe.close()

# ==================================================
# 看板娘窗口
# ==================================================

def start_webview():
    global webview_proc
    
    if webview_proc and webview_proc.poll() is None:
        print("[tray] webview is already running")
        return

    print("[tray] starting live2d_window.py with output capture...")
    
    env = os.environ.copy()
    env["PYTHONUNBUFFERED"] = "1"
    
    # 【修改点】路径拼接
    script_path = os.path.join(SUB_DIR, "live2d_window.py")

    webview_proc = subprocess.Popen(
        [PYTHON_EXE, script_path], # 修改这里
        creationflags=subprocess.CREATE_NO_WINDOW,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        env=env
    )
    
    # 启动日志线程... (保持不变)
    t_out = threading.Thread(target=log_subprocess_output, args=(webview_proc.stdout, "[Live2D Info]"))
    t_out.daemon = True; t_out.start()
    t_err = threading.Thread(target=log_subprocess_output, args=(webview_proc.stderr, "[Live2D Error]"))
    t_err.daemon = True; t_err.start()
    
    # 初始化状态
    global widget_is_top, widget_can_drag, widget_show_border
    
    import config_manager
    cfg = config_manager.load_config()
    widget_is_top = cfg.get("top", True)
    widget_can_drag = cfg.get("draggable", False)
    widget_show_border = False 

def open_widget_settings_window(icon=None, item=None):
    """启动 Python 设置面板"""
    print("[tray] starting settings_window.py")
    # 【修改点】路径拼接 (虽然你下面还有一个 geometry settings 函数，但为了保险这里也改)
    script_path = os.path.join(SUB_DIR, "settings_window.py")
    subprocess.Popen([PYTHONW_EXE, script_path], creationflags=subprocess.CREATE_NO_WINDOW)

def stop_webview():
    global webview_proc
    if webview_proc and webview_proc.poll() is None:
        print("[tray] stopping live2d_window.py")
        webview_proc.terminate()
    webview_proc = None

def toggle_webview(icon=None, item=None):
    """开关看板娘 (带记忆功能)"""
    global webview_proc
    
    import config_manager
    
    if webview_proc and webview_proc.poll() is None:
        stop_webview()
        config_manager.save_config({"show_widget": False})
    else:
        start_webview()
        config_manager.save_config({"show_widget": True})

def is_webview_running(item):
    return webview_proc and webview_proc.poll() is None

# ==================================================
# 拖拽与边框控制函数
# ==================================================

def toggle_widget_drag(icon=None, item=None):
    """切换是否允许拖拽"""
    global widget_can_drag
    widget_can_drag = not widget_can_drag
    
    import config_manager
    config_manager.save_config({"draggable": widget_can_drag})
    
    cmd = "drag:on" if widget_can_drag else "drag:off"
    send_widget_cmd(cmd)

def is_widget_drag(item):
    return widget_can_drag

def toggle_widget_border(icon=None, item=None):
    """切换是否显示边框"""
    global widget_show_border
    widget_show_border = not widget_show_border
    
    cmd = "border:on" if widget_show_border else "border:off"
    send_widget_cmd(cmd)

def is_widget_border(item):
    return widget_show_border

# 托盘切换点击穿透
def toggle_widget_click_through(icon=None, item=None):
    """切换点击穿透"""
    import config_manager
    cfg = config_manager.load_config()
    new_state = not cfg.get("click_through", False)
    
    config_manager.save_config({"click_through": new_state})
    
    # 发送指令给挂件立即更新
    cmd = "click_through:on" if new_state else "click_through:off"
    send_widget_cmd(cmd)

def is_click_through(item):
    import config_manager
    cfg = config_manager.load_config()
    return cfg.get("click_through", False)

# ==================================================
# 菜单功能逻辑
# ==================================================

def open_widget_geometry_settings(icon=None, item=None):
    """启动 settings_window.py 并捕获输出"""
    print("[tray] starting settings_window.py (Geometry)...")
    
    env = os.environ.copy()
    env["PYTHONUNBUFFERED"] = "1"
    
    # 【修改点】路径拼接
    script_path = os.path.join(SUB_DIR, "settings_window.py")

    proc = subprocess.Popen(
        [PYTHON_EXE, script_path], # 修改这里
        creationflags=subprocess.CREATE_NO_WINDOW,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        env=env
    )

    t_out = threading.Thread(
        target=log_subprocess_output, 
        args=(proc.stdout, "[Settings Info]")
    )
    t_out.daemon = True 
    t_out.start()

    t_err = threading.Thread(
        target=log_subprocess_output, 
        args=(proc.stderr, "[Settings Error]")
    )
    t_err.daemon = True
    t_err.start()


def open_widget_web_settings(icon=None, item=None):
    """发送指令给挂件，让其在内部打开 Web 设置窗口"""
    print("[tray] sending open_web_settings command")
    
    if not is_webview_running(None):
        start_webview()
        time.sleep(1) 
        
    send_widget_cmd("open_web_settings")

def reload_widget(icon=None, item=None):
    """发送重载指令，让看板娘应用新的 Web 设置"""
    send_widget_cmd("reload")

def open_widget_debug(icon=None, item=None):
    url = "http://127.0.0.1:9222"
    webbrowser.open(url)

def toggle_widget_top(icon=None, item=None):
    """托盘快捷切换置顶"""
    import config_manager
    cfg = config_manager.load_config()
    
    new_state = not cfg["top"]
    config_manager.save_config({"top": new_state})
    
    send_widget_cmd("update_cfg")

def is_widget_top(item):
    import config_manager
    cfg = config_manager.load_config()
    return cfg.get("top", True)

# --- 组2: 外部浏览器 ---
def open_external_live2d(icon=None, item=None):
    """新增：打开看板娘页面"""
    url = "http://127.0.0.1:10452/live2d.html"
    print(f"[tray] Opening browser: {url}")
    webbrowser.open(url)

def open_external_settings(icon=None, item=None):
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

def on_exit(icon, item):
    print("[tray] exiting, stopping all services")
    stop_webview()
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
            # --- 核心控制 ---
            MenuItem("显示/隐藏桌面挂件", toggle_webview, checked=is_webview_running),
            MenuItem("窗口置顶", toggle_widget_top, checked=is_widget_top),
            MenuItem("解锁位置", toggle_widget_drag, checked=is_widget_drag),
            # MenuItem("显示边界框", toggle_widget_border, checked=is_widget_border),
            MenuItem("点击穿透", toggle_widget_click_through, checked=is_click_through),
            
            # --- 两个设置入口 ---
            Menu.SEPARATOR,
            MenuItem("看板娘配置", open_widget_web_settings),
            MenuItem("窗口及性能配置", open_widget_geometry_settings),
            MenuItem("刷新看板娘", reload_widget),
            
            Menu.SEPARATOR,

            MenuItem("调试与高级", Menu(
                # 外部浏览器组
                MenuItem("打开看板娘 (外部浏览器)", open_external_live2d),
                MenuItem("打开设置页 (外部浏览器)", open_external_settings),
                Menu.SEPARATOR,
                # 后端控制组
                MenuItem("显示 Python 控制台", toggle_server_console, checked=lambda i: server_console_visible),
                MenuItem("打开网页控制台 (Debug)", open_widget_debug),
                MenuItem("重启 server.py (后端)", restart_server),
            )),
            
            Menu.SEPARATOR,
            MenuItem("重启所有服务", restart_all_services),
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

    check_and_kill_port(10452) # HTTP Server
    check_and_kill_port(11542) # Python Backend (server.py)

    http_proc = start_http()
    start_server()

    # --- 根据配置决定是否启动看板娘 ---
    import config_manager
    cfg = config_manager.load_config()
    
    # 默认为 True，如果是 False 则不启动
    if cfg.get("show_widget", True):
        start_webview()
    else:
        print("[tray] Widget is disabled in config, skipping startup.")

    threading.Thread(
        target=monitor_server_exit,
        daemon=True
    ).start()

    run_tray()