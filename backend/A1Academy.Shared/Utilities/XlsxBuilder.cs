using System;
using System.IO;
using ClosedXML.Excel;

namespace A1Academy.Shared.Utilities
{
    /// <summary>
    /// Builds a single-sheet Excel (.xlsx) report: a bold, frozen, filterable header row and
    /// auto-sized columns. Values keep their type - numbers stay numbers and DateTimes become real
    /// Excel dates - so the sheet can be sorted, filtered and summed without any cleanup.
    /// </summary>
    public class XlsxBuilder
    {
        public const string ContentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        public const string DateTimeFormat = "yyyy-mm-dd hh:mm";

        private const double MaxColumnWidth = 60;

        private readonly XLWorkbook _workbook = new();
        private readonly IXLWorksheet _sheet;
        private readonly int _columnCount;
        private int _nextRow = 2;

        public XlsxBuilder(string sheetName, params string[] headers)
        {
            _sheet = _workbook.Worksheets.Add(sheetName);
            _columnCount = headers.Length;
            for (var i = 0; i < headers.Length; i++)
            {
                _sheet.Cell(1, i + 1).Value = headers[i];
            }

            var header = _sheet.Range(1, 1, 1, Math.Max(1, _columnCount));
            header.Style.Font.Bold = true;
            header.Style.Font.FontColor = XLColor.White;
            header.Style.Fill.BackgroundColor = XLColor.FromHtml("#1E293B");
            _sheet.SheetView.FreezeRows(1);
        }

        public XlsxBuilder AddRow(params object?[] values)
        {
            for (var i = 0; i < values.Length; i++)
            {
                var cell = _sheet.Cell(_nextRow, i + 1);
                switch (values[i])
                {
                    case null:
                        break;
                    case DateTime dt:
                        cell.Value = dt;
                        cell.Style.DateFormat.Format = DateTimeFormat;
                        break;
                    case int n:
                        cell.Value = n;
                        break;
                    case long n:
                        cell.Value = n;
                        break;
                    case double d:
                        cell.Value = d;
                        break;
                    case decimal m:
                        cell.Value = m;
                        break;
                    default:
                        // Strings are stored as text, never as formulas, so a value like "=SUM(...)"
                        // typed into a feedback box can't execute when the sheet is opened.
                        cell.Value = values[i]!.ToString();
                        break;
                }
            }
            _nextRow++;
            return this;
        }

        public byte[] ToByteArray()
        {
            if (_columnCount > 0)
            {
                _sheet.Range(1, 1, Math.Max(1, _nextRow - 1), _columnCount).SetAutoFilter();
                _sheet.Columns(1, _columnCount).AdjustToContents();
                foreach (var column in _sheet.Columns(1, _columnCount))
                {
                    if (column.Width > MaxColumnWidth) column.Width = MaxColumnWidth;
                }
            }

            using var stream = new MemoryStream();
            _workbook.SaveAs(stream);
            return stream.ToArray();
        }
    }
}
