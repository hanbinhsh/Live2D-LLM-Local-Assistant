Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "pythonw start_tray.py", 0, False
Set WshShell = Nothing