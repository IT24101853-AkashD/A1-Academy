using System;
using System.IO;
using A1Academy.Shared.Utilities;
using ClosedXML.Excel;
using Xunit;

namespace A1Academy.Tests
{
    public class XlsxBuilderTests
    {
        private static IXLWorksheet Build(Action<XlsxBuilder> fill, out XLWorkbook workbook)
        {
            var builder = new XlsxBuilder("Report", "Name", "Grade", "Submitted At", "Feedback");
            fill(builder);
            workbook = new XLWorkbook(new MemoryStream(builder.ToByteArray()));
            return workbook.Worksheet("Report");
        }

        [Fact]
        public void HeaderRow_IsBoldFrozenAndFilterable()
        {
            var sheet = Build(b => b.AddRow("Alex", 90, null, null), out var wb);
            using (wb)
            {
                Assert.Equal("Name", sheet.Cell(1, 1).GetString());
                Assert.True(sheet.Cell(1, 1).Style.Font.Bold);
                Assert.Equal(1, sheet.SheetView.SplitRow);
                Assert.True(sheet.AutoFilter.IsEnabled);
            }
        }

        [Fact]
        public void Values_KeepTheirType_SoExcelCanSortAndSumThem()
        {
            var when = new DateTime(2026, 10, 1, 14, 5, 0, DateTimeKind.Utc);
            var sheet = Build(b => b.AddRow("Kāraṇ கரண்", 87, when, null), out var wb);
            using (wb)
            {
                Assert.Equal("Kāraṇ கரண்", sheet.Cell(2, 1).GetString());
                Assert.True(sheet.Cell(2, 2).Value.IsNumber);
                Assert.Equal(87, sheet.Cell(2, 2).GetDouble());
                Assert.True(sheet.Cell(2, 3).Value.IsDateTime);
                Assert.Equal(when, sheet.Cell(2, 3).GetDateTime());
                Assert.True(sheet.Cell(2, 4).IsEmpty());
            }
        }

        [Fact]
        public void FormulaLookingText_IsStoredAsText_NotExecuted()
        {
            var sheet = Build(b => b.AddRow("Eve", "Ungraded", null, "=HYPERLINK(\"http://evil\")"), out var wb);
            using (wb)
            {
                Assert.False(sheet.Cell(2, 4).HasFormula);
                Assert.Equal("=HYPERLINK(\"http://evil\")", sheet.Cell(2, 4).GetString());
            }
        }
    }
}
