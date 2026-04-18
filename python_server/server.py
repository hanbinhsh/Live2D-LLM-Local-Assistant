import base64
import io
import re
import sys
import win32gui
import win32con
import ctypes
from PIL import Image, ImageGrab
from fastapi import FastAPI, HTTPException, Response
from fastapi.responses import StreamingResponse, FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import requests
import os
import pyperclip
import uuid
import datetime
from fastapi.staticfiles import StaticFiles
from activity_tracker import tracker
import json
import time
from pathlib import Path

app = FastAPI()

@app.on_event("startup")
def startup_event():
    tracker.start_recording()

@app.on_event("shutdown")
def shutdown_event():
    tracker.stop_recording()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 配置

OLLAMA_BASE_URL = "http://127.0.0.1:11434"
OLLAMA_API = OLLAMA_BASE_URL + "/api/generate"
TARGET_SIZE = (1280, 720)

# 【修改点】由于 server.py 在 python_server 目录下，我们需要向上走两层（或指定绝对路径）
# 来确保 storage 文件夹在项目根目录下
# os.path.dirname(__file__) 是 python_server/
# os.path.dirname(...) 是 root/
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.append(PROJECT_ROOT)

from plugin.tts import get_tts_engine

UPLOAD_DIR = os.path.join(PROJECT_ROOT, "storage", "image_upload")
STORAGE_ROOT = os.path.join(PROJECT_ROOT, "storage")
CUSTOM_MODEL_DEFAULT_FOLDER = r"F:\files\重音テト\VTS Model File\重音テト"
CUSTOM_MODEL_ROUTE_PREFIX = "http://127.0.0.1:11542/live2d/custom_model"
CUSTOM_MODEL_REGISTRY = {}

if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

# 【修改点】挂载静态文件目录，使用绝对路径确保指向正确
app.mount("/storage", StaticFiles(directory=STORAGE_ROOT), name="storage")

class ImageUploadRequest(BaseModel):
    base64_data: str  # 包含 header 的 base64 字符串

# === 请求体定义 ===
class AnalyzeRequest(BaseModel):
    target_type: str = "fullscreen" # 'fullscreen' 或 'window'
    target_hwid: int = 0            # 窗口句柄
    prompt: str = ""                # 自定义提示词
    mode: str = "roast"             # 'roast' (吐槽) 或 'chat' (聊天助手)
    model: str = ""                 # 前端指定使用的模型名称


class TTSSpeakRequest(BaseModel):
    text: str = ""
    provider: str = "gpt_sovits"
    settings: dict = Field(default_factory=dict)


class CustomModelRegisterRequest(BaseModel):
    folder_path: str = CUSTOM_MODEL_DEFAULT_FOLDER


def _to_posix_path(path_like):
    return str(path_like).replace("\\", "/")


def _ensure_json_dict(value, label):
    if not isinstance(value, dict):
        raise HTTPException(status_code=400, detail=f"{label} 不是有效的 JSON 对象")
    return value


def _load_json_file(path_obj, label):
    try:
        with open(path_obj, "r", encoding="utf-8") as f:
            return _ensure_json_dict(json.load(f), label)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"{label} 不存在: {path_obj}")
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail=f"{label} JSON 解析失败: {e}")


def _resolve_child_path(root_path, relative_path):
    root_real = os.path.realpath(str(root_path))
    candidate = os.path.realpath(os.path.join(root_real, relative_path))
    try:
        if os.path.commonpath([root_real, candidate]) != root_real:
            raise HTTPException(status_code=403, detail="非法路径访问")
    except ValueError:
        raise HTTPException(status_code=403, detail="非法路径访问")
    return candidate


def _strip_known_suffix(file_name, suffix):
    lower_name = file_name.lower()
    lower_suffix = suffix.lower()
    if lower_name.endswith(lower_suffix):
        return file_name[: -len(suffix)]
    return os.path.splitext(file_name)[0]


def _normalize_motion_group(file_name):
    base_name = _strip_known_suffix(file_name, ".motion3.json")
    lowered = base_name.lower()
    if "idle" in lowered:
        return "Idle"
    if "sleep" in lowered:
        return "Sleep"
    if "tap" in lowered:
        return "Tap"
    if "touch" in lowered:
        return "Touch"
    if "flick" in lowered:
        return "Flick"
    return base_name


