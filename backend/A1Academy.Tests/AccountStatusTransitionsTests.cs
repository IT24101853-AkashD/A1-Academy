using A1Academy.API.Data.Models;
using A1Academy.API.Services;
using Xunit;

namespace A1Academy.Tests;

/// <summary>
/// Pure unit tests for the account status state machine, with no HTTP or database involved -
/// AccountStatusTransitions is just plain C# logic, so this is the fastest and most direct way
/// to cover every valid move and every invalid one. UsersEndpointTests covers the same rules
/// again through the real approve/reject/deactivate/reactivate endpoints, but that's really
/// testing the controller wiring (auth, 404s, HTTP status codes) - the actual state machine
/// rules only need to be proven correct once, here.
/// </summary>
public class AccountStatusTransitionsTests
{
    [Theory]
    [InlineData(AccountStatusTransitions.Approve, AccountStatus.Pending, AccountStatus.Active)]
    [InlineData(AccountStatusTransitions.Reject, AccountStatus.Pending, AccountStatus.Rejected)]
    [InlineData(AccountStatusTransitions.Deactivate, AccountStatus.Active, AccountStatus.Deactivated)]
    [InlineData(AccountStatusTransitions.Reactivate, AccountStatus.Deactivated, AccountStatus.Active)]
    public void TryApply_ValidTransition_SucceedsWithExpectedResultingStatus(string action, string currentStatus, string expectedStatus)
    {
        var succeeded = AccountStatusTransitions.TryApply(action, currentStatus, out var resultingStatus, out var error);

        Assert.True(succeeded);
        Assert.Equal(expectedStatus, resultingStatus);
        Assert.Equal(string.Empty, error);
    }

    // Every action paired with every status it's NOT supposed to work from. This is the
    // "invalid state transitions being rejected" acceptance criterion made explicit - one row
    // per illegal move rather than trusting a couple of spot checks to cover the whole matrix.
    [Theory]
    [InlineData(AccountStatusTransitions.Approve, AccountStatus.Active)]     // the edge case named on the ticket
    [InlineData(AccountStatusTransitions.Approve, AccountStatus.Rejected)]
    [InlineData(AccountStatusTransitions.Approve, AccountStatus.Deactivated)]
    [InlineData(AccountStatusTransitions.Reject, AccountStatus.Active)]
    [InlineData(AccountStatusTransitions.Reject, AccountStatus.Rejected)]
    [InlineData(AccountStatusTransitions.Reject, AccountStatus.Deactivated)]
    [InlineData(AccountStatusTransitions.Deactivate, AccountStatus.Pending)]
    [InlineData(AccountStatusTransitions.Deactivate, AccountStatus.Rejected)]
    [InlineData(AccountStatusTransitions.Deactivate, AccountStatus.Deactivated)]
    [InlineData(AccountStatusTransitions.Reactivate, AccountStatus.Pending)]
    [InlineData(AccountStatusTransitions.Reactivate, AccountStatus.Active)]
    [InlineData(AccountStatusTransitions.Reactivate, AccountStatus.Rejected)]
    public void TryApply_InvalidTransition_FailsAndLeavesStatusUnspecified(string action, string currentStatus)
    {
        var succeeded = AccountStatusTransitions.TryApply(action, currentStatus, out var resultingStatus, out var error);

        Assert.False(succeeded);
        Assert.Equal(string.Empty, resultingStatus);
        Assert.False(string.IsNullOrWhiteSpace(error));
        // The message should at least name the action and the status that tripped it up, so an
        // admin (or a test failure) can tell what went wrong without guessing.
        Assert.Contains(action, error);
        Assert.Contains(currentStatus, error);
    }

    [Fact]
    public void TryApply_UnknownAction_Fails()
    {
        var succeeded = AccountStatusTransitions.TryApply("promote", AccountStatus.Active, out var resultingStatus, out var error);

        Assert.False(succeeded);
        Assert.Equal(string.Empty, resultingStatus);
        Assert.Contains("promote", error);
    }
}
