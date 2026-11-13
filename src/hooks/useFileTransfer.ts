import { useCallback, useEffect, useRef, useState } from 'react';

export interface Transfer {
  id: string;
  name: string;
  transferred: number;
  total: number;
  status: 'copying' | 'complete' | 'cancelled' | 'error';
  error?: string;
}

export interface FileTransferDesktop {
  startTransfer(): Promise<Transfer | null>;
  cancelTransfer(id: string): Promise<Transfer | null>;
  getTransferStatus(): Promise<Transfer | null>;
  onTransfer(listener: (value: Transfer) => void): () => void;
}

// Local structural typing allows the bridge to be integrated independently.
const desktop = () => (window as unknown as { desktop?: Partial<FileTransferDesktop> }).desktop;

export function useFileTransfer() {
  const [transfer, setTransfer] = useState<Transfer | null>(null);
  const [pending, setPending] = useState(false);
  const mounted = useRef(false);
  const starting = useRef(false);
  const revision = useRef(0);
  useEffect(() => {
    mounted.current = true;
    let alive = true;
    const bridge = desktop();
    const unsubscribe = bridge?.onTransfer?.((value) => {
      revision.current++;
      if (alive) setTransfer(value);
    });
    const initialRevision = revision.current;
    void bridge?.getTransferStatus?.().then((value) => {
      if (alive && revision.current === initialRevision) setTransfer(value);
    }).catch(() => { /* Starting a copy reports actionable bridge errors. */ });
    return () => { alive = false; mounted.current = false; unsubscribe?.(); };
  }, []);

  const startTransfer = useCallback(async () => {
    if (starting.current) return;
    starting.current = true;
    setPending(true);
    try {
      const bridge = desktop();
      if (!bridge?.startTransfer) throw new Error('File copying is available in the desktop app.');
      const value = await bridge.startTransfer();
      if (mounted.current && value) setTransfer(value);
    } catch (error) {
      if (mounted.current) setTransfer({ id: '', name: '', transferred: 0, total: 0, status: 'error', error: error instanceof Error ? error.message : 'Unable to start file copy.' });
    } finally {
      starting.current = false;
      if (mounted.current) setPending(false);
    }
  }, []);

  const cancelTransfer = useCallback(async () => {
    if (!transfer?.id || transfer.status !== 'copying') return;
    try {
      await desktop()?.cancelTransfer?.(transfer.id);
      // Final cancellation arrives after streams close and the temporary file is removed.
    } catch (error) {
      if (mounted.current) setTransfer((value) => value ? { ...value, error: error instanceof Error ? error.message : 'Unable to cancel copy.' } : value);
    }
  }, [transfer]);

  return { transfer, startTransfer, cancelTransfer, busy: pending || transfer?.status === 'copying' };
}

export type FileTransferController = ReturnType<typeof useFileTransfer>;
