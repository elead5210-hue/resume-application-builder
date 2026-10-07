import { useCallback, useEffect, useRef, useState } from 'react'

/** What the recorder is doing right now. */
export type RecorderStatus =
  | 'idle'
  | 'requesting'
  | 'recording'
  | 'denied'
  | 'unsupported'
  | 'error'

/** The result of a finished recording. */
export interface Recording {
  /** The recorded audio. */
  blob: Blob
  /** The MIME type of the recorded audio. */
  mimeType: string
}

/** What the hook returns. */
export interface UseAudioRecorderResult {
  /** The current recorder status. */
  status: RecorderStatus
  /** True while audio is being captured. */
  isRecording: boolean
  /** False when the browser cannot record audio. */
  isSupported: boolean
  /** A short message for the user when something went wrong, else null. */
  error: string | null
  /** Asks for the microphone and starts recording. */
  start: () => Promise<void>
  /** Stops recording and resolves with the recording, or null if none. */
  stop: () => Promise<Recording | null>
  /** Stops any recording and throws the captured audio away. */
  cancel: () => void
}

/** Checks for the browser features that recording needs. */
function detectSupport(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.mediaDevices !== 'undefined' &&
    typeof navigator.mediaDevices.getUserMedia === 'function' &&
    typeof MediaRecorder !== 'undefined'
  )
}

/** Stops every track of a stream so the microphone is released. */
function releaseStream(stream: MediaStream | null): void {
  if (stream === null) {
    return
  }
  for (const track of stream.getTracks()) {
    track.stop()
  }
}

/**
 * Wraps the browser MediaRecorder API. Call `start` to ask for the
 * microphone and begin recording, and `stop` to finish and get the audio.
 * The status reports permission denial and unsupported browsers so the
 * caller can fall back to uploading a transcript or typing the answer.
 */
export function useAudioRecorder(): UseAudioRecorderResult {
  const isSupported = detectSupport()
  const [status, setStatus] = useState<RecorderStatus>(
    isSupported ? 'idle' : 'unsupported',
  )
  const [error, setError] = useState<string | null>(null)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      const recorder = recorderRef.current
      if (recorder !== null && recorder.state !== 'inactive') {
        recorder.onstop = null
        recorder.stop()
      }
      recorderRef.current = null
      releaseStream(streamRef.current)
      streamRef.current = null
    }
  }, [])

  const start = useCallback(async () => {
    if (!detectSupport()) {
      setStatus('unsupported')
      setError('Recording is not supported in this browser.')
      return
    }
    if (recorderRef.current !== null) {
      return
    }
    setError(null)
    setStatus('requesting')
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (caught) {
      if (!mountedRef.current) {
        return
      }
      const name = caught instanceof DOMException ? caught.name : ''
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        setStatus('denied')
        setError('Microphone access was blocked. Allow it and try again.')
      } else if (name === 'NotFoundError') {
        setStatus('error')
        setError('No microphone was found.')
      } else {
        setStatus('error')
        setError('The microphone could not be started.')
      }
      return
    }
    if (!mountedRef.current) {
      releaseStream(stream)
      return
    }
    try {
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }
      recorder.start()
      recorderRef.current = recorder
      streamRef.current = stream
      setStatus('recording')
    } catch {
      releaseStream(stream)
      setStatus('error')
      setError('Recording could not be started.')
    }
  }, [])

  const stop = useCallback((): Promise<Recording | null> => {
    const recorder = recorderRef.current
    if (recorder === null || recorder.state === 'inactive') {
      return Promise.resolve(null)
    }
    return new Promise<Recording | null>((resolve) => {
      recorder.onstop = () => {
        const mimeType = recorder.mimeType || 'audio/webm'
        const blob = new Blob(chunksRef.current, { type: mimeType })
        chunksRef.current = []
        releaseStream(streamRef.current)
        streamRef.current = null
        recorderRef.current = null
        if (mountedRef.current) {
          setStatus('idle')
        }
        resolve(blob.size > 0 ? { blob, mimeType } : null)
      }
      recorder.stop()
    })
  }, [])

  const cancel = useCallback(() => {
    const recorder = recorderRef.current
    if (recorder !== null && recorder.state !== 'inactive') {
      recorder.onstop = null
      recorder.stop()
    }
    recorderRef.current = null
    chunksRef.current = []
    releaseStream(streamRef.current)
    streamRef.current = null
    setError(null)
    setStatus(detectSupport() ? 'idle' : 'unsupported')
  }, [])

  return {
    status,
    isRecording: status === 'recording',
    isSupported,
    error,
    start,
    stop,
    cancel,
  }
}