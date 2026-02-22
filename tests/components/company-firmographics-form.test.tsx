import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CompanyFirmographicsForm } from '../../src/features/deals/components/company-firmographics-form';
import * as actions from '../../src/features/deals/actions';

// Mock the server action
vi.mock('../../src/features/deals/actions', () => ({
  updateCompanyFirmographicsAction: vi.fn(),
}));

describe('CompanyFirmographicsForm', () => {
  const defaultProps = {
    companyId: 'company-123',
    initialData: {
      location: 'New York, NY',
      employees: 50,
      industry: 'SaaS',
    },
  };

  it('renders with default values', () => {
    render(<CompanyFirmographicsForm {...defaultProps} />);
    expect(screen.getByDisplayValue('New York, NY')).toBeTruthy();
    expect(screen.getByDisplayValue('50')).toBeTruthy();
    expect(screen.getByDisplayValue('SaaS')).toBeTruthy();
  });

  it('displays a warning message about shared records', () => {
    render(<CompanyFirmographicsForm {...defaultProps} />);
    expect(screen.getByText(/shared Company record/i)).toBeTruthy();
  });

  it('calls updateCompanyFirmographicsAction on valid submission', async () => {
    const mockAction = vi.mocked(actions.updateCompanyFirmographicsAction);
    mockAction.mockResolvedValue({ success: true });

    render(<CompanyFirmographicsForm {...defaultProps} />);

    const locationInput = screen.getByDisplayValue('New York, NY');
    fireEvent.change(locationInput, { target: { value: 'San Francisco, CA' } });

    const submitButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockAction).toHaveBeenCalledWith({
        companyId: 'company-123',
        location: 'San Francisco, CA',
        employees: 50,
        industry: 'SaaS',
      });
    });
  });

  it('shows validation errors when required fields are cleared', async () => {
    render(<CompanyFirmographicsForm {...defaultProps} />);

    const locationInput = screen.getByDisplayValue('New York, NY');
    fireEvent.change(locationInput, { target: { value: '' } });

    const submitButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Location is required/i)).toBeTruthy();
    });
  });
});
