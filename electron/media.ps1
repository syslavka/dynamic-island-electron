$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager,Windows.Media.Control,ContentType=WindowsRuntime]
$null = [Windows.Storage.Streams.DataReader,Windows.Storage.Streams,ContentType=WindowsRuntime]
$null = [Windows.Storage.Streams.IRandomAccessStream,Windows.Storage.Streams,ContentType=WindowsRuntime]
$null = [Windows.Storage.Streams.IRandomAccessStreamWithContentType,Windows.Storage.Streams,ContentType=WindowsRuntime]

Add-Type -Path (Join-Path $PSScriptRoot 'Artwork.dll')

$asTask = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.IsGenericMethod -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' } | Select-Object -First 1
function Await($operation, $type) {
  $task = $asTask.MakeGenericMethod($type).Invoke($null, @($operation))
  if (-not $task.Wait(6000)) { throw 'Windows media request timed out' }
  return $task.Result
}
$manager = Await ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
$artKey = ''; $art = $null
while ($line = [Console]::ReadLine()) {
  try {
    $request = $line | ConvertFrom-Json
    $session = $manager.GetCurrentSession()
    if (-not $session -or $session.GetPlaybackInfo().PlaybackStatus.ToString() -ne 'Playing') {
      $playingSession = $manager.GetSessions() | Where-Object { $_.GetPlaybackInfo().PlaybackStatus.ToString() -eq 'Playing' } | Select-Object -First 1
      if ($playingSession) { $session = $playingSession }
    }
    if (-not $session) { @{ available = $false } | ConvertTo-Json -Compress; continue }
    $ok = $true
    switch ($request.command) {
      'play' { $ok = Await ($session.TryPlayAsync()) ([bool]) }
      'pause' { $ok = Await ($session.TryPauseAsync()) ([bool]) }
      'next' { $ok = Await ($session.TrySkipNextAsync()) ([bool]) }
      'previous' { $ok = Await ($session.TrySkipPreviousAsync()) ([bool]) }
      'seek' { $ok = Await ($session.TryChangePlaybackPositionAsync([long]([double]$request.position * 10000000 + $session.GetTimelineProperties().StartTime.Ticks))) ([bool]) }
    }
    $media = Await ($session.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
    $info = $session.GetPlaybackInfo(); $timeline = $session.GetTimelineProperties(); $controls = $info.Controls
    $key = "$($session.SourceAppUserModelId)|$($media.Title)|$($media.Artist)|$($media.AlbumTitle)"
    if ($key -ne $artKey) {
      $artKey = $key; $art = $null
      if ($media.Thumbnail) {
        try { $art = [IslandArtwork]::Read($media.Thumbnail).GetAwaiter().GetResult() } catch { $art = $null }
      }
    }

    $position = $timeline.Position.TotalSeconds - $timeline.StartTime.TotalSeconds
    if ($info.PlaybackStatus.ToString() -eq 'Playing') { $position += [Math]::Max(0, ([DateTimeOffset]::Now - $timeline.LastUpdatedTime).TotalSeconds) * $(if ($info.PlaybackRate) { $info.PlaybackRate } else { 1 }) }
    $duration = [Math]::Max(0, $timeline.EndTime.TotalSeconds - $timeline.StartTime.TotalSeconds)
    @{ available = $true; ok = $ok; title = $media.Title; artist = $media.Artist; album = $media.AlbumTitle; source = $session.SourceAppUserModelId; artwork = $art; playing = ($info.PlaybackStatus.ToString() -eq 'Playing'); duration = $duration; position = [Math]::Min($duration, [Math]::Max(0,$position)); canPlay = $controls.IsPlayEnabled; canPause = $controls.IsPauseEnabled; canNext = $controls.IsNextEnabled; canPrevious = $controls.IsPreviousEnabled; canSeek = $controls.IsPlaybackPositionEnabled } | ConvertTo-Json -Compress -Depth 4
  } catch { [Console]::Error.WriteLine($_.Exception.ToString()); @{ available = $false; error = 'Не удалось получить медиасессию Windows' } | ConvertTo-Json -Compress }
}