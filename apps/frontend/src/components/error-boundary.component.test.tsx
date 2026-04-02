import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from './error-boundary.component';

const ThrowingComponent = () => {
  throw new Error('Test error');
};

const WorkingComponent = () => <div>All good</div>;

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <WorkingComponent />
      </ErrorBoundary>,
    );
    expect(screen.getByText('All good')).toBeDefined();
  });

  it('renders default fallback UI when a child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Something went wrong')).toBeDefined();
    expect(screen.getByText('Try again')).toBeDefined();
  });

  it('renders custom fallback when provided', () => {
    render(
      <ErrorBoundary fallback={<div>Custom fallback</div>}>
        <ThrowingComponent />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Custom fallback')).toBeDefined();
  });

  it('resets error state when Try again is clicked', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Something went wrong')).toBeDefined();

    fireEvent.click(screen.getByText('Try again'));

    // After reset, re-render with a working component
    rerender(
      <ErrorBoundary>
        <WorkingComponent />
      </ErrorBoundary>,
    );
    expect(screen.getByText('All good')).toBeDefined();
  });
});
