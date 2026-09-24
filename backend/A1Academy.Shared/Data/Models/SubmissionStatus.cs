namespace A1Academy.Shared.Data.Models
{
    // Plain string constants for the same reason as ClassStatus/AccountStatus - readable in the
    // database, no int-to-name mapping to keep in sync.
    public static class SubmissionStatus
    {
        // SubmittedAt was at or before the Assignment's DueAt.
        public const string Submitted = "Submitted";

        // SubmittedAt was after the Assignment's DueAt - set once, at submission time, by
        // comparing both timestamps as UTC (see AssignmentsController.Submit). Never
        // recalculated afterward, so a submission's status doesn't change retroactively if the
        // deadline itself could ever be edited later.
        public const string Late = "Late";
    }
}
