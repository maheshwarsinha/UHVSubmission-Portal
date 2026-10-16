# Automatic Wi-Fi IP Detector and Sync Daemon
# Continuously monitors network adapter and keeps data/uploads/network_info.json updated in real-time

$jsonPath = Join-Path $PSScriptRoot "..\data\uploads\network_info.json"
$lastIp = ""

Write-Host "Starting UHV Portal Auto Wi-Fi Sync Daemon..." -ForegroundColor Cyan

while ($true) {
    try {
        $ip = ""
        # 1. Try Wi-Fi adapter first
        $wifiAdapter = Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias "*Wi-Fi*" -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($wifiAdapter -and $wifiAdapter.IPAddress) {
            $ip = $wifiAdapter.IPAddress
        }

        # 2. Fallback to active physical network adapter (excluding virtual/loopback/VMware/WSL)
        if (-not $ip) {
            $fallback = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object {
                $_.IPAddress -notlike "127.*" -and
                $_.IPAddress -notlike "169.254.*" -and
                $_.IPAddress -notlike "192.168.56.*" -and
                $_.IPAddress -notlike "192.168.210.*" -and
                $_.IPAddress -notlike "172.20.*" -and
                $_.IPAddress -notlike "172.18.*" -and
                $_.IPAddress -notlike "100.*"
            } | Select-Object -First 1
            if ($fallback) {
                $ip = $fallback.IPAddress
            }
        }

        if ($ip -and $ip -ne $lastIp) {
            $data = @{
                wifi_ip = $ip
                portal_url = "http://$ip"
                port = 80
                updated_at = (Get-Date).ToString("o")
            }
            $data | ConvertTo-Json | Set-Content -Path $jsonPath -Force
            $lastIp = $ip
            Write-Host "[Auto-Sync] Detected Wi-Fi IP change: $ip -> Updated network_info.json" -ForegroundColor Green
        }
    } catch {
        # ignore temporary network state errors
    }

    Start-Sleep -Seconds 4
}
