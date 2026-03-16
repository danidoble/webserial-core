/**
 * @file CommandQueue.ts
 *
 * FIFO command queue for serial communication. Commands are sent one at a
 * time; the next command is held until the caller invokes `advance()` (e.g.
 * on receiving a response) or the per-command timeout elapses.
 *
 * Setting `commandTimeout` to `0` disables the timeout and sends commands
 * back-to-back as fast as the port allows.
 */

/** Options for constructing a {@link CommandQueue}. */
export interface CommandQueueOptions {
  /**
   * Maximum time in milliseconds to wait for a response before advancing.
   * Set to `0` to disable per-command timeouts.
   */
  commandTimeout: number;
  /**
   * Called when the queue is ready to transmit the next command.
   * Must write the bytes to the physical port.
   *
   * @param command - The raw bytes to send.
   */
  onSend: (command: Uint8Array) => Promise<void>;
  /**
   * Called when a command's timeout elapses before `advance()` is invoked.
   *
   * @param command - The command that timed out.
   */
  onTimeout: (command: Uint8Array) => void;
}

/**
 * FIFO queue that serializes serial commands, optionally waiting for a
 * response (or timeout) between each transmission.
 */
export class CommandQueue {
  private queue: Uint8Array[] = [];
  /** `true` while the queue is waiting for a response to the current command. */
  public isProcessing: boolean = false;
  private isPaused: boolean = true;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private readonly commandTimeout: number;

  private readonly onSend: (command: Uint8Array) => Promise<void>;
  private readonly onTimeout: (command: Uint8Array) => void;

  /**
   * @param options - Queue configuration. See {@link CommandQueueOptions}.
   */
  constructor(options: CommandQueueOptions) {
    this.commandTimeout = options.commandTimeout;
    this.onSend = options.onSend;
    this.onTimeout = options.onTimeout;
  }

  /**
   * The number of commands currently waiting in the queue.
   */
  public get queueSize(): number {
    return this.queue.length;
  }

  /**
   * Adds a command to the end of the queue and triggers processing
   * if the queue is running and idle.
   *
   * @param command - Raw bytes to enqueue.
   */
  public enqueue(command: Uint8Array): void {
    this.queue.push(command);
    this.tryProcessNext();
  }

  /**
   * Signals that a response has been received (or processing is otherwise
   * complete) and advances to the next command.
   *
   * Call this after each expected response to keep the queue moving.
   */
  public advance(): void {
    this.clearCommandTimeout();
    this.isProcessing = false;
    this.tryProcessNext();
  }

  /**
   * Pauses the queue. In-flight commands are not cancelled, but no new
   * command will be dequeued until `resume()` is called.
   */
  public pause(): void {
    this.isPaused = true;
    this.clearCommandTimeout();
    this.isProcessing = false;
  }

  /**
   * Resumes a paused queue and immediately processes the next command
   * if one is available.
   */
  public resume(): void {
    this.isPaused = false;
    this.tryProcessNext();
  }

  /**
   * Discards all pending commands and cancels any active timeout.
   * Does not affect the paused/running state.
   */
  public clear(): void {
    this.queue = [];
    this.clearCommandTimeout();
    this.isProcessing = false;
  }

  /**
   * Returns a shallow copy of the current queue contents, leaving the
   * queue unchanged.
   *
   * @returns A snapshot array of pending commands.
   */
  public snapshot(): Uint8Array[] {
    return [...this.queue];
  }

  /**
   * Prepends a previously saved snapshot to the current queue.
   * Useful for restoring commands after a failed handshake.
   *
   * @param saved - Commands to prepend.
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

    if (this.commandTimeout > 0) {
      this.timeoutId = setTimeout(() => {
        this.timeoutId = null;
        this.onTimeout(command);
        // Advance so the queue does not stall indefinitely on timeout
        this.advance();
      }, this.commandTimeout);
    }

    this.onSend(command).catch(() => {
      // If send fails, advance to avoid blocking the queue indefinitely
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
