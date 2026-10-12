using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace A1Academy.Shared.Utilities
{
    /// <summary>
    /// Utility for constructing RFC 4180 compliant CSV exports with UTF-8 BOM encoding.
    /// Ensures proper quoting and character escaping for Excel and standard spreadsheet tools.
    /// </summary>
    public class CsvBuilder
    {
        private readonly StringBuilder _sb = new();

        public CsvBuilder AddRow(params string?[] columns)
        {
            var escaped = columns.Select(EscapeField);
            _sb.AppendLine(string.Join(",", escaped));
            return this;
        }

        public CsvBuilder AddRow(IEnumerable<string?> columns)
        {
            var escaped = columns.Select(EscapeField);
            _sb.AppendLine(string.Join(",", escaped));
            return this;
        }

        public static string EscapeField(string? value)
        {
            if (string.IsNullOrEmpty(value)) return string.Empty;
            if (value.Contains(',') || value.Contains('"') || value.Contains('\n') || value.Contains('\r'))
            {
                return $"\"{value.Replace("\"", "\"\"")}\"";
            }
            return value;
        }

        public byte[] ToByteArray()
        {
            var encoding = new UTF8Encoding(true);
            return encoding.GetBytes(_sb.ToString());
        }

        public override string ToString() => _sb.ToString();
    }
}
