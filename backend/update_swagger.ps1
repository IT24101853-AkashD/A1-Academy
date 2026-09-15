$projects = Get-ChildItem -Path . -Recurse -Filter "*.csproj"
foreach ($proj in $projects) {
    (Get-Content $proj.FullName) -replace 'Version="6.6.2"', 'Version="10.2.3"' | Set-Content $proj.FullName
}
