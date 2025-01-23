export class SerialEvent extends CustomEvent<SerialEvent> {
  constructor(type: string, options: CustomEventInit) {
    super(type, options);
  }
}
