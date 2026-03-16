export class CommandQueue {
  private queue: Uint8Array[] = [];
  public isProcessing: boolean = false;
  private isPaused: boolean = true;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private readonly commandTimeout: number;

  private onSend: (command: Uint8Array) => Promise<void>;
  private onTimeout: (command: Uint8Array) => void;

  constructor(options: {
    commandTimeout: number;
    onSend: (command: Uint8Array) => Promise<void>;
    onTimeout: (command: Uint8Array) => void;
  }) {
    this.commandTimeout = options.commandTimeout;
    this.onSend = options.onSend;
    this.onTimeout = options.onTimeout;
  }

  public get queueSize(): number {
    return this.queue.length;
  }

  public enqueue(command: Uint8Array): void {
    this.queue.push(command);
    this.tryProcessNext();
  }

  /**
   * Called to advance the queue (e.g. after receiving a response).
   */
  public advance(): void {
    this.clearCommandTimeout();
    this.isProcessing = false;
    this.tryProcessNext();
  }

  public pause(): void {
    this.isPaused = true;
    this.clearCommandTimeout();
    this.isProcessing = false;
  }

  public resume(): void {
    this.isPaused = false;
    this.tryProcessNext();
  }

  public clear(): void {
    this.queue = [];
    this.clearCommandTimeout();
    this.isProcessing = false;
  }

  /**
   * Takes a snapshot of the current queue contents without modifying the queue.
   */
  public snapshot(): Uint8Array[] {
    return [...this.queue];
  }

  /**
   * Restores a previously saved snapshot by prepending it to the current queue.
   */
  public restore(saved: Uint8Array[]): void {
    this.queue = [...saved, ...this.queue];
  }

  private tryProcessNext(): void {
    if (this.isPaused || this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const command = this.queue.shift()!;

    // Start timeout if configured
    if (this.commandTimeout > 0) {
      this.timeoutId = setTimeout(() => {
        this.timeoutId = null;
        this.onTimeout(command);
        // Timeout advances the queue
        this.advance();
      }, this.commandTimeout);
    }

    // Attempt to send
    this.onSend(command).catch(() => {
      // If send fails we advance so we don't block the queue forever
      this.advance();
    });
  }

  private clearCommandTimeout(): void {
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}
