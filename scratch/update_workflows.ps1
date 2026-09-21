$workflows = @(
    @{ file = '.github/workflows/ci-gateway.yml'; appName = 'a1academy-gateway' },
    @{ file = '.github/workflows/ci-auth.yml'; appName = 'a1academy-auth' },
    @{ file = '.github/workflows/ci-admin.yml'; appName = 'a1academy-admin' },
    @{ file = '.github/workflows/ci-teacher.yml'; appName = 'a1academy-teacher' },
    @{ file = '.github/workflows/ci-student.yml'; appName = 'a1academy-student' }
)

foreach ($wf in $workflows) {
    $content = Get-Content $wf.file -Raw
    $deployStep = @"

    - name: Azure Login
      uses: azure/login@v2
      with:
        creds: `${{ secrets.AZURE_CREDENTIALS }}

    - name: Deploy to Azure Container Apps
      uses: azure/container-apps-deploy-action@v3
      with:
        imageToDeploy: `${{ secrets.DOCKER_USERNAME }}/$($wf.appName):`${{ github.sha }}
        containerAppName: $($wf.appName)
        resourceGroup: `${{ secrets.AZURE_RESOURCE_GROUP }}
"@

    if (-not $content.Contains("Deploy to Azure Container Apps")) {
        Add-Content -Path $wf.file -Value $deployStep
    }
}
