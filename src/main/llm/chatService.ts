import { streamText, type LanguageModel } from 'ai'
import type { ChatSession } from './chatSession'
import type { StreamEvent } from './types'

export type ModelFactory = () => LanguageModel

export class ChatService {
  constructor(
    private readonly session: ChatSession,
    private readonly modelFactory: ModelFactory,
  ) {}

  async *send(userText: string, signal?: AbortSignal): AsyncIterable<StreamEvent> {
    let model: LanguageModel
    try {
      model = this.modelFactory()
    } catch (err) {
      yield { type: 'error', message: (err as Error).message }
      return
    }

    this.session.pushUser(userText)
    const snap = this.session.snapshot()

    let fullText = ''
    try {
      const result = streamText({
        model,
        system: snap.system,
        messages: snap.messages,
        abortSignal: signal,
      })
      for await (const delta of result.textStream) {
        fullText += delta
        yield { type: 'delta', text: delta }
      }
      this.session.pushAssistant(fullText)
      yield { type: 'done', fullText }
    } catch (err) {
      yield { type: 'error', message: (err as Error).message }
    }
  }
}
