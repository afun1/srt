
import { useRef, useState } from 'react';
import { supabase } from './supabaseClient';

function App() {
  const [recording, setRecording] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadUrl, setUploadUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const startRecording = async () => {
    setRecordedChunks([]);
    setDownloadUrl(null);
    try {
      const stream = await (navigator.mediaDevices as any).getDisplayMedia({ video: true, audio: true });
      setMediaStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      const recorder = new MediaRecorder(stream);
      setMediaRecorder(recorder);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          setRecordedChunks((prev) => [...prev, e.data]);
        }
      };
      recorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        setDownloadUrl(URL.createObjectURL(blob));
        if (mediaStream) {
          mediaStream.getTracks().forEach((track) => track.stop());
        }
      };
      recorder.start();
      setRecording(true);
    } catch (err) {
      alert('Error starting screen recording: ' + err);
    }
  };


  const stopRecording = () => {
    if (mediaRecorder && recording) {
      mediaRecorder.stop();
      setRecording(false);
    }
  };

  const uploadToSupabase = async () => {
    if (!downloadUrl) return;
    setUploading(true);
    setUploadUrl(null);
    const res = await fetch(downloadUrl);
    const blob = await res.blob();
    const fileName = `recording-${Date.now()}.webm`;
    const { data, error } = await supabase.storage.from('videos').upload(fileName, blob, {
      cacheControl: '3600',
      upsert: false,
      contentType: 'video/webm',
    });
    if (error) {
      alert('Upload failed: ' + error.message);
    } else {
      setUploadUrl(`${supabase.storage.from('videos').getPublicUrl(fileName).data.publicUrl}`);
    }
    setUploading(false);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f7faff' }}>
      <div style={{ maxWidth: 600, width: '100%', textAlign: 'center', background: '#fff', borderRadius: 12, boxShadow: '0 4px 24px #0002', padding: 32 }}>
        <h1>Screen Recorder</h1>
        <video ref={videoRef} style={{ width: '100%', borderRadius: 8, marginBottom: 16 }} autoPlay muted />
        <div style={{ marginBottom: 16 }}>
          {!recording ? (
            <button onClick={startRecording} style={{ padding: '12px 24px', fontSize: 18, borderRadius: 6, background: '#1976d2', color: '#fff', border: 'none', cursor: 'pointer' }}>
              Start Recording
            </button>
          ) : (
            <button onClick={stopRecording} style={{ padding: '12px 24px', fontSize: 18, borderRadius: 6, background: '#e53935', color: '#fff', border: 'none', cursor: 'pointer' }}>
              Stop Recording
            </button>
          )}
        </div>
        {downloadUrl && (
          <>
            <a href={downloadUrl} download="recording.webm" style={{ display: 'inline-block', padding: '12px 24px', fontSize: 18, borderRadius: 6, background: '#28a745', color: '#fff', textDecoration: 'none', marginTop: 16 }}>
              Download Recording
            </a>
            <br />
            <button onClick={uploadToSupabase} disabled={uploading} style={{ padding: '12px 24px', fontSize: 18, borderRadius: 6, background: uploading ? '#aaa' : '#1976d2', color: '#fff', border: 'none', cursor: uploading ? 'not-allowed' : 'pointer', marginTop: 16 }}>
              {uploading ? 'Uploading...' : 'Upload to Supabase'}
            </button>
          </>
        )}
        {uploadUrl && (
          <div style={{ marginTop: 16 }}>
            <a href={uploadUrl} target="_blank" rel="noopener noreferrer">View Uploaded Video</a>
          </div>
        )}
        <p style={{ marginTop: 32, color: '#666' }}>No login required. Record your screen and download instantly.</p>
      </div>
    </div>
  );
}

export default App;
