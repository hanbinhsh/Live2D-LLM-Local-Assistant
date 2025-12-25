import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
import socket
import json
import time
from PyQt5.QtCore import Qt, QUrl, QPoint, QThread, pyqtSignal, QEvent, QObject, QTimer, QCoreApplication
from PyQt5.QtGui import QCursor, QDesktopServices
from PyQt5.QtWidgets import QApplication, QMainWindow, QFrame, QVBoxLayout
from PyQt5.QtWebEngineWidgets import QWebEngineView, QWebEngineProfile, QWebEnginePage
import config_manager

# ================= 配置 =================
BASE_URL = "http://127.0.0.1:10452"
LIVE2D_PAGE = f"{BASE_URL}/live2d.html"
SETTINGS_PAGE = f"{BASE_URL}/settings.html"
CMD_PORT = 10453
REMOTE_DEBUG_PORT = "9222"
# =======================================

# --- 拦截器 Page，用于拦截报告跳转并调用系统浏览器 ---
class ReportInterceptorPage(QWebEnginePage):
    def acceptNavigationRequest(self, url, _type, isMainFrame):
        # 获取目标 URL 字符串
        url_str = url.toString()
        
        # 判断：如果是试图访问 storage/user_report 下的 html 文件
        if "/storage/user_report/html/" in url_str and url_str.endswith(".html"):
            print(f"[Window] Intercepting report open: {url_str}")
            # 调用系统默认浏览器打开
            QDesktopServices.openUrl(url)
            # 返回 False，阻止设置窗口自己跳转（保持在设置页）
            return False
            
        # 其他情况（如加载 settings.html）放行
        return True
# ------------------------------------------------------
class WebSettingsWindow(QMainWindow):
    def __init__(self, profile):
        super().__init__()
        self.setWindowTitle("看板娘配置 (Web)")
        self.resize(1000, 750)
        self.setAttribute(Qt.WA_DeleteOnClose, False)
        self.browser = QWebEngineView(self)
        # 使用自定义的 ReportInterceptorPage
        # 传入 profile 以保持 localStorage 共享
        page = ReportInterceptorPage(profile, self.browser)
        self.browser.setPage(page)
        self.setCentralWidget(self.browser)
        self.browser.load(QUrl(SETTINGS_PAGE))

    def closeEvent(self, event):
        self.hide()
        event.ignore() 

class CommandListener(QThread):
    cmd_received = pyqtSignal(str)
    def run(self):
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        try:
            sock.bind(('127.0.0.1', CMD_PORT))
            while True:
                data, _ = sock.recvfrom(4096)
                self.cmd_received.emit(data.decode('utf-8'))
        except Exception as e:
            print(f"[Window] Socket error: {e}")

class DragFilter(QObject):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.parent_window = parent 
        self.old_pos = None

    def eventFilter(self, source, event):
        if not self.parent_window.draggable:
            return False
        if event.type() == QEvent.MouseButtonPress:
            if event.button() == Qt.LeftButton:
                self.old_pos = event.globalPos()
                return True 
        elif event.type() == QEvent.MouseMove:
            if self.old_pos:
                delta = QPoint(event.globalPos() - self.old_pos)
                self.parent_window.move(self.parent_window.x() + delta.x(), self.parent_window.y() + delta.y())
                self.old_pos = event.globalPos()
                return True 
        elif event.type() == QEvent.MouseButtonRelease:
            if self.old_pos:
                self.old_pos = None
                config_manager.save_config({
                    "x": self.parent_window.x(), 
                    "y": self.parent_window.y()
                })
            return True 
        return False

