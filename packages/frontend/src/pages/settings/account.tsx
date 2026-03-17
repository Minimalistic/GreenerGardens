import { useState, type FormEvent } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';

export function AccountSettings() {
  return (
    <div className="space-y-8">
      <ProfileSection />
      <PasswordSection />
      <PinSection />
      <SessionsSection />
      <DangerZone />
      <SuperDangerZone />
    </div>
  );
}

function ProfileSection() {
  const { user, refreshAuth } = useAuth();
  const [displayName, setDisplayName] = useState(user?.display_name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      await api.patch<any>('/auth/profile', { display_name: displayName, email });
      setMessage('Profile updated');
      await refreshAuth();
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Profile</h3>
      <form onSubmit={handleSubmit} className="space-y-3 max-w-md">
        <div className="space-y-1">
          <label className="text-sm font-medium">Display Name</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {message && <p className="text-sm text-green-600">{message}</p>}
        <button
          type="submit"
          className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Save
        </button>
      </form>
    </div>
  );
}

function PasswordSection() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      await api.post<any>('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setMessage('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.message || 'Failed to change password');
    }
  }

  return (
    <div className="space-y-4 pt-4 border-t">
      <h3 className="text-lg font-semibold">Change Password</h3>
      <form onSubmit={handleSubmit} className="space-y-3 max-w-md">
        <div className="space-y-1">
          <label className="text-sm font-medium">Current Password</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            required
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">New Password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            required
            minLength={8}
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Confirm New Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            required
            minLength={8}
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {message && <p className="text-sm text-green-600">{message}</p>}
        <button
          type="submit"
          className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Change Password
        </button>
      </form>
    </div>
  );
}

function PinSection() {
  const { user, refreshAuth } = useAuth();
  const [pin, setPin] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function handleSetPin(e: FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      await api.post<any>('/auth/pin/set', { pin });
      setMessage('PIN set successfully');
      setPin('');
      await refreshAuth();
    } catch (err: any) {
      setError(err.message || 'Failed to set PIN');
    }
  }

  async function handleRemovePin() {
    setError('');
    setMessage('');
    try {
      await api.delete('/auth/pin');
      setMessage('PIN removed');
      await refreshAuth();
    } catch (err: any) {
      setError(err.message || 'Failed to remove PIN');
    }
  }

  return (
    <div className="space-y-4 pt-4 border-t">
      <h3 className="text-lg font-semibold">Quick Unlock PIN</h3>
      <p className="text-sm text-muted-foreground">
        Set a 4-6 digit PIN for quick unlock when your session is idle. {user?.has_pin ? 'You have a PIN set.' : 'No PIN configured.'}
      </p>
      <form onSubmit={handleSetPin} className="flex gap-2 max-w-md">
        <input
          type="password"
          inputMode="numeric"
          pattern="[0-9]{4,6}"
          maxLength={6}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          placeholder="4-6 digit PIN"
          className="flex-1 px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          disabled={pin.length < 4}
          className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
        >
          {user?.has_pin ? 'Change' : 'Set'} PIN
        </button>
        {user?.has_pin && (
          <button
            type="button"
            onClick={handleRemovePin}
            className="px-4 py-2 text-sm text-destructive border border-destructive/30 rounded-md hover:bg-destructive/10"
          >
            Remove
          </button>
        )}
      </form>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {message && <p className="text-sm text-green-600">{message}</p>}
    </div>
  );
}

