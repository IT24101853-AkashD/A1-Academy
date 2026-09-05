namespace A1Academy.API.Data.Models
{
    // Every value an account can be in. Kept as plain string constants instead of a real C#
    // enum so it stores as readable text in the database and serializes as-is over the API -
    // no int-to-name mapping to keep in sync on either side.
    public static class AccountStatus
    {
        // Teacher signed up but an Admin hasn't looked at the application yet. This is the
        // only status a brand new Teacher account can start in - Students and Admins go
        // straight to Active since nobody needs to approve them.
        public const string Pending = "Pending";

        // Normal, usable account - can log in and use the platform.
        public const string Active = "Active";

        // An Admin looked at a Pending Teacher application and turned it down.
        public const string Rejected = "Rejected";

        // An Admin switched off a previously Active account. Reversible via reactivation,
        // unlike Rejected which is meant to be a final answer on a signup.
        public const string Deactivated = "Deactivated";
    }
}
