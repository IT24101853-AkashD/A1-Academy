import React from 'react';

// Builds a compact page-number list around the current page, e.g. [1, '...', 4, 5, 6, '...', 20],
// so the control stays readable even with hundreds of pages.
function getPageNumbers(current, total) {
    const delta = 2;
    const pages = [];

    for (let i = 1; i <= total; i += 1) {
        if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
            pages.push(i);
        }
    }

    const withDots = [];
    let previous;
    pages.forEach((page) => {
        if (previous !== undefined) {
            if (page - previous === 2) {
                withDots.push(previous + 1);
            } else if (page - previous > 1) {
                withDots.push('...');
            }
        }
        withDots.push(page);
        previous = page;
    });

    return withDots;
}

export default function Pagination({ page, totalPages, onPageChange }) {
    if (totalPages <= 1) {
        return null;
    }

    const pageNumbers = getPageNumbers(page, totalPages);

    return (
        <nav className="flex flex-wrap items-center justify-center gap-2 py-8" aria-label="Pagination">
            <button
                type="button"
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
                className="px-4 py-2 rounded-full text-sm font-bold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
            >
                Previous
            </button>

            {pageNumbers.map((entry, index) =>
                entry === '...' ? (
                    // eslint-disable-next-line react/no-array-index-key
                    <span key={`ellipsis-${index}`} className="px-1 text-slate-400 dark:text-slate-500 font-bold select-none">
                        &hellip;
                    </span>
                ) : (
                    <button
                        key={entry}
                        type="button"
                        onClick={() => onPageChange(entry)}
                        aria-current={entry === page ? 'page' : undefined}
                        className={`min-w-10 h-10 px-3 rounded-full text-sm font-bold transition-colors ${
                            entry === page
                                ? 'bg-slate-900 text-white'
                                : 'text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900'
                        }`}
                    >
                        {entry}
                    </button>
                )
            )}

            <button
                type="button"
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages}
                className="px-4 py-2 rounded-full text-sm font-bold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
            >
                Next
            </button>
        </nav>
    );
}
