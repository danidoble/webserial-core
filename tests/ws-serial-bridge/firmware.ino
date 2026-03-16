void setup() {
  Serial.begin(9600);
}

void loop() {
  if (Serial.available() > 0) { // Check if data to read is available
    String comando = Serial.readStringUntil('\n'); // read the data until a new line is found
    comando.trim(); // remove leading/trailing whitespace and \r characters

    if(comando == "CONNECT"){
      Serial.println("connected");
    } else if (comando == "CREDITS") {
      Serial.println("created by danidoble");
    } else if (comando == "HI") {
      Serial.println("hello there");
    } else {
      Serial.println("ara ara, what are you doing?");
    }
  }
}