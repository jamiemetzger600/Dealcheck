import { useEffect, useRef, useState } from 'react';
import { blobToBase64 } from '../../utils/feedbackContext';

export default function VoiceRecorder({ onChange, disabled }) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => () => {
    stopTracks();
    if (timerRef.current) clearInterval(timerRef.current);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const stopTracks = () => {
    streamRef.current?.getTracks()?.forEach((t) => t.stop());
    streamRef.current = null;
  };

  const clearRecording = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setSeconds(0);
    onChange?.(null);
  };

  const start = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      mediaRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data?.size) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stopTracks();
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        const dataBase64 = await blobToBase64(blob);
        onChange?.({ mimeType: blob.type || 'audio/webm', dataBase64 });
      };
      recorder.start();
      setRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch (err) {
      console.error('[feedback] mic error', err);
      setError('Microphone permission is required for voice notes.');
    }
  };

  const stop = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setRecording(false);
    try {
      mediaRef.current?.stop();
    } catch (err) {
      console.error('[feedback] stop recorder', err);
    }
  };

  return (
    <div className="feedback-voice">
      <div className="feedback-voice__row">
        {!recording ? (
          <button type="button" className="btn btn-secondary" disabled={disabled} onClick={start}>
            {previewUrl ? 'Re-record voice' : 'Record voice note'}
          </button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={stop}>
            Stop ({seconds}s)
          </button>
        )}
        {previewUrl ? (
          <button type="button" className="btn btn-secondary" onClick={clearRecording} disabled={disabled}>
            Remove
          </button>
        ) : null}
      </div>
      {previewUrl ? <audio className="feedback-voice__audio" controls src={previewUrl} /> : null}
      {error ? <p className="feedback-error">{error}</p> : null}
    </div>
  );
}
