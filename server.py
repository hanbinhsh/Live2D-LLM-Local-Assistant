import base64
import io
import win32gui
import win32con
import ctypes
from PIL import Image, ImageGrab
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
import os
import pyperclip

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 配置
OLLAMA_API = "http://127.0.0.1:11434/api/generate"
TARGET_SIZE = (1280, 720)


# === 请求体定义 ===
class AnalyzeRequest(BaseModel):
    target_type: str = "fullscreen" # 'fullscreen' 或 'window'
    target_hwid: int = 0            # 窗口句柄
    prompt: str = ""                # 自定义提示词
    mode: str = "roast"             # 'roast' (吐槽) 或 'chat' (聊天助手)
    model: str = ""                 # 前端指定使用的模型名称

# === 窗口工具函数 ===
def get_scaling_factor():
    # 处理 Windows 缩放 (DPI)
    try:
        ctypes.windll.shcore.SetProcessDpiAwareness(1)
        return 1
    except Exception:
        return 1

get_scaling_factor()

# 窗口位置大小获取
def get_window_list():
    """获取所有可见窗口的 句柄 和 标题"""
    windows = []
    def enum_callback(hwnd, _):
        if win32gui.IsWindowVisible(hwnd) and not win32gui.IsIconic(hwnd):
            title = win32gui.GetWindowText(hwnd).strip()
            # 过滤掉无标题窗口和常见系统干扰窗口
            blacklist = ["", "Program Manager", "Settings", "Microsoft Text Input Application"]
            if title and title not in blacklist:
                windows.append({"id": hwnd, "title": title})
    win32gui.EnumWindows(enum_callback, None)
    return windows


# 获取所有可见且未最小化的窗口标题
def get_all_visible_windows():
    titles = []
    
    def enum_window_callback(hwnd, _):
        # IsWindowVisible: 窗口可见
        # IsIconic: 窗口已最小化 (返回 True 表示最小化，我们需要 False)
        if win32gui.IsWindowVisible(hwnd) and not win32gui.IsIconic(hwnd):
            title = win32gui.GetWindowText(hwnd).strip()
            
            # 过滤掉空标题和一些系统后台窗口
            # 你可以在这里添加更多你想屏蔽的窗口名称
            blacklist = ["Program Manager", "Settings", "Microsoft Text Input Application", ""]
            
            if title and title not in blacklist:
                titles.append(title)

    win32gui.EnumWindows(enum_window_callback, None)
    return titles

def get_active_window_title():
    try:
        window = win32gui.GetForegroundWindow()
        title = win32gui.GetWindowText(window)
        return title if title else "未知窗口"
    except Exception:
        return "未知窗口"

def capture_screen_base64(target_type, target_hwid):
    """根据类型截图：全屏 或 特定窗口"""
    save_path = os.path.join(os.path.dirname(__file__), "debug_preview.jpg")

    try:
        if target_type == "window" and target_hwid > 0:
            # 获取窗口坐标
            rect = win32gui.GetWindowRect(target_hwid)
            x, y, w, h = rect[0], rect[1], rect[2], rect[3]
            # 处理无效宽高
            if w <= x or h <= y: 
                print("无效的窗口尺寸，回退到全屏截图")
                return ImageGrab.grab() # 回退到全屏
            # 截图指定区域
            screen = ImageGrab.grab(bbox=(x, y, w, h))
        else:
            # 全屏
            screen = ImageGrab.grab()
        
        try:
            screen.save(save_path, quality=80)
            print(f"调试截图已保存至: {save_path}")
        except Exception as e:
            print(f"截图保存失败: {e}")
        
        # 统一调整大小，保证处理速度
        screen = screen.resize(TARGET_SIZE, Image.Resampling.LANCZOS)
        buffered = io.BytesIO()
        screen.save(buffered, format="JPEG", quality=80)
        img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
        return img_str
    except Exception as e:
        print(f"截图失败: {e}")
        return ImageGrab.grab().resize((640, 360))

@app.get("/list_windows")
def list_windows():
    """返回当前打开的窗口列表"""
    return {"windows": get_window_list()}

@app.get("/list_models")
def list_models():
    """获取 Ollama 模型列表"""
    try:
        resp = requests.get(f"{OLLAMA_BASE_URL}/api/tags")
        data = resp.json()
        # 提取模型名称
        models = [m["name"] for m in data.get("models", [])]
        return {"models": models}
    except Exception as e:
        print(f"获取模型列表失败: {e}")
        return {"models": []}