def _scan_cubism4_assets(root_path, manifest_data):
    file_refs = manifest_data.setdefault("FileReferences", {})

    expressions = []
    raw_expressions = file_refs.get("Expressions") or []
    if isinstance(raw_expressions, list) and raw_expressions:
        for item in raw_expressions:
            if isinstance(item, dict) and item.get("File"):
                name = item.get("Name") or _strip_known_suffix(os.path.basename(item["File"]), ".exp3.json")
                expressions.append({"name": name, "file": _to_posix_path(item["File"])})
    else:
        expression_dir = root_path / "Expressions"
        if expression_dir.exists():
            for exp_file in sorted(expression_dir.glob("*.exp3.json")):
                expressions.append({
                    "name": _strip_known_suffix(exp_file.name, ".exp3.json"),
                    "file": _to_posix_path(exp_file.relative_to(root_path)),
                })
        if expressions:
            file_refs["Expressions"] = [{"Name": item["name"], "File": item["file"]} for item in expressions]

    motions = {}
    raw_motions = file_refs.get("Motions") or {}
    if isinstance(raw_motions, dict) and raw_motions:
        for group_name, group_items in raw_motions.items():
            if not isinstance(group_items, list):
                continue
            normalized_items = []
            for item in group_items:
                if isinstance(item, dict) and item.get("File"):
                    normalized_items.append({"file": _to_posix_path(item["File"])})
            if normalized_items:
                motions[group_name] = normalized_items
    else:
        motion_dir = root_path / "Motions"
        motion_files = []
        if motion_dir.exists():
            motion_files.extend(sorted(motion_dir.glob("*.motion3.json")))
        motion_files.extend(sorted(root_path.glob("*.motion3.json")))
        seen_files = set()
        for motion_file in motion_files:
            motion_real = os.path.realpath(str(motion_file))
            if motion_real in seen_files:
                continue
            seen_files.add(motion_real)
            group_name = _normalize_motion_group(motion_file.name)
            motions.setdefault(group_name, []).append({
                "file": _to_posix_path(motion_file.relative_to(root_path))
            })
        if motions:
            file_refs["Motions"] = {
                group_name: [{"File": item["file"]} for item in items]
                for group_name, items in motions.items()
            }

    hit_areas = manifest_data.get("HitAreas") or []
    if not isinstance(hit_areas, list):
        hit_areas = []

    return {
        "motions": motions,
        "expressions": expressions,
        "hit_areas": hit_areas,
    }


def _scan_cubism2_assets(root_path, manifest_data):
    motions = {}
    raw_motions = manifest_data.get("motions") or {}
    if isinstance(raw_motions, dict):
        for group_name, group_items in raw_motions.items():
            if not isinstance(group_items, list):
                continue
            normalized_items = []
            for item in group_items:
                if isinstance(item, dict) and item.get("file"):
                    normalized_items.append({"file": _to_posix_path(item["file"])})
            if normalized_items:
                motions[group_name] = normalized_items

    expressions = []
    raw_expressions = manifest_data.get("expressions") or []
    if isinstance(raw_expressions, list):
        for item in raw_expressions:
            if isinstance(item, dict) and item.get("file"):
                name = item.get("name") or _strip_known_suffix(os.path.basename(item["file"]), ".json")
                expressions.append({"name": name, "file": _to_posix_path(item["file"])})

    hit_areas = manifest_data.get("hit_areas") or []
    if not isinstance(hit_areas, list):
        hit_areas = []

    return {
        "motions": motions,
        "expressions": expressions,
        "hit_areas": hit_areas,
    }


