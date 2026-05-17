# Migration script - chuyen evaluation_month sang format so Arabic
# Run: powershell -File migrate_evaluation_month.ps1

$ErrorActionPreference = "Continue"

$headers = @{
    "apikey"             = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5iZGF4cmZxZGxlemRtbmhidGp6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mzc5NSwiZXhwIjoyMDkwMzQ5Nzk1fQ.87DY474yliLrK71QiIC_q3gka6JM-6fz8jji4AvAR3s"
    "Authorization"      = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5iZGF4cmZxZGxlemRtbmhidGp6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mzc5NSwiZXhwIjoyMDkwMzQ5Nzk1fQ.87DY474yliLrK71QiIC_q3gka6JM-6fz8jji4AvAR3s"
    "Content-Type"       = "application/json"
    "Prefer"            = "return=representation"
}

$baseUrl = "https://nbdaxrfqdlezdmnhbtjz.supabase.co"

# Lay tat ca rows de update
Write-Host "=== Lay danh sach tat ca cac row can update ===" -ForegroundColor Cyan
try {
    $allRows = Invoke-RestMethod -Uri "$baseUrl/rest/v1/monthly_student_evaluations?select=id,evaluation_month" `
        -Headers $headers -Method GET
    Write-Host "Tong so rows: $($allRows.Count)" -ForegroundColor Green

    # Hien thi cac gia tri distinct hien tai
    $distinctVals = $allRows | ForEach-Object { $_.evaluation_month } | Sort-Object -Unique
    Write-Host "Cac gia tri evaluation_month hien tai:" -ForegroundColor Yellow
    $distinctVals | ForEach-Object { Write-Host "  - $_" }
    Write-Host ""
} catch {
    Write-Host "LOI khi lay du lieu: $_" -ForegroundColor Red
    exit 1
}

# Map old -> new
$mapping = @{
    "Tháng thứ nhất (Buổi 1-8)"  = "Tháng thứ 1 (Buổi 1-8)"
    "Tháng thứ hai (Buổi 9-16)"  = "Tháng thứ 2 (Buổi 9-16)"
    "Tháng thứ ba (Buổi 17-24)"  = "Tháng thứ 3 (Buổi 17-24)"
    "Tháng thứ tư (Buổi 25-32)"  = "Tháng thứ 4 (Buổi 25-32)"
    "Tháng thứ năm (Buổi 33-40)" = "Tháng thứ 5 (Buổi 33-40)"
    "Tháng thứ sáu (Buổi 41-48)" = "Tháng thứ 6 (Buổi 41-48)"
    "Tháng thứ bảy (Buổi 49-56)" = "Tháng thứ 7 (Buổi 49-56)"
    "Tháng thứ tám (Buổi 57-64)" = "Tháng thứ 8 (Buổi 57-64)"
    "Tháng thứ chín (Buổi 65-72)"= "Tháng thứ 9 (Buổi 65-72)"
    "Tháng thứ mười (Buổi 73-80)"= "Tháng thứ 10 (Buổi 73-80)"
}

Write-Host "=== Thuc hien update ===" -ForegroundColor Cyan
$updatedCount = 0
$skippedCount = 0

foreach ($pair in $mapping.GetEnumerator()) {
    $oldVal = $pair.Key
    $newVal = $pair.Value

    $rowsToUpdate = @($allRows | Where-Object { $_.evaluation_month -eq $oldVal })
    if ($rowsToUpdate.Count -eq 0) {
        Write-Host "  [BO QUA] '$oldVal' - khong co row nao" -ForegroundColor DarkGray
        $skippedCount++
        continue
    }

    Write-Host "  [UPDATE] '$oldVal' -> '$newVal' ($($rowsToUpdate.Count) rows)" -ForegroundColor Yellow

    foreach ($row in $rowsToUpdate) {
        $body = @[{ evaluation_month = $newVal }] | ConvertTo-Json -Compress
        $uri = "$baseUrl/rest/v1/monthly_student_evaluations?id=eq.$($row.id)"
        try {
            $null = Invoke-RestMethod -Uri $uri `
                -Headers $headers `
                -Method PATCH `
                -Body ([System.Text.Encoding]::UTF8.GetBytes($body))
            $updatedCount++
        } catch {
            Write-Host "    LOI update row $($row.id): $_" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "=== Ket qua ===" -ForegroundColor Green
Write-Host "Da update thanh cong: $updatedCount rows" -ForegroundColor Green
Write-Host "Da bo qua (khong co du lieu): $skippedCount mappings" -ForegroundColor Gray

# Xac nhan ket qua
Write-Host ""
Write-Host "=== Xac nhan ket qua ===" -ForegroundColor Cyan
Start-Sleep -Seconds 1
try {
    $respAfter = Invoke-RestMethod -Uri "$baseUrl/rest/v1/monthly_student_evaluations?select=evaluation_month&limit=5&order=id" `
        -Headers $headers -Method GET
    $distinctAfter = $respAfter | ForEach-Object { $_.evaluation_month } | Sort-Object -Unique
    Write-Host "Cac gia tri evaluation_month sau khi update:" -ForegroundColor Yellow
    $distinctAfter | ForEach-Object { Write-Host "  - $_" }
} catch {
    Write-Host "Khong the xac nhan: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "Migration hoan tat!" -ForegroundColor Green