class TransparentLive2DWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        
        arg_list = [
            "--autoplay-policy=no-user-gesture-required",
            "--disable-renderer-backgrounding",
            "--disable-background-timer-throttling",
            "--disable-backgrounding-occluded-windows",
            "--disable-features=CalculateNativeWinOcclusion"
        ]
        for arg in arg_list:
            sys.argv.append(arg)
        
        self.cfg = config_manager.load_config()
        self.is_top = self.cfg.get("top", True)
        self.draggable = self.cfg.get("draggable", False)
        # 【新增】点击穿透状态
        self.click_through = self.cfg.get("click_through", False)
        
        self.settings_win = None
        self.last_global_pos = None 
        self.last_move_time = time.time()
        self.is_mouse_active = False

        self.init_browser_profile() 
        self.init_ui()
        self.init_browser()
        
        self.listener = CommandListener()
        self.listener.cmd_received.connect(self.handle_command)
        self.listener.start()

        QTimer.singleShot(200, self.force_resize_correction)

        self.mouse_track_timer = QTimer(self)
        self.mouse_track_timer.timeout.connect(self.track_global_mouse)
        # 【修改】使用配置中的刷新率
        self.mouse_track_timer.start(self.cfg.get("track_refresh", 30)) 

    def force_resize_correction(self):
        self.apply_config_dynamically()

    def init_browser_profile(self):
        self.profile = QWebEngineProfile.defaultProfile()
        base_path = os.path.dirname(os.path.abspath(__file__))
        storage_path = os.path.abspath(os.path.join(base_path, "..", "storage", "browser_data"))
        if not os.path.exists(storage_path):
            try: os.makedirs(storage_path)
            except Exception as e: print(f"[Window] Storage Create Error: {e}")
        self.profile.setPersistentStoragePath(storage_path)
        self.profile.setCachePath(storage_path)

    def init_ui(self):
        self.update_window_flags()
        self.setAttribute(Qt.WA_TranslucentBackground)
        self.setWindowOpacity(self.cfg.get("opacity", 1.0))
        self.resize(self.cfg["width"], self.cfg["height"])
        if self.cfg["x"] != -1: self.move(self.cfg["x"], self.cfg["y"])
        else:
            screen = QApplication.primaryScreen().geometry()
            self.move(screen.width() - self.cfg["width"] - 50, screen.height() - self.cfg["height"] - 80)

        self.container = QFrame(self)
        self.container.setObjectName("main_container")
        self.container.setStyleSheet("#main_container { background: transparent; border: none; }")
        self.layout = QVBoxLayout(self.container)
        self.layout.setContentsMargins(0, 0, 0, 0)
        self.layout.setSpacing(0)
        self.setCentralWidget(self.container)

    def update_window_flags(self):
        flags = Qt.FramelessWindowHint | Qt.Tool
        if self.is_top: flags |= Qt.WindowStaysOnTopHint
        
        # 点击穿透标志
        # 注意：开启穿透后，窗口将不再接收鼠标事件（包括拖拽）
        if self.click_through:
            flags |= Qt.WindowTransparentForInput
            
        self.setWindowFlags(flags)
        self.show()

    def init_browser(self):
        self.browser = QWebEngineView(self.container)
        page = ReportInterceptorPage(self.profile, self.browser)
        self.browser.setPage(page)
        self.browser.page().setBackgroundColor(Qt.transparent)
        self.layout.addWidget(self.browser)
        self.browser.loadFinished.connect(self.on_load_finished)
        self.browser.load(QUrl(LIVE2D_PAGE))

    def on_load_finished(self):
        self.setup_drag_filter()
        self.inject_js_tracker()

    def setup_drag_filter(self):
        self.drag_filter = DragFilter(self)
        self.browser.installEventFilter(self.drag_filter)
        for child in self.browser.findChildren(QObject):
            try: child.installEventFilter(self.drag_filter)
            except: pass
        print("[Window] Drag Filter installed.")

    def inject_js_tracker(self):
        js_code = """
        window.updateGlobalMouse = function(x, y) {
            var evt = new MouseEvent("mousemove", {
                bubbles: true, cancelable: true, view: window,
                clientX: x, clientY: y
            });
            document.dispatchEvent(evt);
        };
        window.triggerGlobalMouseOut = function() {
            var evt = new MouseEvent("mouseout", {
                bubbles: true, cancelable: true, view: window
            });
            document.dispatchEvent(evt);
        };
        """
        self.browser.page().runJavaScript(js_code)
        print("[Window] Mouse tracker JS injected.")

    def track_global_mouse(self):
        global_pos = QCursor.pos()
        moved = False
        
        # 【修改】使用配置中的阈值
        threshold = self.cfg.get("track_threshold", 10)
        
        if self.last_global_pos:
            diff = abs(global_pos.x() - self.last_global_pos.x()) + abs(global_pos.y() - self.last_global_pos.y())
            if diff >= threshold:
                moved = True
        else:
            moved = True

        if moved:
            self.last_global_pos = global_pos
            self.last_move_time = time.time()
            self.is_mouse_active = True
            
            local_pos = self.mapFromGlobal(global_pos)
            self.browser.page().runJavaScript(f"if(window.updateGlobalMouse) window.updateGlobalMouse({local_pos.x()}, {local_pos.y()});")
            
        else:
            # 【修改】使用配置中的闲置时间
            idle_timeout = self.cfg.get("idle_timeout", 2.0)
            
            if self.is_mouse_active and (time.time() - self.last_move_time > idle_timeout):
                # print("[Window] Idle triggered mouseout")
                self.browser.page().runJavaScript("if(window.triggerGlobalMouseOut) window.triggerGlobalMouseOut();")
                self.is_mouse_active = False

    def handle_command(self, cmd_str):
        try:
            parts = cmd_str.split(":")
            action = parts[0]
            if action == "update_cfg":
                self.cfg = config_manager.load_config()
                self.apply_config_dynamically()
            elif action == "reload":
                self.browser.reload()
            elif action == "open_web_settings":
                self.open_settings_window()
            elif action == "border":
                mode = parts[1]
                if mode == "on": self.container.setStyleSheet("#main_container { border: 4px dashed #ff4d4f; background: transparent; }")
                else: self.container.setStyleSheet("#main_container { border: none; background: transparent; }")
            elif action == "drag":
                mode = parts[1]
                self.draggable = (mode == "on")
                self.cfg["draggable"] = self.draggable
            elif action == "click_through":
                mode = parts[1]
                self.click_through = (mode == "on")
                self.cfg["click_through"] = self.click_through
                self.update_window_flags()
                
        except Exception as e:
            print(f"Cmd Error: {e}")

    def open_settings_window(self):
        if self.settings_win is None:
            self.settings_win = WebSettingsWindow(self.profile)
        self.settings_win.show()
        self.settings_win.raise_()
        self.settings_win.activateWindow()

    def update_opacity(self):
        # 为什么要这么写？
        # 因为直接调用 setWindowOpacity 不会立即生效，需要通过切换窗口标志强制刷新
        # 而且直接setWindowFlags为原先的flag，由于缓存机制，不会触发刷新
        # 所以我们通过一个中间状态来强制刷新
        target_flags = Qt.FramelessWindowHint | Qt.Tool
        if self.is_top: target_flags |= Qt.WindowStaysOnTopHint
        if self.click_through: target_flags |= Qt.WindowTransparentForInput
        self.setWindowOpacity(float(self.cfg.get("opacity", 1.0)))
        temp_flags = target_flags ^ Qt.WindowStaysOnTopHint 
        self.setWindowFlags(temp_flags)
        self.show()
        self.setWindowFlags(target_flags)
        self.show()


    def apply_config_dynamically(self):
        self.resize(self.cfg["width"], self.cfg["height"])
        if self.cfg["x"] == -1 or self.cfg["y"] == -1:
            screen = QApplication.primaryScreen().geometry()
            target_x = screen.width() - self.cfg["width"] - 50
            target_y = screen.height() - self.cfg["height"] - 80
            self.move(target_x, target_y)
        else:
            self.move(self.cfg["x"], self.cfg["y"])
        
        self.draggable = self.cfg["draggable"]

        self.update_opacity()
        
        # 更新穿透状态
        if self.click_through != self.cfg.get("click_through", False):
            self.click_through = self.cfg.get("click_through", False)
            self.update_window_flags() # 这里会触发 setWindowFlags
            
        # 更新置顶 (注意：update_window_flags 里已经包含了置顶逻辑)
        if self.is_top != self.cfg["top"]:
            self.is_top = self.cfg["top"]
            self.update_window_flags()
            
        # 如果刷新率变了，重启定时器
        new_refresh = self.cfg.get("track_refresh", 30)
        if self.mouse_track_timer.interval() != new_refresh:
            self.mouse_track_timer.start(new_refresh)

    def mousePressEvent(self, event):
        if not self.draggable: return 
        if event.button() == Qt.LeftButton: self.old_pos = event.globalPos()
    def mouseMoveEvent(self, event):
        if not self.draggable: return
        if self.old_pos:
            delta = QPoint(event.globalPos() - self.old_pos)
            self.move(self.x() + delta.x(), self.y() + delta.y())
            self.old_pos = event.globalPos()
    def mouseReleaseEvent(self, event):
        if not self.draggable: return
        if event.button() == Qt.LeftButton:
            self.old_pos = None
            config_manager.save_config({"x": self.x(), "y": self.y()})

if __name__ == "__main__":
    cfg = config_manager.load_config()
    use_d3d9 = cfg.get("use_d3d9", False)

    if use_d3d9:
        print("[Boot] Compatibility Mode: ON (ANGLE + D3D9)")
        os.environ["QT_OPENGL"] = "angle"
        os.environ["QT_ANGLE_PLATFORM"] = "d3d9"
    else:
        print("[Boot] Compatibility Mode: OFF (Default)")
        if "QT_OPENGL" in os.environ: del os.environ["QT_OPENGL"]
        if "QT_ANGLE_PLATFORM" in os.environ: del os.environ["QT_ANGLE_PLATFORM"]

    if REMOTE_DEBUG_PORT:
        os.environ["QTWEBENGINE_REMOTE_DEBUGGING"] = REMOTE_DEBUG_PORT
    QApplication.setAttribute(Qt.AA_EnableHighDpiScaling)
    
    app = QApplication(sys.argv)
    app.setQuitOnLastWindowClosed(False)
    
    window = TransparentLive2DWindow()
    window.show()
    sys.exit(app.exec_())