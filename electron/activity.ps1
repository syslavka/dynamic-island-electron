$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
# Embedded so the existing *.ps1 packaging/unpack rules are sufficient.
$nativeError = $null
try {
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using System.Text;
public static class IslandActivityNative {
 [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
 [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint p);
 [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
 [ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")] class Enumerator {}
 [ComImport, Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)] interface IEnum {
  void EnumAudioEndpoints(int f, uint m, out IntPtr d);
  void GetDefaultAudioEndpoint(int f, int r, out IDevice d);
 }
 [ComImport, Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)] interface IDevice {
  void Activate(ref Guid id, uint ctx, IntPtr p, [MarshalAs(UnmanagedType.IUnknown)] out object o);
 }
 [ComImport, Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)] interface IVolume {
  void RegisterControlChangeNotify(IntPtr p); void UnregisterControlChangeNotify(IntPtr p);
  void GetChannelCount(out uint n); void SetMasterVolumeLevel(float v, IntPtr c);
  void SetMasterVolumeLevelScalar(float v, IntPtr c); void GetMasterVolumeLevel(out float v);
  void GetMasterVolumeLevelScalar(out float v); void SetChannelVolumeLevel(uint n,float v,IntPtr c);
  void SetChannelVolumeLevelScalar(uint n,float v,IntPtr c); void GetChannelVolumeLevel(uint n,out float v);
  void GetChannelVolumeLevelScalar(uint n,out float v); void SetMute([MarshalAs(UnmanagedType.Bool)] bool v,IntPtr c);
  void GetMute([MarshalAs(UnmanagedType.Bool)] out bool v);
 }
 public static bool Mute(int flow, bool? set) {
  IEnum e=null; IDevice d=null; object v=null;
  try { e=(IEnum)new Enumerator(); e.GetDefaultAudioEndpoint(flow,1,out d);
   Guid id=typeof(IVolume).GUID; d.Activate(ref id,23,IntPtr.Zero,out v);
   if(set.HasValue) ((IVolume)v).SetMute(set.Value,IntPtr.Zero);
   bool result; ((IVolume)v).GetMute(out result); return result;
  } finally { if(v!=null) Marshal.ReleaseComObject(v); if(d!=null) Marshal.ReleaseComObject(d); if(e!=null) Marshal.ReleaseComObject(e); }
 }
}
'@
} catch { $nativeError = $_.Exception.Message }

