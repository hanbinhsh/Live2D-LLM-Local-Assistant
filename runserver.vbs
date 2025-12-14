Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "cmd /c python -m http.server 10452", 0
Set WshShell = Nothing
