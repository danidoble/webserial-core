export class SerialEvent extends CustomEvent<SerialEvent> implements CustomEvent {
  constructor(type: string, options: CustomEventInit) {
    super(type, options);
  }
}
