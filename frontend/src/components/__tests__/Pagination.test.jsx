import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Pagination from '../Pagination';

describe('Pagination', () => {
  it('renders nothing when there is only one page', () => {
    const { container } = render(<Pagination page={1} totalPages={1} onPageChange={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when there are no pages', () => {
    const { container } = render(<Pagination page={1} totalPages={0} onPageChange={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('disables Previous on the first page and Next on the last page', () => {
    const { rerender } = render(<Pagination page={1} totalPages={3} onPageChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: /^previous$/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^next$/i })).not.toBeDisabled();

    rerender(<Pagination page={3} totalPages={3} onPageChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: /^previous$/i })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: /^next$/i })).toBeDisabled();
  });

  it('calls onPageChange with page - 1 / page + 1 when Previous/Next are clicked', () => {
    const onPageChange = vi.fn();
    render(<Pagination page={2} totalPages={5} onPageChange={onPageChange} />);

    fireEvent.click(screen.getByRole('button', { name: /^next$/i }));
    expect(onPageChange).toHaveBeenLastCalledWith(3);

    fireEvent.click(screen.getByRole('button', { name: /^previous$/i }));
    expect(onPageChange).toHaveBeenLastCalledWith(1);
  });

  it('renders every page number when the total is small, and marks the current page', () => {
    render(<Pagination page={2} totalPages={4} onPageChange={vi.fn()} />);

    [1, 2, 3, 4].forEach((n) => {
      expect(screen.getByRole('button', { name: String(n) })).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: '2' })).toHaveAttribute('aria-current', 'page');
  });

  it('calls onPageChange with the clicked page number', () => {
    const onPageChange = vi.fn();
    render(<Pagination page={1} totalPages={4} onPageChange={onPageChange} />);

    fireEvent.click(screen.getByRole('button', { name: '3' }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('collapses distant pages behind an ellipsis for a large page count', () => {
    render(<Pagination page={10} totalPages={20} onPageChange={vi.fn()} />);

    // First and last page are always reachable.
    expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '20' })).toBeInTheDocument();
    // Pages far from the current one are collapsed, not individually rendered.
    expect(screen.queryByRole('button', { name: '5' })).not.toBeInTheDocument();
    expect(screen.getAllByText('…').length).toBeGreaterThan(0);
  });
});
