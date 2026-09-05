using System.Collections.Generic;
using A1Academy.API.Data.Models;

namespace A1Academy.API.Services
{
    // The four account actions an Admin can take (approve/reject/deactivate/reactivate) all
    // boil down to the same question: "is it legal to move this account from its current status
    // to the target one?" Pulling that into one place means every endpoint enforces the exact
    // same rules, and it's plain old C# with no HTTP/EF Core involved, so it's cheap to unit
    // test every corner of the state machine without spinning up the whole web app.
    public static class AccountStatusTransitions
    {
        public const string Approve = "approve";
        public const string Reject = "reject";
        public const string Deactivate = "deactivate";
        public const string Reactivate = "reactivate";

        // action -> (status it must currently be in, status it moves to)
        private static readonly Dictionary<string, (string RequiredStatus, string ResultingStatus)> Rules = new()
        {
            // Only a Pending Teacher application can be approved or rejected - Students/Admins
            // are already Active and never go through this at all.
            [Approve] = (AccountStatus.Pending, AccountStatus.Active),
            [Reject] = (AccountStatus.Pending, AccountStatus.Rejected),

            // Only an Active account can be deactivated, and only a Deactivated one can come
            // back. You can't deactivate someone who's still Pending or was already Rejected -
            // there's nothing "active" there to switch off.
            [Deactivate] = (AccountStatus.Active, AccountStatus.Deactivated),
            [Reactivate] = (AccountStatus.Deactivated, AccountStatus.Active),
        };

        /// <summary>
        /// Checks whether <paramref name="action"/> is legal for an account currently sitting in
        /// <paramref name="currentStatus"/>. On success, <paramref name="resultingStatus"/> is the
        /// status to save; on failure <paramref name="error"/> explains why and nothing changes.
        /// </summary>
        public static bool TryApply(string action, string currentStatus, out string resultingStatus, out string error)
        {
            if (!Rules.TryGetValue(action, out var rule))
            {
                resultingStatus = string.Empty;
                error = $"Unknown account action '{action}'.";
                return false;
            }

            if (currentStatus != rule.RequiredStatus)
            {
                resultingStatus = string.Empty;
                error = $"Cannot {action} an account that is currently '{currentStatus}' - it must be '{rule.RequiredStatus}' first.";
                return false;
            }

            resultingStatus = rule.ResultingStatus;
            error = string.Empty;
            return true;
        }
    }
}