$winrtError = $null
try {
 Add-Type -AssemblyName System.Runtime.WindowsRuntime
 $null = [Windows.Devices.Bluetooth.BluetoothDevice,Windows.Devices.Bluetooth,ContentType=WindowsRuntime]
 $null = [Windows.Devices.Bluetooth.BluetoothLEDevice,Windows.Devices.Bluetooth,ContentType=WindowsRuntime]
 $null = [Windows.Devices.Bluetooth.BluetoothConnectionStatus,Windows.Devices.Bluetooth,ContentType=WindowsRuntime]
 $null = [Windows.Devices.Enumeration.DeviceInformation,Windows.Devices.Enumeration,ContentType=WindowsRuntime]
 $null = [Windows.Devices.Enumeration.DeviceInformationCollection,Windows.Devices.Enumeration,ContentType=WindowsRuntime]
 $asTask = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.IsGenericMethod -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' } | Select-Object -First 1
} catch { $winrtError = $_.Exception.Message }
function Await-Activity($operation, $type) {
 $task = $asTask.MakeGenericMethod($type).Invoke($null, @($operation))
 if (-not $task.Wait(1500)) {
  try { $operation.Cancel() } catch {}
  throw 'WinRT request timed out'
 }
 return $task.Result
}
function Capability($available, $reason, $source) {
 return @{ available = [bool]$available; reason = $reason; source = $source }
}
function Read-Consent($name) {
 $root = $null
 try {
  $root = [Microsoft.Win32.Registry]::CurrentUser.OpenSubKey("Software\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\$name")
  if ($null -eq $root) { throw 'ConsentStore unavailable' }
  $apps = New-Object System.Collections.Generic.List[string]
  $stack = New-Object System.Collections.Generic.Stack[string]
  $stack.Push('')
  while ($stack.Count) {
   $relative = $stack.Pop(); $key = $null
   try {
    $key = if ($relative -eq '') { $root } else { $root.OpenSubKey($relative) }
    if ($null -eq $key) { throw 'ConsentStore key inaccessible' }
    $stop = $key.GetValue('LastUsedTimeStop', $null)
    if ($null -ne $stop -and [long]$stop -eq 0) { $apps.Add($relative) }
    foreach ($childName in $key.GetSubKeyNames()) {
     $stack.Push($(if ($relative) { "$relative\$childName" } else { $childName }))
    }
   } finally { if ($key -and $key -ne $root) { $key.Dispose() } }
  }
  return @{ capability = (Capability $true 'best-effort' 'HKCU.ConsentStore'); value = @{ active = ($apps.Count -gt 0); apps = @($apps.ToArray()) } }
 } catch { return @{ capability = (Capability $false 'unsupported-or-inaccessible' 'HKCU.ConsentStore'); value = $null } }
 finally { if ($root) { $root.Dispose() } }
}
$bluetoothCache = $null; $bluetoothTime = [DateTime]::MinValue
function Read-Bluetooth {
 if ($winrtError) { return @{ capability = (Capability $false 'winrt-unavailable' 'WinRT.ConnectionStatus'); value = $null } }
 $devices = New-Object System.Collections.Generic.List[object]
 $failures = 0
 $deadline = [DateTime]::UtcNow.AddSeconds(6)
 foreach ($kind in @('classic', 'le')) {
  try {
   $type = if ($kind -eq 'classic') { [Windows.Devices.Bluetooth.BluetoothDevice] } else { [Windows.Devices.Bluetooth.BluetoothLEDevice] }
   $selector = $type::GetDeviceSelectorFromConnectionStatus([Windows.Devices.Bluetooth.BluetoothConnectionStatus]::Connected)
   try {
    $items = Await-Activity ([Windows.Devices.Enumeration.DeviceInformation]::FindAllAsync($selector, [string[]]@('{104EA319-6EE2-4701-BD47-8DDBF425BBE5} 2'))) ([Windows.Devices.Enumeration.DeviceInformationCollection])
   } catch {
    # An optional battery property must never disable connection reporting.
    $items = Await-Activity ([Windows.Devices.Enumeration.DeviceInformation]::FindAllAsync($selector)) ([Windows.Devices.Enumeration.DeviceInformationCollection])
   }
   foreach ($item in $items) {
    $device = $null
    try {
     if ([DateTime]::UtcNow -gt $deadline) { throw 'Bluetooth sample budget exceeded' }
     $device = Await-Activity ($type::FromIdAsync($item.Id)) $type
     if ($null -eq $device) { throw 'Bluetooth device inaccessible' }
     if ($device.ConnectionStatus -ne [Windows.Devices.Bluetooth.BluetoothConnectionStatus]::Connected) { continue }
     $battery = $null
     if ($item.Properties.ContainsKey('{104EA319-6EE2-4701-BD47-8DDBF425BBE5} 2')) {
      $raw = $item.Properties['{104EA319-6EE2-4701-BD47-8DDBF425BBE5} 2']
      if ($null -ne $raw -and [double]$raw -ge 0 -and [double]$raw -le 100) { $battery = [double]$raw }
     }
     $devices.Add(@{ id = $item.Id; name = $device.Name; transport = $kind; connected = $true; batteryPercent = $battery; batteryAvailable = ($null -ne $battery) })
    } catch { $failures++; [Console]::Error.WriteLine("Bluetooth device: " + $_.Exception.Message) }
    finally { if ($device) { $device.Dispose() } }
   }
  } catch { $failures++; [Console]::Error.WriteLine("Bluetooth enumeration: " + $_.Exception.Message) }
 }
 return @{ capability = (Capability ($failures -eq 0) $(if ($failures) { 'partial-or-inaccessible' } else { $null }) 'WinRT.ConnectionStatus'); value = @{ devices = @($devices.ToArray()); complete = ($failures -eq 0); sampledAt = [DateTime]::UtcNow.ToString('o') } }
}
while ($null -ne ($line = [Console]::ReadLine())) {
 try {
  $request = $line | ConvertFrom-Json
  if ($request.command -eq 'setMute') {
   try {
    if ($request.muted -isnot [bool] -or $request.endpoint -notin @('render','capture')) { throw 'Invalid mute arguments' }
    if ($nativeError) { throw $nativeError }
    $flow = if ($request.endpoint -eq 'render') { 0 } else { 1 }
    $actual = [IslandActivityNative]::Mute($flow, $request.muted)
    @{ ok = ($actual -eq $request.muted); error = $(if ($actual -eq $request.muted) { $null } else { 'mute-not-applied' }) } | ConvertTo-Json -Compress
   } catch { @{ ok = $false; error = 'endpoint-unavailable' } | ConvertTo-Json -Compress }
   continue
  }
  if ($request.command -ne 'status') { throw 'Unsupported command' }
  $cap = @{}; $result = @{ schemaVersion = 1; sampledAt = [DateTime]::UtcNow.ToString('o'); capabilities = $cap }
  foreach ($pair in @(@('microphone','microphone'), @('camera','webcam'))) {
   $read = Read-Consent $pair[1]; $cap[$pair[0]] = $read.capability; $result[$pair[0]] = $read.value
  }
  if (-not $bluetoothCache -or ([DateTime]::UtcNow - $bluetoothTime).TotalSeconds -ge 10) {
   $bluetoothCache = Read-Bluetooth; $bluetoothTime = [DateTime]::UtcNow
  }
  $cap.bluetooth = $bluetoothCache.capability; $result.bluetooth = $bluetoothCache.value
  $audio = @{ renderMuted = $null; captureMuted = $null; role = 'multimedia'; endpoints = @{} }
  foreach ($endpoint in @(@('render',0), @('capture',1))) {
   try {
    if ($nativeError) { throw $nativeError }
    $audio["$($endpoint[0])Muted"] = [IslandActivityNative]::Mute($endpoint[1], $null)
    $audio.endpoints[$endpoint[0]] = Capability $true $null 'CoreAudio.DefaultEndpoint'
   } catch { $audio.endpoints[$endpoint[0]] = Capability $false 'endpoint-unavailable' 'CoreAudio.DefaultEndpoint' }
  }
  $result.audio = $audio
  $cap.audio = Capability ($audio.endpoints.render.available -and $audio.endpoints.capture.available) $(if ($audio.endpoints.render.available -and $audio.endpoints.capture.available) { $null } else { 'partial-or-unavailable' }) 'CoreAudio.DefaultEndpoint'
  try {
   if ($nativeError) { throw $nativeError }
   $handle = [IslandActivityNative]::GetForegroundWindow()
   if ($handle -eq [IntPtr]::Zero) { throw 'No foreground window' }
   [uint32]$processId = 0
   $null = [IslandActivityNative]::GetWindowThreadProcessId($handle, [ref]$processId)
   $title = New-Object System.Text.StringBuilder 1024
   $null = [IslandActivityNative]::GetWindowText($handle, $title, $title.Capacity)
   $processName = $null; $processPath = $null; $proc = $null
   try { $proc = [System.Diagnostics.Process]::GetProcessById($processId); $processName = $proc.ProcessName; $processPath = $proc.MainModule.FileName } catch {} finally { if ($proc) { $proc.Dispose() } }
   $result.foreground = @{ pid = $processId; name = $processName; path = $processPath; title = $title.ToString(); windowHandle = $handle.ToInt64().ToString() }
   $cap.foreground = Capability $true $null 'user32.GetForegroundWindow'
  } catch { $result.foreground = $null; $cap.foreground = Capability $false 'foreground-unavailable' 'user32.GetForegroundWindow' }
  $result.available = @($cap.Values | Where-Object { $_.available }).Count -gt 0
  $result | ConvertTo-Json -Compress -Depth 10
 } catch {
  $cap = @{}; foreach ($name in @('microphone','camera','bluetooth','audio','foreground')) { $cap[$name] = Capability $false 'request-failed' $null }
  @{ schemaVersion = 1; sampledAt = [DateTime]::UtcNow.ToString('o'); available = $false; capabilities = $cap; microphone = $null; camera = $null; bluetooth = $null; audio = $null; foreground = $null } | ConvertTo-Json -Compress -Depth 6
 }
}
