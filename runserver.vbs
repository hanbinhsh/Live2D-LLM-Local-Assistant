Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "cmd /c python -m http.server 10452", 0
WshShell.Run "cmd /c python server.py", 0, False
Set WshShell = Nothing
