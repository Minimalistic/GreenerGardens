import { Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/auth-context';
import { PinLockModal } from '@/components/pin-lock-modal';

export function PinGate() {
  const { isPinLocked } = useAuth();

  return (
    <>
      {isPinLocked && <PinLockModal />}
      <Outlet />
    </>
  );
}
