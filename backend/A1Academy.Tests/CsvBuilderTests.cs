using System;
using System.Text;
using A1Academy.Shared.Utilities;
using Xunit;

namespace A1Academy.Tests
{
    public class CsvBuilderTests
    {
        [Fact]
        public void ToByteArray_StartsWithUtf8Bom_SoExcelReadsTheFileAsUtf8()
        {
            var bytes = new CsvBuilder().AddRow("Name").AddRow("Kāraṇ — Tamil: கரண்").ToByteArray();

            Assert.Equal(new byte[] { 0xEF, 0xBB, 0xBF }, bytes[..3]);
            Assert.Contains("கரண்", Encoding.UTF8.GetString(bytes, 3, bytes.Length - 3));
        }

        [Fact]
        public void FormatTimestamp_UsesAnExcelFriendlyDateTime()
        {
            var value = new DateTime(2026, 10, 1, 14, 5, 59, DateTimeKind.Utc);

            Assert.Equal("2026-10-01 14:05", CsvBuilder.FormatTimestamp(value));
        }

        [Theory]
        [InlineData("plain", "plain")]
        [InlineData("a,b", "\"a,b\"")]
        [InlineData("say \"hi\"", "\"say \"\"hi\"\"\"")]
        [InlineData(null, "")]
        public void EscapeField_QuotesOnlyWhenNeeded(string? input, string expected)
        {
            Assert.Equal(expected, CsvBuilder.EscapeField(input));
        }
    }
}
