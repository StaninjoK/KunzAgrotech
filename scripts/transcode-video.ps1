param([string]$In, [string]$Out, [int]$Width = 720, [int]$Height = 1546, [int]$Bitrate = 2200000, [double]$TrimStart = 0, [double]$TrimStop = 0)
# Web-Version eines Videos mit der in Windows eingebauten Media Foundation (WinRT MediaTranscoder), ohne Tonspur.
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime]
$null = [Windows.Media.Transcoding.MediaTranscoder, Windows.Media, ContentType = WindowsRuntime]
$null = [Windows.Media.MediaProperties.MediaEncodingProfile, Windows.Media, ContentType = WindowsRuntime]

$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]
function Await($op, [Type]$type) { $t = $asTaskGeneric.MakeGenericMethod($type).Invoke($null, @($op)); $t.Wait(-1) | Out-Null; $t.Result }
$asTaskAction = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncActionWithProgress`1' })[0]

$src = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync($In)) ([Windows.Storage.StorageFile])
$dir = Await ([Windows.Storage.StorageFolder]::GetFolderFromPathAsync((Split-Path $Out))) ([Windows.Storage.StorageFolder])
$dst = Await ($dir.CreateFileAsync((Split-Path $Out -Leaf), [Windows.Storage.CreationCollisionOption]::ReplaceExisting)) ([Windows.Storage.StorageFile])

$profile = [Windows.Media.MediaProperties.MediaEncodingProfile]::CreateMp4([Windows.Media.MediaProperties.VideoEncodingQuality]::HD720p)
$profile.Video.Width = $Width
$profile.Video.Height = $Height
$profile.Video.Bitrate = $Bitrate
$profile.Audio = $null

$tc = New-Object Windows.Media.Transcoding.MediaTranscoder
$tc.HardwareAccelerationEnabled = $true
if ($TrimStart -gt 0) { $tc.TrimStartTime = [TimeSpan]::FromSeconds($TrimStart) }
if ($TrimStop -gt 0) { $tc.TrimStopTime = [TimeSpan]::FromSeconds($TrimStop) }
$prep = Await ($tc.PrepareFileTranscodeAsync($src, $dst, $profile)) ([Windows.Media.Transcoding.PrepareTranscodeResult])
if (-not $prep.CanTranscode) { throw "Transcode nicht möglich: $($prep.FailureReason)" }
$task = $asTaskAction.MakeGenericMethod([double]).Invoke($null, @($prep.TranscodeAsync()))
$task.Wait(-1) | Out-Null
"{0} -> {1:N2} MB" -f (Split-Path $Out -Leaf), ((Get-Item $Out).Length / 1MB)
