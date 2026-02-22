import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ArchiveDealDialog } from '../../../src/features/deals/components/archive-deal-dialog';

// Need to mock ResizeObserver for Radix Dialog
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock scrollIntoView for Radix Select
window.HTMLElement.prototype.scrollIntoView = vi.fn();
// Mock hasPointerCapture for Radix UI (sometimes needed)
window.HTMLElement.prototype.hasPointerCapture = vi.fn();
window.HTMLElement.prototype.setPointerCapture = vi.fn();
window.HTMLElement.prototype.releasePointerCapture = vi.fn();

describe('ArchiveDealDialog', () => {
  const mockOnSubmit = vi.fn();
  const mockOnClose = vi.fn();
  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    dealId: 'deal-123',
    onSubmit: mockOnSubmit,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly when open', () => {
    render(<ArchiveDealDialog {...defaultProps} />);
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Archive Deal' })).toBeTruthy();
    expect(screen.getByText(/This action will move the deal/)).toBeTruthy();
  });

  it('does not render when closed', () => {
    render(<ArchiveDealDialog {...defaultProps} isOpen={false} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('blocks submission if no reason is selected', async () => {
    render(<ArchiveDealDialog {...defaultProps} />);

    const submitButton = screen.getByRole('button', { name: /Archive Deal/i });
    fireEvent.click(submitButton);

    expect(mockOnSubmit).not.toHaveBeenCalled();
    expect(await screen.findByText('Please select a reason for archiving this deal.')).toBeTruthy();
  });

  it('submits correctly when a reason is selected', async () => {
    render(<ArchiveDealDialog {...defaultProps} />);

    // Open the select dropdown
    const trigger = screen.getByRole('combobox');
    fireEvent.click(trigger);

    // Select options are rendered in a portal.
    const reason = 'Price too high';
    const option = await screen.findByRole('option', { name: reason });
    fireEvent.click(option);

    // Submit
    const submitButton = screen.getByRole('button', { name: /Archive Deal/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        dealId: 'deal-123',
        lossReason: reason,
      });
    });
  });

  it('calls onClose when Cancel is clicked', () => {
    render(<ArchiveDealDialog {...defaultProps} />);

    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });
});
