import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { DealFinancialsForm } from '@/features/deals/components/deal-financials-form';
import * as actions from '@/features/deals/actions';

// Mock the server action
vi.mock('@/features/deals/actions', async () => {
  const actual = await vi.importActual('@/features/deals/actions');
  return {
    ...actual,
    updateDealFinancialsAction: vi.fn(),
  };
});

describe('DealFinancialsForm Verification', () => {
  const mockDealId = 'deal-123';
  const defaultValues = {
    revenueLtm: 1000000,
    ebitdaLtm: 200000,
    marginPercent: 20,
    askingPrice: 5000000,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with default values and formats currency', () => {
    render(<DealFinancialsForm dealId={mockDealId} initialData={defaultValues} />);

    // Check if inputs are rendered with formatted values
    expect((screen.getByLabelText(/Revenue LTM/i) as HTMLInputElement).value).toBe('$1,000,000');
    expect((screen.getByLabelText(/EBITDA LTM/i) as HTMLInputElement).value).toBe('$200,000');
    // Margin might be "20%" or "20". strict check might fail if implementation differs slightly.
    // I'll allow flexible matching or adjust implementation to match test.
    // Let's expect "20%" for "graceful formatting".
    expect((screen.getByLabelText(/Margin %/i) as HTMLInputElement).value).toBe('20%');
    expect((screen.getByLabelText(/Asking Price/i) as HTMLInputElement).value).toBe('$5,000,000');
  });

  it('updates values and calls action on submit', async () => {
    // Mock successful response
    vi.mocked(actions.updateDealFinancialsAction).mockResolvedValue({ success: true });

    render(<DealFinancialsForm dealId={mockDealId} initialData={defaultValues} />);

    const revenueInput = screen.getByLabelText(/Revenue LTM/i) as HTMLInputElement;
    // User clears and types new value
    fireEvent.change(revenueInput, { target: { value: '2500000' } });
    fireEvent.blur(revenueInput);

    // Expect formatting after blur
    expect(revenueInput.value).toBe('$2,500,000');

    // Submit
    const submitBtn = screen.getByRole('button', { name: /save/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(actions.updateDealFinancialsAction).toHaveBeenCalledWith({
        dealId: mockDealId,
        revenueLtm: 2500000,
        ebitdaLtm: 200000,
        marginPercent: 20,
        askingPrice: 5000000,
      });
    });
  });

  it('shows validation error for invalid input', async () => {
    render(<DealFinancialsForm dealId={mockDealId} initialData={defaultValues} />);

    const revenueInput = screen.getByLabelText(/Revenue LTM/i);
    fireEvent.change(revenueInput, { target: { value: 'invalid-text' } });
    fireEvent.blur(revenueInput);

    const submitBtn = screen.getByRole('button', { name: /save/i });
    fireEvent.click(submitBtn);

    // Expect Zod error
    await waitFor(() => {
        // Looking for standard Zod number error or custom message
        expect(screen.queryByText(/Expected number|Invalid input/i)).not.toBeNull();
    });

    expect(actions.updateDealFinancialsAction).not.toHaveBeenCalled();
  });
});
