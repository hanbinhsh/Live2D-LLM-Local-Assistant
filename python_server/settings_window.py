import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
import socket
from PyQt5.QtWidgets import (QApplication, QWidget, QVBoxLayout, QHBoxLayout, 
                             QLabel, QSpinBox, QCheckBox, QGroupBox, QPushButton, QMessageBox, QDoubleSpinBox)
from PyQt5.QtCore import Qt
import config_manager
import startup_manager

CMD_PORT = 10453

class SettingsWindow(QWidget):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("桌面挂件设置")
        self.resize(380, 450)
        
        self.cfg = config_manager.load_config()
        self.init_ui()

        self.send_udp_cmd("border:on")

    def closeEvent(self, event):
        self.send_udp_cmd("border:off")
        event.accept()

    def init_ui(self):
        layout = QVBoxLayout()

        # --- 1. 交互优化 ---
        group_opt = QGroupBox("跟踪与性能优化")
        layout_opt = QVBoxLayout()
        
        # 闲置时间
        layout_opt.addLayout(self.create_double_spin_row("闲置判定时间 (秒):", "idle_timeout", 0.5, 60.0, 0.5))
        layout_opt.addWidget(QLabel("<small style='color:gray'>* 实际睡觉等待时间 = 此数值 + 50秒(JS内置)</small>"))
        
        # 刷新率
        layout_opt.addLayout(self.create_spin_row("追踪刷新率 (ms):", "track_refresh", 10, 500))
        
        # 抖动阈值
        layout_opt.addLayout(self.create_spin_row("防抖阈值 (px):", "track_threshold", 0, 100))
        
        group_opt.setLayout(layout_opt)
        layout.addWidget(group_opt)

        # --- 1. 系统设置 ---
        group_sys = QGroupBox("系统与兼容性")
        layout_sys = QVBoxLayout()

        # 开机自启
        self.chk_startup = QCheckBox("开机自动启动")
        # 优先读取快捷方式是否存在，以保证状态真实
        self.chk_startup.setChecked(startup_manager.is_startup_enabled())
        self.chk_startup.toggled.connect(self.on_startup_change)
        layout_sys.addWidget(self.chk_startup)

        # 兼容模式 (D3D9)
        self.chk_d3d9 = QCheckBox("兼容模式 (解决闪烁/闪退)")
        self.chk_d3d9.setToolTip("开启后使用 D3D9 渲染。如果遇到闪烁或闪退请勾选此项。\n修改后需要重启程序生效。")
        self.chk_d3d9.setChecked(self.cfg.get("use_d3d9", False))
        self.chk_d3d9.toggled.connect(self.on_d3d9_change)
        layout_sys.addWidget(self.chk_d3d9)

        group_sys.setLayout(layout_sys)
        layout.addWidget(group_sys)

        # --- 2. 尺寸位置 ---
        group_geo = QGroupBox("位置与大小")
        layout_geo = QVBoxLayout()

        layout_geo.addLayout(self.create_spin_row("宽度:", "width", 100, 2000))
        layout_geo.addLayout(self.create_spin_row("高度:", "height", 100, 2000))
        layout_geo.addLayout(self.create_spin_row("X 坐标:", "x", -5000, 5000))
        layout_geo.addLayout(self.create_spin_row("Y 坐标:", "y", -5000, 5000))
        layout_geo.addLayout(self.create_double_spin_row("整体透明度 (0.1-1.0):", "opacity", 0.01, 1.0, 0.1))

        group_geo.setLayout(layout_geo)
        layout.addWidget(group_geo)

        # --- 3. 按钮区 ---
        btn_refresh = QPushButton("读取当前挂件位置")
        btn_refresh.clicked.connect(self.reload_from_config)
        layout.addWidget(btn_refresh)

        btn_reset = QPushButton("重置位置与大小")
        btn_reset.setStyleSheet("color: white; background-color: #ff4d4f; font-weight: bold;")
        btn_reset.clicked.connect(self.reset_to_default)
        layout.addWidget(btn_reset)

        self.setLayout(layout)

    def create_spin_row(self, label_text, key, min_val, max_val):
        h_layout = QHBoxLayout()
        label = QLabel(label_text)
        spin = QSpinBox()
        spin.setRange(min_val, max_val)
        spin.setValue(int(self.cfg.get(key, 0))) # 默认int防止报错
        spin.setSingleStep(10 if key in ["width", "height", "x", "y"] else 1)
        spin.valueChanged.connect(lambda val: self.on_spin_change(key, val))
        setattr(self, f"spin_{key}", spin)
        h_layout.addWidget(label)
        h_layout.addWidget(spin)
        return h_layout

    # 【新增】支持小数的输入框
    def create_double_spin_row(self, label_text, key, min_val, max_val, step):
        h_layout = QHBoxLayout()
        label = QLabel(label_text)
        spin = QDoubleSpinBox()
        spin.setRange(min_val, max_val)
        spin.setValue(float(self.cfg.get(key, 2.0)))
        spin.setSingleStep(step)
        spin.valueChanged.connect(lambda val: self.on_spin_change(key, val))
        setattr(self, f"dspin_{key}", spin)
        h_layout.addWidget(label)
        h_layout.addWidget(spin)
        return h_layout

    def on_change(self):
        self.update_config_and_notify()

    def on_spin_change(self, key, val):
        self.cfg[key] = val
        self.update_config_and_notify()

    def update_config_and_notify(self):
        """保存配置并通知挂件"""
        new_cfg = self.cfg.copy()
        new_cfg.update({
            "opacity": self.dspin_opacity.value(),
            "width": self.spin_width.value(),
            "height": self.spin_height.value(),
            "x": self.spin_x.value(),
            "y": self.spin_y.value(),
            "track_refresh": self.spin_track_refresh.value(),
            "track_threshold": self.spin_track_threshold.value(),
            "idle_timeout": self.dspin_idle_timeout.value()
        })
        
        config_manager.save_config(new_cfg)
        self.send_udp_cmd("update_cfg")

    def reload_from_config(self):
        self.cfg = config_manager.load_config()
        self.blockSignals(True)
        self.spin_x.setValue(self.cfg["x"])
        self.spin_y.setValue(self.cfg["y"])
        self.spin_width.setValue(self.cfg["width"])
        self.spin_height.setValue(self.cfg["height"])
        self.dspin_opacity.setValue(self.cfg.get("opacity", 1.0))
        self.spin_track_refresh.setValue(self.cfg.get("track_refresh", 30))
        self.spin_track_threshold.setValue(self.cfg.get("track_threshold", 10))
        self.dspin_idle_timeout.setValue(self.cfg.get("idle_timeout", 2.0))
        self.blockSignals(False)

    def on_startup_change(self, checked):
        success = startup_manager.set_startup(checked)
        if success:
            config_manager.save_config({"auto_start": checked})
        else:
            self.blockSignals(True)
            self.chk_startup.setChecked(not checked)
            self.blockSignals(False)
            QMessageBox.warning(self, "错误", "设置开机自启失败，请检查安全软件拦截。")

    def on_d3d9_change(self, checked):
        config_manager.save_config({"use_d3d9": checked})
        QMessageBox.information(self, "提示", "兼容模式设置已保存。\n请完全退出并重启程序以生效。")

    def reset_to_default(self):
        reply = QMessageBox.question(self, '重置确认', 
                                     "确定要重置吗？这将恢复默认位置和性能设置。",
                                     QMessageBox.Yes | QMessageBox.No, QMessageBox.No)
        if reply == QMessageBox.Yes:
            defaults = {
                "x": -1, "y": -1, "width": 380, "height": 400,
                "track_refresh": 30, "track_threshold": 10, "idle_timeout": 2.0, "opacity": 1.0
            }
            config_manager.save_config(defaults)
            self.reload_from_config()
            self.send_udp_cmd("update_cfg")

    def send_udp_cmd(self, cmd):
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            sock.sendto(cmd.encode('utf-8'), ('127.0.0.1', CMD_PORT))
            sock.close()
        except Exception as e:
            print(f"UDP Error: {e}")

if __name__ == "__main__":
    app = QApplication(sys.argv)
    win = SettingsWindow()
    win.show()
    sys.exit(app.exec_())