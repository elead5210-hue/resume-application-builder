/**
 * Client-side speech-to-text for a recorded answer.
 *
 * The browser's SpeechRecognition API is the only transcription available
 * without a server. Recent browsers let it listen to an audio track instead of
 * the microphone, so the recording is played silently into a track and
 * recognised from there. Browsers without that support report the result as
 * unavailable, and the caller falls back to the transcript upload or the
 * manual text box.
 */

/** The outcome of a transcription attempt. */
export type TranscribeResult =
  | { status: 'ok'; text: string }
  | { status: 'unavailable'; reason: string }

interface RecognitionAlternativeLike {
  transcript: string
}

interface RecognitionResultLike {
  isFinal: boolean
  length: number
  [index: number]: RecognitionAlternativeLike
}

interface RecognitionEventLike {
  resultIndex: number
  results: ArrayLike<RecognitionResultLike>
}

interface RecognitionErrorEventLike {
  error: string
}

interface RecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: RecognitionEventLike) => void) | null
  onerror: ((event: RecognitionErrorEventLike) => void) | null
  onend: (() => void) | null
  start: (track?: MediaStreamTrack) => void
  stop: () => void
  abort: () => void
}

type RecognitionConstructor = new () => RecognitionLike

interface CapturableAudio extends HTMLAudioElement {
  captureStream?: () => MediaStream
  mozCaptureStream?: () => MediaStream
}

/** Options for a transcription attempt. */
export interface TranscribeOptions {
  /** BCP 47 language tag for recognition. Defaults to the browser language. */
  lang?: string
}

const UNAVAILABLE_MESSAGE =
  'Automatic transcription is not available in this browser. Upload a transcript file or type your answer instead.'

function unavailable(reason: string = UNAVAILABLE_MESSAGE): TranscribeResult {
  return { status: 'unavailable', reason }
}

/** Finds the browser's SpeechRecognition constructor, if there is one. */
function getRecognitionConstructor(): RecognitionConstructor | null {
  if (typeof window === 'undefined') {
    return null
  }
  const scope = window as unknown as {
    SpeechRecognition?: RecognitionConstructor
    webkitSpeechRecognition?: RecognitionConstructor
  }
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null
}

/** True when the browser has speech recognition at all. */
export function isTranscriptionSupported(): boolean {
  return (
    getRecognitionConstructor() !== null &&
    typeof Audio !== 'undefined' &&
    typeof URL !== 'undefined' &&
    typeof URL.createObjectURL === 'function'
  )
}

/** Turns the recognition results into one trimmed piece of text. */
function collectText(results: ArrayLike<RecognitionResultLike>): string {
  const parts: string[] = []
  for (let index = 0; index < results.length; index += 1) {
    const result = results[index]
    if (result.isFinal && result.length > 0) {
      parts.push(result[0].transcript.trim())
    }
  }
  return parts.filter((part) => part !== '').join(' ')
}

/**
 * Transcribes a recorded audio blob in the browser. Resolves with the text,
 * or with an "unavailable" result when the browser cannot do it, so the
 * caller can show the fallback options. It never rejects.
 */
export async function transcribeAudio(
  blob: Blob,
  options: TranscribeOptions = {},
): Promise<TranscribeResult> {
  const Recognition = getRecognitionConstructor()
  if (Recognition === null || !isTranscriptionSupported()) {
    return unavailable()
  }

  const audio: CapturableAudio = new Audio()
  const capture = audio.captureStream ?? audio.mozCaptureStream
  if (typeof capture !== 'function') {
    return unavailable()
  }

  const url = URL.createObjectURL(blob)

  return new Promise<TranscribeResult>((resolve) => {
    let settled = false
    let recognition: RecognitionLike | null = null
    let finalText = ''
    let failure: string | null = null

    const finish = (result: TranscribeResult) => {
      if (settled) {
        return
      }
      settled = true
      audio.pause()
      audio.removeAttribute('src')
      URL.revokeObjectURL(url)
      resolve(result)
    }

    const finishFromRecognition = () => {
      if (failure !== null) {
        finish(unavailable(failure))
        return
      }
      const text = finalText.trim()
      if (text === '') {
        finish(
          unavailable(
            'No speech could be recognised in the recording. Upload a transcript file or type your answer instead.',
          ),
        )
        return
      }
      finish({ status: 'ok', text })
    }

    audio.muted = true
    audio.src = url

    audio.onerror = () => {
      finish(unavailable('The recording could not be played back for transcription.'))
    }

    audio.onended = () => {
      // Give the recogniser a moment to deliver its last results.
      window.setTimeout(() => {
        recognition?.stop()
      }, 500)
    }

    audio.onloadedmetadata = () => {
      try {
        const stream = capture.call(audio)
        const track = stream.getAudioTracks()[0]
        if (track === undefined) {
          finish(unavailable())
          return
        }

        recognition = new Recognition()
        recognition.lang =
          options.lang ??
          (typeof navigator !== 'undefined' ? navigator.language : 'en-US')
        recognition.continuous = true
        recognition.interimResults = false

        recognition.onresult = (event) => {
          finalText = collectText(event.results)
        }
        recognition.onerror = (event) => {
          if (event.error === 'no-speech' || event.error === 'aborted') {
            return
          }
          failure = UNAVAILABLE_MESSAGE
        }
        recognition.onend = finishFromRecognition

        // Passing a track is not supported everywhere; a browser that
        // ignores it would listen to the microphone instead, so only the
        // error path below is trusted to detect that.
        recognition.start(track)
        audio.play().catch(() => {
          recognition?.abort()
          finish(unavailable('The recording could not be played back for transcription.'))
        })
      } catch {
        finish(unavailable())
      }
    }
  })
}