def _build_cubism2_manifest_from_moc(root_path, moc_file):
    textures = []
    for texture_dir_name in ["textures", "textures.1024", "textures.2048", "textures.4096"]:
        texture_dir = root_path / texture_dir_name
        if texture_dir.exists():
            textures.extend(sorted(texture_dir.glob("*.png")))
    if not textures:
        textures.extend(sorted(root_path.glob("*.png")))
    if not textures:
        raise HTTPException(status_code=400, detail="未找到 Cubism2 贴图资源")

    motions = {}
    motion_dir = root_path / "motions"
    if motion_dir.exists():
        for motion_file in sorted(motion_dir.glob("*.mtn")):
            group_name = "idle" if "idle" in motion_file.stem.lower() else "default"
            motions.setdefault(group_name, []).append({
                "file": _to_posix_path(motion_file.relative_to(root_path))
            })

    expressions = []
    expression_dir = root_path / "expressions"
    if expression_dir.exists():
        for exp_file in sorted(expression_dir.glob("*.json")):
            expressions.append({
                "name": os.path.splitext(exp_file.name)[0],
                "file": _to_posix_path(exp_file.relative_to(root_path))
            })

    manifest = {
        "type": "Live2D Model Setting",
        "name": root_path.name,
        "model": _to_posix_path(moc_file.relative_to(root_path)),
        "textures": [_to_posix_path(texture.relative_to(root_path)) for texture in textures],
    }
    if motions:
        manifest["motions"] = {
            group_name: [{"file": item["file"]} for item in items]
            for group_name, items in motions.items()
        }
    if expressions:
        manifest["expressions"] = [
            {"name": item["name"], "file": item["file"]}
            for item in expressions
        ]
    physics_file = root_path / "physics.json"
    pose_file = root_path / "pose.json"
    if physics_file.exists():
        manifest["physics"] = _to_posix_path(physics_file.relative_to(root_path))
    if pose_file.exists():
        manifest["pose"] = _to_posix_path(pose_file.relative_to(root_path))
    return manifest


def _scan_custom_model_folder(folder_path):
    root_path = Path(folder_path)
    model3_files = sorted(root_path.glob("*.model3.json"))
    if model3_files:
        manifest_path = model3_files[0]
        manifest_data = _load_json_file(manifest_path, "Cubism4 模型配置")
        assets = _scan_cubism4_assets(root_path, manifest_data)
        return {
            "type": "cubism4",
            "manifest_data": manifest_data,
            "display_name": root_path.name,
            "descriptor": {
                "motions": {
                    group_name: [item["file"] for item in items]
                    for group_name, items in assets["motions"].items()
                },
                "expressions": [item["name"] for item in assets["expressions"]],
                "hit_areas": assets["hit_areas"],
                "display_name": root_path.name,
            }
        }

    legacy_manifest_path = root_path / "index.json"
    if legacy_manifest_path.exists():
        manifest_data = _load_json_file(legacy_manifest_path, "Cubism2 模型配置")
    else:
        moc_files = sorted(root_path.glob("*.moc"))
        if not moc_files:
            raise HTTPException(status_code=400, detail="目录中未找到 *.model3.json、index.json 或 .moc 文件")
        manifest_data = _build_cubism2_manifest_from_moc(root_path, moc_files[0])

    assets = _scan_cubism2_assets(root_path, manifest_data)
    return {
        "type": "cubism2",
        "manifest_data": manifest_data,
        "display_name": root_path.name,
        "descriptor": {
            "motions": {
                group_name: [item["file"] for item in items]
                for group_name, items in assets["motions"].items()
            },
            "expressions": [item["name"] for item in assets["expressions"]],
            "hit_areas": assets["hit_areas"],
            "display_name": root_path.name,
        }
    }


def _absolute_resource_url(token, relative_path):
    return f"{CUSTOM_MODEL_ROUTE_PREFIX}/{token}/{_to_posix_path(relative_path)}"