function SessionsSection() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);

  async function loadSessions() {
    try {
      const res = await api.get<{ success: boolean; data: any[] }>('/auth/sessions');
      setSessions(res.data);
      setLoaded(true);
    } catch {
      // ignore
    }
  }

  async function revokeSession(id: string) {
    try {
      await api.delete(`/auth/sessions/${id}`);
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-4 pt-4 border-t">
      <h3 className="text-lg font-semibold">Active Sessions</h3>
      {!loaded ? (
        <button
          onClick={loadSessions}
          className="text-sm text-primary hover:underline"
        >
          View active sessions
        </button>
      ) : (
        <div className="space-y-2">
          {sessions.map((s) => (
            <div key={s.id} className="flex items-center justify-between p-3 border rounded-md text-sm">
              <div>
                <p className="font-medium">
                  {s.is_current ? 'Current session' : (s.user_agent?.substring(0, 50) || 'Unknown device')}
                </p>
                <p className="text-muted-foreground text-xs">
                  {s.ip_address || 'Unknown IP'} &middot; Created {new Date(s.created_at).toLocaleDateString()}
                </p>
              </div>
              {!s.is_current && (
                <button
                  onClick={() => revokeSession(s.id)}
                  className="text-xs text-destructive hover:underline"
                >
                  Revoke
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DangerZone() {
  const { logout } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOutAll() {
    setSigningOut(true);
    try {
      // Revoke all other sessions first
      const res = await api.get<{ success: boolean; data: { id: string; is_current: boolean }[] }>('/auth/sessions');
      const others = res.data.filter(s => !s.is_current);
      await Promise.all(others.map(s => api.delete(`/auth/sessions/${s.id}`)));
      // Then sign out current session
      await logout();
    } catch {
      setSigningOut(false);
    }
  }

  return (
    <div className="pt-4 border-t border-destructive/30 space-y-3">
      <h3 className="text-lg font-semibold text-destructive">Danger Zone</h3>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-md border border-destructive/30">
        <div>
          <p className="font-medium text-sm">Sign out everywhere</p>
          <p className="text-sm text-muted-foreground">
            Revoke all sessions and sign out on every device.
          </p>
        </div>
        <button
          onClick={handleSignOutAll}
          disabled={signingOut}
          className="shrink-0 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-md border border-destructive/30 disabled:opacity-50"
        >
          {signingOut ? 'Signing out...' : 'Sign out all devices'}
        </button>
      </div>
    </div>
  );
}

function SuperDangerZone() {
  const [expanded, setExpanded] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  async function handleDelete(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (confirmation !== 'DELETE') {
      setError('Type DELETE to confirm');
      return;
    }

    setDeleting(true);
    try {
      await api.delete('/auth/account', { password, confirmation: 'DELETE' });
      window.location.href = '/login';
    } catch (err: any) {
      setError(err.message || 'Failed to delete account');
      setDeleting(false);
    }
  }

  return (
    <div className="pt-4 border-t-2 border-destructive space-y-3">
      <h3 className="text-lg font-semibold text-destructive">Super Danger Zone</h3>
      <div className="p-4 rounded-md border-2 border-destructive/50 bg-destructive/5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="font-medium text-sm">Delete your account</p>
            <p className="text-sm text-muted-foreground">
              Permanently delete your account and all associated data. This includes all gardens, plants, notes, tasks, and settings. This action cannot be undone.
            </p>
          </div>
          {!expanded && (
            <button
              onClick={() => setExpanded(true)}
              className="shrink-0 px-4 py-2 text-sm font-medium text-white bg-destructive hover:bg-destructive/90 rounded-md"
            >
              Delete account...
            </button>
          )}
        </div>
        {expanded && (
          <form onSubmit={handleDelete} className="space-y-3 max-w-md pt-2 border-t border-destructive/30">
            <div className="space-y-1">
              <label className="text-sm font-medium">Enter your password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-destructive/30 rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-destructive"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">
                Type <span className="font-mono font-bold text-destructive">DELETE</span> to confirm
              </label>
              <input
                type="text"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                className="w-full px-3 py-2 border border-destructive/30 rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-destructive font-mono"
                placeholder="DELETE"
                autoComplete="off"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={deleting || confirmation !== 'DELETE' || !password}
                className="px-4 py-2 text-sm font-medium text-white bg-destructive hover:bg-destructive/90 rounded-md disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Permanently delete my account'}
              </button>
              <button
                type="button"
                onClick={() => { setExpanded(false); setPassword(''); setConfirmation(''); setError(''); }}
                className="px-4 py-2 text-sm font-medium rounded-md border hover:bg-muted"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
