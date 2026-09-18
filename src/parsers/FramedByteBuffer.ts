/** A growable byte buffer that scans only new bytes for a delimiter. */
export class FramedByteBuffer {
  private bytes = new Uint8Array(256);
  private used = 0;
  private scanFrom = 0;

  get length(): number {
    return this.used;
  }

  append(chunk: Uint8Array): void {
    const required = this.used + chunk.length;
    if (required > this.bytes.length) {
      const next = new Uint8Array(Math.max(required, this.bytes.length * 2));
      next.set(this.bytes.subarray(0, this.used));
      this.bytes = next;
    }
    this.bytes.set(chunk, this.used);
    this.used = required;
  }

  nextIndex(delimiter: Uint8Array): number {
    outer: for (let i = this.scanFrom; i <= this.used - delimiter.length; i++) {
      for (let j = 0; j < delimiter.length; j++) {
        if (this.bytes[i + j] !== delimiter[j]) continue outer;
      }
      return i;
    }
    this.scanFrom = Math.max(0, this.used - delimiter.length + 1);
    return -1;
  }

  slice(end: number): Uint8Array {
    return this.bytes.slice(0, end);
  }

  consume(count: number): void {
    this.bytes.copyWithin(0, count, this.used);
    this.used -= count;
    this.scanFrom = 0;
  }

  reset(): void {
    this.used = 0;
    this.scanFrom = 0;
    if (this.bytes.length > 256) this.bytes = new Uint8Array(256);
  }
}