def _rewrite_cubism4_manifest_urls(manifest_data, token):
    rewritten = json.loads(json.dumps(manifest_data))
    file_refs = rewritten.setdefault("FileReferences", {})

    if file_refs.get("Moc"):
        file_refs["Moc"] = _absolute_resource_url(token, file_refs["Moc"])
    if isinstance(file_refs.get("Textures"), list):
        file_refs["Textures"] = [_absolute_resource_url(token, item) for item in file_refs["Textures"]]
    for key in ["Physics", "Pose", "DisplayInfo", "UserData"]:
        if file_refs.get(key):
            file_refs[key] = _absolute_resource_url(token, file_refs[key])

    if isinstance(file_refs.get("Expressions"), list):
        for item in file_refs["Expressions"]:
            if isinstance(item, dict) and item.get("File"):
                item["File"] = _absolute_resource_url(token, item["File"])

    if isinstance(file_refs.get("Motions"), dict):
        for group_items in file_refs["Motions"].values():
            if not isinstance(group_items, list):
                continue
            for item in group_items:
                if isinstance(item, dict) and item.get("File"):
                    item["File"] = _absolute_resource_url(token, item["File"])
                if isinstance(item, dict) and item.get("Sound"):
                    item["Sound"] = _absolute_resource_url(token, item["Sound"])

    return rewritten


def _rewrite_cubism2_manifest_urls(manifest_data, token):
    rewritten = json.loads(json.dumps(manifest_data))
    if rewritten.get("model"):
        rewritten["model"] = _absolute_resource_url(token, rewritten["model"])
    if isinstance(rewritten.get("textures"), list):
        rewritten["textures"] = [_absolute_resource_url(token, item) for item in rewritten["textures"]]
    for key in ["physics", "pose"]:
        if rewritten.get(key):
            rewritten[key] = _absolute_resource_url(token, rewritten[key])
    if isinstance(rewritten.get("expressions"), list):
        for item in rewritten["expressions"]:
            if isinstance(item, dict) and item.get("file"):
                item["file"] = _absolute_resource_url(token, item["file"])
    if isinstance(rewritten.get("motions"), dict):
        for group_items in rewritten["motions"].values():
            if not isinstance(group_items, list):
                continue
            for item in group_items:
                if isinstance(item, dict) and item.get("file"):
                    item["file"] = _absolute_resource_url(token, item["file"])
                if isinstance(item, dict) and item.get("sound"):
                    item["sound"] = _absolute_resource_url(token, item["sound"])
    return rewritten

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
    save_path = os.path.join(os.path.dirname(__file__), "../storage/debug_preview.jpg")

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


@app.post("/live2d/custom_model/register")
def register_custom_live2d_model(req: CustomModelRegisterRequest):
    folder_path = (req.folder_path or "").strip() or CUSTOM_MODEL_DEFAULT_FOLDER
    if not os.path.isdir(folder_path):
        raise HTTPException(status_code=404, detail=f"模型目录不存在: {folder_path}")

    scan_result = _scan_custom_model_folder(folder_path)
    token = uuid.uuid4().hex
    manifest_data = scan_result["manifest_data"]
    model_type = scan_result["type"]

    if model_type == "cubism4":
        manifest_data = _rewrite_cubism4_manifest_urls(manifest_data, token)
    else:
        manifest_data = _rewrite_cubism2_manifest_urls(manifest_data, token)

    CUSTOM_MODEL_REGISTRY[token] = {
        "root_path": os.path.realpath(folder_path),
        "type": model_type,
        "manifest_data": manifest_data,
        "descriptor": scan_result["descriptor"],
        "display_name": scan_result["display_name"],
    }

    return {
        "type": model_type,
        "token": token,
        "manifest_url": f"{CUSTOM_MODEL_ROUTE_PREFIX}/{token}/__manifest__.json",
        "descriptor": scan_result["descriptor"],
    }


@app.get("/live2d/custom_model/{token}/{resource_path:path}")
def get_custom_live2d_resource(token: str, resource_path: str):
    registry_item = CUSTOM_MODEL_REGISTRY.get(token)
    if not registry_item:
        raise HTTPException(status_code=404, detail="自定义模型会话不存在或已失效")

    if resource_path == "__manifest__.json":
        return JSONResponse(content=registry_item["manifest_data"])

    root_path = registry_item["root_path"]
    target_path = _resolve_child_path(root_path, resource_path)
    if not os.path.isfile(target_path):
        raise HTTPException(status_code=404, detail=f"资源不存在: {resource_path}")
    return FileResponse(target_path)


