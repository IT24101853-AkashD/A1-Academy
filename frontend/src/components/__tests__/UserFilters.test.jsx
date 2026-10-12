import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import UserFilters from '../UserFilters';

const noop = () => {};

describe('UserFilters', () => {
  it('does not show a Clear filters button when no filter is active', () => {
    render(<UserFilters role="" status="" onRoleChange={noop} onStatusChange={noop} onShowPendingTeachers={noop} onClear={noop} />);
    expect(screen.queryByTitle(/clear filters/i)).not.toBeInTheDocument();
  });

  it('shows a Clear filters button once a role or status filter is active', () => {
    render(<UserFilters role="Teacher" status="" onRoleChange={noop} onStatusChange={noop} onShowPendingTeachers={noop} onClear={noop} />);
    expect(screen.getByTitle(/clear filters/i)).toBeInTheDocument();
  });

  it('calls onRoleChange with the selected role', () => {
    const onRoleChange = vi.fn();
    render(<UserFilters role="" status="" onRoleChange={onRoleChange} onStatusChange={noop} onShowPendingTeachers={noop} onClear={noop} />);

    fireEvent.click(screen.getByRole('button', { name: 'Teachers' }));
    expect(onRoleChange).toHaveBeenCalledWith('Teacher');
  });

  it('calls onStatusChange with the selected status', () => {
    const onStatusChange = vi.fn();
    render(<UserFilters role="" status="" onRoleChange={noop} onStatusChange={onStatusChange} onShowPendingTeachers={noop} onClear={noop} />);

    fireEvent.click(screen.getByRole('button', { name: 'Pending' }));
    expect(onStatusChange).toHaveBeenCalledWith('Pending');
  });

  it('clears just the role or just the status when its All button is clicked', () => {
    const onRoleChange = vi.fn();
    const onStatusChange = vi.fn();
    render(<UserFilters role="Teacher" status="Pending" onRoleChange={onRoleChange} onStatusChange={onStatusChange} onShowPendingTeachers={noop} onClear={noop} />);

    const [allRoles, allStatuses] = screen.getAllByRole('button', { name: 'All' });
    fireEvent.click(allRoles);
    fireEvent.click(allStatuses);

    expect(onRoleChange).toHaveBeenCalledWith('');
    expect(onStatusChange).toHaveBeenCalledWith('');
  });

  it('calls onShowPendingTeachers when the quick-filter button is clicked', () => {
    const onShowPendingTeachers = vi.fn();
    render(<UserFilters role="" status="" onRoleChange={noop} onStatusChange={noop} onShowPendingTeachers={onShowPendingTeachers} onClear={noop} />);

    fireEvent.click(screen.getByRole('button', { name: /pending teachers/i }));
    expect(onShowPendingTeachers).toHaveBeenCalled();
  });

  it('marks the quick-filter button as pressed only when role=Teacher and status=Pending', () => {
    const { rerender } = render(
      <UserFilters role="Teacher" status="Pending" onRoleChange={noop} onStatusChange={noop} onShowPendingTeachers={noop} onClear={noop} />
    );
    expect(screen.getByRole('button', { name: /pending teachers/i })).toHaveAttribute('aria-pressed', 'true');

    rerender(<UserFilters role="Student" status="" onRoleChange={noop} onStatusChange={noop} onShowPendingTeachers={noop} onClear={noop} />);
    expect(screen.getByRole('button', { name: /pending teachers/i })).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls onClear when Clear filters is clicked', () => {
    const onClear = vi.fn();
    render(<UserFilters role="Teacher" status="Pending" onRoleChange={noop} onStatusChange={noop} onShowPendingTeachers={noop} onClear={onClear} />);

    fireEvent.click(screen.getByTitle(/clear filters/i));
    expect(onClear).toHaveBeenCalled();
  });
});
