import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useNavigate } from 'react-router-dom';

export function PinLockModal() {
  const { verifyPin, logout, user } = useAuth();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Auto-submit when PIN is complete (4-6 digits)
  useEffect(() => {
    if (pin.length >= 4 && pin.length <= 6) {
      const timer = setTimeout(() => handleSubmit(), 300);
      return () => clearTimeout(timer);
    }
  }, [pin]);

  async function handleSubmit() {
    if (isSubmitting || pin.length < 4) return;
    setIsSubmitting(true);
    setError('');
    try {
      await verifyPin(pin);
    } catch {
      setError('Invalid PIN');
      setPin('');
      inputRef.current?.focus();
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUsePassword() {
    await logout();
    navigate('/login');
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center">
      <div className="w-full max-w-sm p-8 text-center space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">Session Locked</h2>
          <p className="text-sm text-muted-foreground">
            Welcome back{user?.display_name ? `, ${user.display_name}` : ''}. Enter your PIN to continue.
          </p>
        </div>

        <div className="space-y-4">
          <input
            ref={inputRef}
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={pin}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '');
              setPin(val);
              setError('');
            }}
            onKeyDown={handleKeyDown}
            placeholder="Enter PIN"
            className="w-full text-center text-2xl tracking-[0.5em] px-4 py-3 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            disabled={isSubmitting}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <button
          onClick={handleUsePassword}
          className="text-sm text-muted-foreground hover:text-foreground underline"
        >
          Use password instead
        </button>
      </div>
    </div>
  );
}
