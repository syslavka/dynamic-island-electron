import type { FileTransferController } from '../../hooks/useFileTransfer';

const bytes = (value: number) => {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

export function FileTransferModule({ island }: { island: { fileTransfer: FileTransferController } }) {
  const { transfer, startTransfer, cancelTransfer, busy } = island.fileTransfer;
  const copying = transfer?.status === 'copying';
  const progress = transfer?.total ? Math.min(100, Math.round(transfer.transferred / transfer.total * 100)) : transfer?.status === 'complete' ? 100 : 0;
  const label = transfer?.status === 'complete' ? 'Файл скопирован' : transfer?.status === 'cancelled' ? 'Копирование отменено' : transfer?.status === 'error' ? 'Ошибка копирования' : copying ? 'Копирование файла' : busy ? 'Выберите файл и место' : 'Копирование файла';
  return (
    <div className="file-transfer-module module-enter" style={{ display: 'grid', gap: 12, minWidth: 0 }}>
      <div aria-live="polite" style={{ minWidth: 0 }}>
        <h3 style={{ margin: 0, fontSize: 16 }}>{label}</h3>
        <p title={transfer?.name} style={{ margin: '6px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: 0.75 }}>
          {transfer?.name || 'Выберите файл и папку для его копии.'}
        </p>
      </div>
      {transfer && (
        <div>
          <progress aria-label="File copy progress" max={100} value={progress} style={{ width: '100%', height: 6, accentColor: 'var(--accent, #71b7ff)' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, opacity: 0.75 }}>
            <span>{bytes(transfer.transferred)} / {bytes(transfer.total)}</span>
            <span>{progress}%</span>
          </div>
        </div>
      )}
      {transfer?.error && <p role="alert" style={{ margin: 0, fontSize: 12, overflowWrap: 'anywhere' }}>{transfer.error}</p>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        {copying && <button className="module-action" onClick={() => void cancelTransfer()}>Отменить</button>}
        <button className="module-action primary" disabled={busy} onClick={() => void startTransfer()}>{busy ? 'Копирование…' : 'Выбрать файл'}</button>
      </div>
    </div>
  );
}
