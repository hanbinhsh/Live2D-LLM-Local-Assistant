Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "cmd /c python start_tray.py", 0, False
Set WshShell = Nothing