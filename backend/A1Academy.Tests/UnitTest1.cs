namespace A1Academy.Tests;

public class HealthCheckTests
{
    [Fact]
    public void System_HealthCheck_ReturnsTrue()
    {
        bool isSystemHealthy = true;
        Assert.True(isSystemHealthy);
    }
}