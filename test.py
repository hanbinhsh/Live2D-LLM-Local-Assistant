import requests
import json
import os
import subprocess
import platform

# ================= 配置区域 =================
# 你的模型名称 (确保 Ollama 里有这个模型)
# 注意: qwen3 目前未发布，可能是 qwen2.5-vl 或 qwen2.5
MODEL_NAME = "qwen3-vl:8b" 
OLLAMA_URL = "http://127.0.0.1:11434/api/chat"

# ================= 1. 定义真实的 Python 工具函数 =================

def open_calculator():
    """打开本地计算器"""
    system = platform.system()
    try:
        if system == "Windows":
            subprocess.Popen("calc.exe")
        elif system == "Darwin":  # macOS
            subprocess.Popen(["open", "-a", "Calculator"])
        elif system == "Linux":
            subprocess.Popen(["gnome-calculator"]) # 或 kcalc
        return "计算器已成功打开。"
    except Exception as e:
        return f"打开计算器失败: {str(e)}"

def list_files(path="."):
    """列出指定目录下的文件"""
    try:
        # 如果是相对路径，转为绝对路径
        abs_path = os.path.abspath(path)
        if not os.path.exists(abs_path):
            return f"错误：路径不存在 -> {abs_path}"
        
        files = os.listdir(abs_path)
        # 只返回前 20 个文件防止 Token 爆炸
        return f"目录 {abs_path} 下的文件: " + ", ".join(files[:20])
    except Exception as e:
        return f"读取目录失败: {str(e)}"

# ================= 2. 定义传给大模型的工具描述 (Schema) =================
# 这就是 MCP 中 server 向 client 提供的 "capabilities"

tools_schema = [
    {
        "type": "function",
        "function": {
            "name": "open_calculator",
            "description": "打开电脑上的计算器应用程序。",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "list_files",
            "description": "查看或列出指定文件夹路径下的文件名。",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string", 
                        "description": "要查看的文件夹路径，默认为当前目录 '.'"
                    }
                },
                "required": ["path"]
            }
        }
    }
]

# 工具映射表，用于实际执行
available_functions = {
    "open_calculator": open_calculator,
    "list_files": list_files
}

# ================= 3. 核心交互逻辑 (Agent Loop) =================

def chat_with_tools(user_input, history=[]):
    print(f"\n[用户]: {user_input}")
    
    # 1. 构造消息历史
    messages = history + [{"role": "user", "content": user_input}]

    # 2. 发送请求给 Ollama (带上 tools 定义)
    payload = {
        "model": MODEL_NAME,
        "messages": messages,
        "tools": tools_schema, # 告诉模型有哪些工具可用
        "stream": False
    }

    try:
        print("[System] 正在思考...")
        response = requests.post(OLLAMA_URL, json=payload)
        response_data = response.json()
        
        # 错误检查
        if "error" in response_data:
            print(f"[Error] {response_data['error']}")
            return

        message = response_data["message"]
        
        # 3. 检查模型是否决定调用工具
        if message.get("tool_calls"):
            print(f"[AI 决定调用工具]: {len(message['tool_calls'])} 个")
            
            # 将模型的“打算”加入历史，这很重要，否则模型会忘记它刚才想干嘛
            messages.append(message)

            # 4. 执行所有请求的工具
            for tool in message["tool_calls"]:
                func_name = tool["function"]["name"]
                args = tool["function"]["arguments"]
                
                print(f"  >>> 执行: {func_name}({args})")
                
                # 查找并运行 Python 函数
                func_to_call = available_functions.get(func_name)
                if func_to_call:
                    # 执行函数
                    func_result = func_to_call(**args)
                else:
                    func_result = f"Error: Tool {func_name} not found."
                
                print(f"  <<< 结果: {func_result}")

                # 5. 将工具运行结果回传给模型 (Role: tool)
                messages.append({
                    "role": "tool",
                    "content": str(func_result),
                    #有些接口需要 tool_call_id，Ollama 这里的 name 匹配通常足够
                })

            # 6. 工具执行完后，再次请求模型生成最终回答
            print("[System] 正在根据工具结果生成回答...")
            final_payload = {
                "model": MODEL_NAME,
                "messages": messages,
                "stream": False
            }
            final_response = requests.post(OLLAMA_URL, json=final_payload)
            final_msg = final_response.json()["message"]["content"]
            print(f"[看板娘]: {final_msg}")
            
        else:
            # 模型没有调用工具，直接闲聊
            print(f"[看板娘]: {message['content']}")

    except Exception as e:
        print(f"[Fatal Error] {e}")

# ================= 主程序 =================

if __name__ == "__main__":
    print(f"=== MCP/Tool Calling Demo (Model: {MODEL_NAME}) ===")
    print("你可以输入：")
    print("1. '打开计算器'")
    print("2. '看看当前目录下有什么文件'")
    print("3. '看看 D:/Test 目录下有什么' (请确保路径存在)")
    print("4. '你好' (普通闲聊)")
    print("输入 'q' 退出\n")

    history = [] # 简单的历史记录 (可选)

    while True:
        q = input(">>> ")
        if q.lower() in ['q', 'exit']:
            break
        chat_with_tools(q, history)