Set WshShell = CreateObject("WScript.Shell")
' 获取当前脚本所在目录
currentPath = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)

' 拼接命令：使用 runtime\python.exe 启动 start_tray.py
' 最后的 , 0 表示隐藏窗口 (Hide Window)
' 这样 python.exe 会运行，有 IO 流，但用户看不见黑框
cmd = chr(34) & currentPath & "\runtime\python.exe" & chr(34) & " " & chr(34) & currentPath & "\start_tray.py" & chr(34)

WshShell.Run cmd, 0
Set WshShell = Nothing