@app.post("/see_and_roast")
def see_and_roast(req: AnalyzeRequest):
    # 1. 获取窗口信息
    active_window = get_active_window_title()
    all_windows = get_all_visible_windows()

    if req.target_type == "window" and req.target_hwid > 0:
        try:
            # 通过句柄获取指定窗口的标题
            selected_title = win32gui.GetWindowText(req.target_hwid).strip()
            if selected_title:
                print(f"【逻辑切换】用户指定了窗口，活动窗口从 '{active_window}' 覆写为 -> '{selected_title}'")
                active_window = selected_title
            else:
                print("【警告】指定的窗口句柄无法获取标题，保持默认。")
        except Exception as e:
            print(f"【错误】获取指定窗口标题失败: {e}")
    
    # 移除活动窗口本身，避免重复，并处理格式
    if active_window in all_windows:
        all_windows.remove(active_window)
    
    other_windows_str = "、".join(all_windows[:5]) # 只取前5个，防止 Prompt 太长
    if len(all_windows) > 5:
        other_windows_str += " 等"

    print(f"当前活动窗口: {active_window}")
    print(f"其他可见窗口: {other_windows_str}")
    print(f"模式: {req.mode}")

    # 2. 获取截图
    image_base64 = capture_screen_base64(req.target_type, req.target_hwid)

    # 3. 处理提示词 (Prompt Engineering)
    # 获取前端传来的模板
    raw_prompt = req.prompt
    
    # 3. 构造 Prompt
    prompt = (
        f"你是一个住在用户电脑桌面上的可爱看板娘。这是用户当前的屏幕截图。\n"
        f"用户当前正在操作的窗口是：/window_title。\n"
        f"背景里挂着的窗口还有：/window_list。\n\n"
        f"请根据屏幕内容和窗口判断用户正在做什么，并以**女朋友或贴心助手**的口吻直接对用户说话（使用第二人称‘你’）。\n"
        f"要求：\n"
        f"1. **不要**描述画面内容（千万不要说‘图片显示’、‘我看到’），而是直接开启话题。\n"
        f"2. 这是一个猜测互动的过程。你可以先猜猜用户在干嘛（例如：‘你是在做...吗？’）。\n"
        f"3. 如果看起来在玩游戏，可以对屏幕上的游戏内容做出评价。\n"
        f"4. 如果看起来在工作/学习，请温柔地提醒用户注意休息。\n"
        f"5. 字数控制在50字以内。"
    )
    chatPrompt = (
        f"你是一个智能聊天助手。当前窗口是 '/window_title'。\n"
        f"请阅读图片中的聊天记录或文本内容，结合上下文，为我草拟一个合适的、高情商的回复。\n"
        f"只输出回复内容，不要包含解释。"
    )

    if not raw_prompt:
        print("未接收到前端传入的提示词，使用默认 Prompt")
        if req.mode == "chat":
            raw_prompt = chatPrompt
        else:
            raw_prompt = prompt

    # === 替换占位符 ===
    final_prompt = raw_prompt.replace("/window_title", active_window).replace("/window_list", other_windows_str)

    print(f"使用的 Prompt: {final_prompt}")

    # 4. 发送给 Ollama
    payload = {
        "model": req.model,
        "prompt": final_prompt,
        "images": [image_base64],
        "stream": False
    }

    try:
        print(f"正在请求模型: {req.model} ...")
        response = requests.post(OLLAMA_API, json=payload)
        result = response.json()

        # print(f"获取到的内容: {result}")
        
        # 调试输出
        if "error" in result:
            print(f"Ollama Error: {result['error']}")
            return {"reply": f"模型报错了: {result['error']}"}

        roast_text = result.get("response", "我看不到...")

        if req.mode == "chat":
            try:
                pyperclip.copy(roast_text)
                print("回复已复制到剪贴板")
            except Exception as e:
                print(f"复制到剪贴板失败: {e}")

        print(f"模型回复: {roast_text}")
        
        return {"reply": roast_text, "success": True} 

    except Exception as e:
        print(f"Error: {e}")
        return {"reply": "系统出错了，我看不到屏幕..."}

if __name__ == "__main__":
    import uvicorn
    # 运行
    uvicorn.run(app, host="127.0.0.1", port=11542)