import os
import sys
import win32com.client 

SHORTCUT_NAME = "Live2D_Desktop_Widget.lnk"

def get_startup_path():
    return os.path.join(os.getenv('APPDATA'), 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup')

def get_shortcut_path():
    return os.path.join(get_startup_path(), SHORTCUT_NAME)

def is_startup_enabled():
    return os.path.exists(get_shortcut_path())

def set_startup(enable=True):
    shortcut_path = get_shortcut_path()
    
    if enable:
        try:
            # 1. 获取根目录 (boot.vbs 所在位置)
            # 当前脚本在 python_server/ 下，向上两级是根目录
            current_dir = os.path.dirname(os.path.abspath(__file__))
            root_dir = os.path.dirname(current_dir)
            
            target_script = os.path.join(root_dir, "boot.vbs")
            
            if not os.path.exists(target_script):
                print(f"[Startup] boot.vbs not found at {target_script}")
                return False

            # 2. 创建快捷方式
            shell = win32com.client.Dispatch("WScript.Shell")
            shortcut = shell.CreateShortcut(shortcut_path)
            
            # 目标指向 wscript.exe (VBS 解释器)
            shortcut.TargetPath = "wscript.exe"
            # 参数指向 boot.vbs
            shortcut.Arguments = f'"{target_script}"'
            # 起始位置
            shortcut.WorkingDirectory = root_dir
            # 图标 (可选，指向 python.exe)
            shortcut.IconLocation = os.path.join(root_dir, "runtime", "python.exe")
            
            shortcut.save()
            print(f"[Startup] Shortcut created: {shortcut_path}")
            return True
        except Exception as e:
            print(f"[Startup] Failed: {e}")
            return False
    else:
        try:
            if os.path.exists(shortcut_path):
                os.remove(shortcut_path)
                print("[Startup] Shortcut removed.")
            return True
        except Exception as e:
            print(f"[Startup] Remove failed: {e}")
            return False