@app.post("/tts/speak")
def tts_speak(req: TTSSpeakRequest):
    text = (req.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="TTS 文本不能为空")

    provider = (req.provider or "").strip().lower()
    if not provider:
        raise HTTPException(status_code=400, detail="未配置 TTS 服务")

    try:
        engine = get_tts_engine(provider)
        audio_bytes, media_type = engine.synthesize(text, req.settings or {})
        return Response(
            content=audio_bytes,
            media_type=media_type or "audio/wav",
            headers={"Cache-Control": "no-store"},
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        print(f"[TTS] Error: {e}")
        raise HTTPException(status_code=500, detail=f"TTS 合成失败: {e}")


@app.post("/tts/stream")
def tts_stream(req: TTSSpeakRequest):
    text = (req.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="TTS 文本不能为空")

    provider = (req.provider or "").strip().lower()
    if not provider:
        raise HTTPException(status_code=400, detail="未配置 TTS 服务")

    try:
        engine = get_tts_engine(provider)
        audio_stream, media_type = engine.synthesize_stream(text, req.settings or {})
        return StreamingResponse(
            audio_stream,
            media_type=media_type or "application/octet-stream",
            headers={"Cache-Control": "no-store"},
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        print(f"[TTS Stream] Error: {e}")
        raise HTTPException(status_code=500, detail=f"TTS 流式合成失败: {e}")

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
        f"请直接给出你此刻会发送的那一句话，你的回复应像真人在即时聊天中自然打出的内容，不要包含解释。"
    )

    if not raw_prompt:
        print("未接收到前端传入的提示词，使用默认 Prompt")
        if req.mode == "chat":
            raw_prompt = chatPrompt
        else:
            raw_prompt = prompt

    # === 替换占位符 ===
    final_prompt = raw_prompt.replace("/window_title", active_window).replace("/window_list", other_windows_str)

    # print(f"使用的 Prompt: {final_prompt}")

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
        return {"reply": "系统出错了，我看不到屏幕...", "success": False}
    
@app.post("/upload_image")
async def upload_image(req: ImageUploadRequest):
    try:
        # 1. 处理 Base64 数据
        if "," in req.base64_data:
            header, encoded = req.base64_data.split(",", 1)
        else:
            encoded = req.base64_data
        
        # 自动识别后缀
        ext = "jpg"
        if "image/png" in req.base64_data: ext = "png"
        elif "image/gif" in req.base64_data: ext = "gif"
        elif "image/webp" in req.base64_data: ext = "webp"

        # 2. 生成唯一文件名 (时间戳+随机码)
        filename = f"{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:6]}.{ext}"
        file_path = os.path.join(UPLOAD_DIR, filename)

        # 3. 解码并保存
        with open(file_path, "wb") as f:
            f.write(base64.b64decode(encoded))

        # 4. 返回可访问的 URL (指向 Python 服务器端口)
        # 注意：这里返回的是绝对路径 URL，方便前端直接展示
        image_url = f"http://127.0.0.1:10452/storage/image_upload/{filename}"
        
        return {"success": True, "url": image_url}
    except Exception as e:
        print(f"上传失败: {e}")
        raise HTTPException(status_code=500, detail="图片保存失败")

# === 聊天记录导出功能 ===
@app.post("/history/export")
async def export_history_to_file(req: dict):
    try:
        history_data = req.get("data")
        # 保存到 storage/export 目录，或者桌面
        export_dir = os.path.join(PROJECT_ROOT, "storage", "exports")
        if not os.path.exists(export_dir):
            os.makedirs(export_dir)
            
        filename = f"chat_history_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        filepath = os.path.join(export_dir, filename)
        
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(history_data, f, indent=2, ensure_ascii=False)
            
        # 尝试打开文件夹 (Windows)
        os.startfile(export_dir)
        
        return {"success": True, "path": filepath}
    except Exception as e:
        return {"success": False, "error": str(e)}
#=========================================================
# 报告生成
#=========================================================
# 2. 数据查看
@app.get("/report/data")
def get_report_data(page: int = 1, size: int = 20, search: str = ""):
    return tracker.get_data_grid(page, size, search)

@app.post("/report/clear")
def clear_report_data():
    tracker.clear_data()
    return {"success": True}

# 3. 获取 HTML 列表
@app.get("/report/list")
def list_reports():
    html_dir = tracker.HTML_DIR # 访问 tracker 里定义的路径
    files = []
    if os.path.exists(html_dir):
        files = [f for f in os.listdir(html_dir) if f.endswith(".html")]
        files.sort(reverse=True) # 最新在前
    return {"files": files}

def fetch_steam_profile(api_key, steam_id):
    """对应 /steam_profile"""
    if not api_key or not steam_id: return "未配置 Steam API Key 或 ID"
    try:
        url = f"http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key={api_key}&steamids={steam_id}"
        res = requests.get(url, timeout=10).json()
        players = res.get("response", {}).get("players", [])
        if not players: return "未找到该 Steam ID 的玩家信息。"
        
        p = players[0]
        # 状态码映射
        states = {0: "离线", 1: "在线", 2: "忙碌", 3: "离开", 4: "打盹", 5: "交易中", 6: "想玩游戏"}
        state_str = states.get(p.get("personastate", 0), "未知")
        
        # 格式化输出
        info = [
            f"昵称: {p.get('personaname')}",
            f"SteamID: {p.get('steamid')}",
            f"当前状态: {state_str}",
            f"个人主页: {p.get('profileurl')}",
            f"头像url: {p.get('avatarfull')}",
            f"最后登录: {datetime.datetime.fromtimestamp(p.get('lastlogoff', 0)).strftime('%Y-%m-%d %H:%M') if p.get('lastlogoff') else '未知'}"
        ]
        if "gameextrainfo" in p:
            info.append(f"正在游玩: {p['gameextrainfo']}")
            
        return "\n".join(info)
    except Exception as e:
        return f"获取个人资料失败: {e}"

def fetch_steam_recent(api_key, steam_id):
    """对应 /steam_recent_games"""
    if not api_key or not steam_id: return "未配置 Steam API Key 或 ID"
    
    # [修改] 定义最大重试次数和最后一次的错误信息
    max_retries = 3
    last_error = ""

    # [修改] 增加循环重试机制
    for attempt in range(max_retries):
        try:
            url = f"http://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v0001/?key={api_key}&steamid={steam_id}&format=json"
            res = requests.get(url, timeout=10)
            if res.status_code != 200:
                raise Exception(f"HTTP {res.status_code}, 内容: {res.text[:100]}")
            try:
                data = res.json()
            except Exception:
                raise Exception(f"Steam API 返回了非 JSON 数据: {res.text[:100]}")
            games = data.get("response", {}).get("games", [])
            if not games: return "最近两周没有游玩记录 (或隐私设置未公开)。"
            
            lines = []
            for g in games:
                name = g.get("name", "Unknown")
                time_2w = round(g.get("playtime_2weeks", 0) / 60, 1)
                time_total = round(g.get("playtime_forever", 0) / 60, 1)
                icon_hash = g.get("img_icon_url")
                appid = g.get("appid")
                icon_url = "无"
                header_url = "无"
                
                if appid:
                    header_url = f"https://cdn.cloudflare.steamstatic.com/steam/apps/{appid}/header.jpg"
                    if icon_hash:
                        icon_url = f"http://media.steampowered.com/steamcommunity/public/images/apps/{appid}/{icon_hash}.jpg"
                
                lines.append(f"- {name}: 近期{time_2w}小时 (总计{time_total}小时) 图标url: {icon_url} 横板封面url: {header_url}")
            return "\n".join(lines)

        except Exception as e:
            last_error = str(e)
            print(f"[Steam API] Recent Attempt {attempt + 1} failed: {e}")
            if attempt < max_retries - 1:
                time.sleep(2)
    return f"获取近期游戏失败 (重试3次后): {last_error}"

def fetch_steam_owned(api_key, steam_id, limit=50):
    """对应 /steam_games (GetOwnedGames)"""
    if not api_key or not steam_id: return "未配置 Steam API Key 或 ID"
    max_retries = 3
    last_error = ""
    for attempt in range(max_retries):
        try:
            url = f"http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key={api_key}&steamid={steam_id}&format=json&include_appinfo=1&include_played_free_games=1"
            res = requests.get(url, timeout=15)
            if res.status_code != 200:
                raise Exception(f"HTTP {res.status_code}, 内容: {res.text[:100]}")
            try:
                data = res.json()
            except Exception:
                raise Exception(f"Steam API 返回了非 JSON 数据: {res.text[:100]}")
            response = data.get("response", {})
            count = response.get("game_count", 0)
            games = response.get("games", [])
            if not games: return f"库存游戏数: {count} (列表为空或隐私设置隐藏)"
            games.sort(key=lambda x: x.get("playtime_forever", 0), reverse=True)
            actual_limit = min(limit, len(games))
            lines = [f"库存总数: {count} 款", f"游玩时长 Top {actual_limit}:"]
            for g in games[:limit]:
                name = g.get("name", "Unknown")
                time_total = round(g.get("playtime_forever", 0) / 60, 1)
                icon_hash = g.get("img_icon_url")
                appid = g.get("appid")
                icon_url = "无"
                if icon_hash and appid:
                    icon_url = f"http://media.steampowered.com/steamcommunity/public/images/apps/{appid}/{icon_hash}.jpg"
                if time_total > 0:
                    lines.append(f"- {name}: {time_total}小时 图标url：{icon_url}")
                else:
                    lines.append(f"- {name}: 未游玩 图标url：{icon_url}")
            if len(games) > limit:
                lines.append(f"... (还有 {len(games)-limit} 款游戏未列出)")
            return "\n".join(lines)
        except Exception as e:
            last_error = str(e)
            print(f"[Steam API] Owned Attempt {attempt + 1} failed: {e}")
            if attempt < max_retries - 1:
                time.sleep(2)
    return f"获取库存游戏失败 (重试3次后): {last_error}"

# 4. 生成报告 (核心)
@app.post("/report/generate")
def generate_report_llm(req: dict):
    # req: { "model": str, "type": "daily/weekly/sql", "sql": str, "chat_history": list/str, "prompt_template": str, "steam_id": str, "steam_api_key": str }
    
    # 1. 获取活动数据 (Database)
    db_result = tracker.execute_query_for_report(req.get("type"), req.get("sql"))
    if not db_result["success"]:
        return {"success": False, "reply": f"数据库查询错误: {db_result['error']}"}
    
    # 2. 获取聊天记录 (Chat History)
    # 前端传来的可能是 JSON 字符串，也可能是 List，统一转为 List
    raw_history = req.get("chat_history", [])
    if isinstance(raw_history, str):
        try:
            chat_list = json.loads(raw_history)
        except:
            chat_list = [raw_history]
    else:
        chat_list = raw_history

    user_prompt = req.get("prompt_template")
    report_category = req.get("report_category", "activity")

    # 3. 获取并预处理提示词模板
    user_prompt = req.get("prompt_template")
    if not user_prompt or not user_prompt.strip():
        # 默认模板 (如果用户没填)
        if report_category == "steam":
            user_prompt = """
            你是一个游戏搭子兼看板娘。请根据用户的【Steam游戏记录】和【日常活动】，生成一份游戏分析报告。

            【Steam数据】:
            /steam_profile
            /steam_recent_games
            /steam_games:50

            【电脑活动】:
            /data:30

            要求：
            1. 输出纯 HTML 代码，风格要赛博朋克或二次元游戏风。
            2. 分析用户的游戏偏好（FPS/RPG/策略等）。
            3. 如果用户最近玩游戏时间很长，吐槽一下他的肝度。
            4. 结合电脑活动，看看他是在摸鱼打游戏还是休息时间打游戏。
            """
        else:
            user_prompt = """
            你是一个贴心的桌面看板娘。请根据以下信息生成一份HTML日报/周报。
            
            【用户活动数据】:
            /data:50
            
            【近期聊天话题】:
            /chat_context:10
            
            要求：
            1. 返回纯 HTML 代码，不要包含 Markdown 标记（如 ```html）。
            2. 界面要现代、可爱。
            3. 总结用户的活动（工作了多久，玩了多久）。
            4. 结合聊天记录，给出一份“用户画像”或“心情分析”。
            5. 【重要】如果可以，请在 HTML 中嵌入简单的可视化图表来可视化数据（如饼图、雷达图或条形图）。
            """

    # === 4. 占位符解析与替换逻辑 (核心) ===
    
    # 辅助函数：格式化活动数据
    def format_activity(limit):
        lines = [f"Columns: {db_result['columns']}"]
        # 取前 N 行
        data_slice = db_result["data"][:limit]
        for row in data_slice:
            lines.append(str(row))
        return "\n".join(lines)

    # 辅助函数：格式化聊天记录
    def format_chat(limit):
        # 取后 N 条 (最近的记录)
        chat_slice = chat_list[-limit:] if limit > 0 else []
        lines = []
        for msg in chat_slice:
            # 兼容对象或字符串
            if isinstance(msg, dict):
                role = msg.get("role", "unknown")
                content = msg.get("content", "")
                # 简单处理多模态内容
                if isinstance(content, list): content = "[图片/多模态内容]"
                lines.append(f"{role}: {content}")
            else:
                lines.append(str(msg))
        return "\n".join(lines)

    steam_id = req.get("steam_id")
    api_key = req.get("steam_api_key")
    print("正在获取信息:", steam_id, api_key)

    def replace_data_tag(match):
        count = int(match.group(1)) if match.group(1) else 50
        return format_activity(count)

    def replace_chat_tag(match):
        count = int(match.group(1)) if match.group(1) else 20
        return format_chat(count)

    def replace_steam_games_tag(match):
        count = int(match.group(1)) if match.group(1) else 50
        print(f"[Report] Fetching Steam Owned Games for {steam_id}, limit={count}")
        return fetch_steam_owned(api_key, steam_id, count)
    
    def replace_steam_profile(match):
        return fetch_steam_profile(api_key, steam_id)
    
    def replace_steam_recent(match):
        return fetch_steam_recent(api_key, steam_id)
    

    # 开始替换
    final_prompt = re.sub(r"/data(?::(\d+))?", replace_data_tag, user_prompt)
    final_prompt = re.sub(r"/chat_context(?::(\d+))?", replace_chat_tag, final_prompt)
    final_prompt = re.sub(r"/steam_games(?::(\d+))?", replace_steam_games_tag, final_prompt)
    final_prompt = re.sub(r"/steam_profile", replace_steam_profile, final_prompt)
    final_prompt = re.sub(r"/steam_recent_games", replace_steam_recent, final_prompt)

    # 6. 调用 LLM
    try:
        payload = {
            "model": req.get("model"),
            "prompt": final_prompt,
            "stream": False,
            "options": {
                "num_ctx": 128000,       # [建议] 如果显存允许，尽量调大上下文窗口，防止数据被截断导致模型困惑
                # "repeat_penalty": 1.05,  # [核心修复] 重复惩罚 (默认是 1.0 或 1.1)，调高到 1.2 可以有效抑制复读
                # "temperature": 0.7,      # [调整] 保持一定的创造性，避免过于死板导致陷入局部循环
                # "top_k": 40,             # [新增] 标准采样参数
                # "top_p": 0.8             # [新增] 标准采样参数
            }
        }
        
        print("[Report] Prompt Constructed. Requesting LLM...")
        print(f"[Report] Prompt Length: {len(final_prompt)}") 
        print("[Report] Prompt：", final_prompt)
        response = requests.post(OLLAMA_API, json=payload)
        result = response.json()
        
        if "error" in result:
            return {"success": False, "reply": f"Ollama Error: {result['error']}"}

        llm_reply = result.get("response", "")
        # 清洗 Markdown
        html_content = llm_reply.replace("```html", "").replace("```", "").strip()
        
        # 保存
        file_path = tracker.save_html_report(html_content)
        filename = os.path.basename(file_path)
        
        return {"success": True, "filename": filename, "reply": "报告生成完毕！"}
        
    except Exception as e:
        print(f"[Report Error] {e}")
        return {"success": False, "reply": f"后端处理失败: {e}"}

if __name__ == "__main__":
    import uvicorn
    # 运行
    uvicorn.run(app, host="127.0.0.1", port=11542)
