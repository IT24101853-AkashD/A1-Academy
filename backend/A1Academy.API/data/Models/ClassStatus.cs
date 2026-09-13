namespace A1Academy.API.Data.Models
{
    // Every value a Class can be in. Plain string constants for the same reason as
    // AccountStatus - readable in the database, no int-to-name mapping to keep in sync.
    public static class ClassStatus
    {
        // Currently scheduled and counted against its category for the "Block Category
        // Deletion" guard (see CategoriesController.DeleteCategory) - a category with one or
        // more Active classes can't be removed until each one is reassigned to a different
        // category or cancelled.
        public const string Active = "Active";

        // No longer running. Doesn't block its category from being deleted - a Teacher who
        // cancels a class shouldn't leave a phantom dependency behind.
        public const string Cancelled = "Cancelled";
    }
}
