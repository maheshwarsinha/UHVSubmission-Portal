import { useState, useCallback } from 'react';
import { apiService } from '../services/api';
import { StagedFile } from '../types';

interface ChunkedUploadOptions {
  chunkSize?: number; // bytes, default 5MB
  fileType: 'ppt' | 'pdf' | 'video';
  rollNumber: string;
  section: string;
  studentName: string;
  category?: string;
}

export function useChunkedUpload() {
  const [progress, setProgress] = useState<number>(0);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'assembling' | 'completed' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [stagedFile, setStagedFile] = useState<StagedFile | null>(null);

  const uploadFile = useCallback(async (file: File, options: ChunkedUploadOptions): Promise<StagedFile | null> => {
    setStatus('uploading');
    setProgress(0);
    setErrorMessage(null);

    const chunkSize = options.chunkSize || 5 * 1024 * 1024; // 5MB chunks
    const totalChunks = Math.ceil(file.size / chunkSize);
    const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    try {
      // Step 1: Pre-validate filename with server before uploading chunks
      const valResult = await apiService.validateFilename(
        options.rollNumber,
        options.section,
        options.studentName,
        file.name,
        options.fileType,
        options.category || 'Regular'
      );

      if (!valResult.is_valid) {
        setStatus('error');
        setErrorMessage(valResult.error_message || 'Filename does not match expected convention.');
        return null;
      }

      // Step 2: Upload chunks sequentially with progress reporting
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * chunkSize;
        const end = Math.min(file.size, start + chunkSize);
        const chunkBlob = file.slice(start, end);

        const formData = new FormData();
        formData.append('upload_id', uploadId);
        formData.append('chunk_index', chunkIndex.toString());
        formData.append('total_chunks', totalChunks.toString());
        formData.append('chunk', chunkBlob, file.name);

        await apiService.uploadChunk(formData);

        // Update progress percentage
        const currentProgress = Math.round(((chunkIndex + 1) / totalChunks) * 90); // reserve 10% for assembly
        setProgress(currentProgress);
      }

      // Step 3: Trigger assembly on server
      setStatus('assembling');
      setProgress(95);

      const assembleRes = await apiService.assembleFile({
        upload_id: uploadId,
        total_chunks: totalChunks,
        target_filename: file.name,
        file_type: options.fileType,
        roll_number: options.rollNumber,
        section: options.section,
        name: options.studentName,
        category: options.category || 'Regular',
      });

      setProgress(100);
      setStatus('completed');

      const staged: StagedFile = {
        file_type: options.fileType,
        file_token: assembleRes.file_token,
        expected_filename: assembleRes.expected_filename,
        original_filename: file.name,
        mime_type: assembleRes.mime_type,
        file_size: assembleRes.file_size,
        file_size_mb: assembleRes.file_size_mb,
        sha256: assembleRes.sha256,
      };

      setStagedFile(staged);
      return staged;
    } catch (err: any) {
      setStatus('error');
      const msg = err.response?.data?.detail || err.message || 'File upload failed.';
      setErrorMessage(msg);
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setProgress(0);
    setStatus('idle');
    setErrorMessage(null);
    setStagedFile(null);
  }, []);

  return {
    uploadFile,
    progress,
    status,
    errorMessage,
    stagedFile,
    reset,
  };
}
