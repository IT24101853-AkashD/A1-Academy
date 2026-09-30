$ErrorActionPreference = "Stop"
$G = "https://a1academy-gateway.greenfield-88918092.malaysiawest.azurecontainerapps.io"

function Login($Email, $Password) {
    $body = @{ email = $Email; password = $Password } | ConvertTo-Json
    $res = Invoke-RestMethod -Method Post "$G/api/auth/login" -ContentType "application/json" -Body $body
    return $res.token
}

function Hit($Method, $Path, $Token, $Body="") {
    $h = @{}
    if ($Token) { $h.Authorization = "Bearer $Token" }
    try {
        if ($Body) {
            $res = Invoke-WebRequest -Method $Method -Uri "$G$Path" -Headers $h -ContentType "application/json" -Body $Body -UseBasicParsing
        } else {
            $res = Invoke-WebRequest -Method $Method -Uri "$G$Path" -Headers $h -ContentType "application/json" -UseBasicParsing
        }
        return [int]$res.StatusCode
    } catch {
        return [int]$_.Exception.Response.StatusCode
    }
}

Write-Host "Authenticating users..."
$tA = Login "marketerdigital997@gmail.com" "akakak"
$tB = Login "karanaathi001@gmail.com" "123456"
$tS1 = Login "rohethstunner@gmail.com" "akakak"
$tS2 = Login "inkarankanagalingam@gmail.com" "123456"

Write-Host "Setting up test data..."
# Create Class A1
$classBody = @{ name="Security Test Class A1"; categoryId=1; scheduledAt=(Get-Date).AddDays(1).ToString("o"); capacity=10 } | ConvertTo-Json
$resA1 = Invoke-RestMethod -Method Post "$G/api/teacher/classes" -Headers @{Authorization="Bearer $tA"} -ContentType "application/json" -Body $classBody
$A1 = $resA1.id

# Create Class B1
$classBodyB = @{ name="Security Test Class B1"; categoryId=1; scheduledAt=(Get-Date).AddDays(1).ToString("o"); capacity=10 } | ConvertTo-Json
$resB1 = Invoke-RestMethod -Method Post "$G/api/teacher/classes" -Headers @{Authorization="Bearer $tB"} -ContentType "application/json" -Body $classBodyB
$B1 = $resB1.id

# Enrol S1 in A1
Hit "POST" "/api/student/classes/$A1/enroll" $tS1

Write-Host "Executing Security Tests..."

$results = @{}

# SEC-01: No token at all
$results["SEC-01"] = (Hit "GET" "/api/teacher/classes" "")

# SEC-05: Student calls Teacher endpoints
$results["SEC-05"] = (Hit "GET" "/api/teacher/classes" $tS1)

# SEC-06: Teacher calls Student endpoints
$results["SEC-06"] = (Hit "POST" "/api/student/classes/$A1/enroll" $tA)

# SEC-07: Cancel another teacher's class
$results["SEC-07"] = (Hit "POST" "/api/teacher/classes/$A1/cancel" $tB)

# SEC-11: Non-enrolled student lists materials
$results["SEC-11"] = (Hit "GET" "/api/student/classes/$A1/materials" $tS2)

# SEC-16: Scheduling rules can't be bypassed (Past date)
$badClass = @{ name="Past Class"; categoryId=1; scheduledAt="2020-01-01T10:00:00Z"; capacity=10 } | ConvertTo-Json
$results["SEC-16"] = (Hit "POST" "/api/teacher/classes" $tA $badClass)

# SEC-28: Duplicate enrolment
$results["SEC-28"] = (Hit "POST" "/api/student/classes/$A1/enroll" $tS1)

$results | ConvertTo-Json
