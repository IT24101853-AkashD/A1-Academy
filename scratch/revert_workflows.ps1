$workflows = @(
    '.github/workflows/ci-gateway.yml',
    '.github/workflows/ci-auth.yml',
    '.github/workflows/ci-admin.yml',
    '.github/workflows/ci-teacher.yml',
    '.github/workflows/ci-student.yml'
)

foreach ($wf in $workflows) {
    $content = Get-Content $wf -Raw
    # Split by the Azure Login step and keep only the top part
    $index = $content.IndexOf("    - name: Azure Login")
    if ($index -gt 0) {
        $newContent = $content.Substring(0, $index)
        Set-Content -Path $wf -Value $newContent
    }
}
