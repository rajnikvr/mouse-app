import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  PanResponder,
  TouchableOpacity,
  Text,
  TextInput,
  StatusBar,
  Alert
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

let socket: WebSocket | null = null;

export default function App() {
  const [connected, setConnected] = useState(false);
  const [ip, setIp] = useState(null);
  const [inputIp, setInputIp] = useState("");

  // Load saved IP on startup
  useEffect(() => {
    StatusBar.setHidden(true, "fade");
    setIp(null); // force asking every time
  }, []);

  // Connect to socket when IP is set
  useEffect(() => {
    if (!ip) return;

    try {
      socket = new WebSocket(`wss://${ip}`);

      socket.onopen = () => {
        setConnected(true);
        Alert.alert("Connected", `Connected to wss://${ip}`);
      };

      socket.onclose = (e) => {
        setConnected(false);
        Alert.alert("Disconnected", JSON.stringify(e));
      };

      socket.onerror = (err) => {
        Alert.alert("WebSocket Error", JSON.stringify(err));
      };
    } catch (e) {
      Alert.alert("Exception", String(e));
    }

    return () => {
      if (socket) socket.close();
    };
  }, [ip]);


  const SPEED_FACTOR = 0.3;

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: (_, gesture) => {
      if (connected && socket) {
        socket.send(
          JSON.stringify({
            type: "move",
            dx: gesture.dx * SPEED_FACTOR,
            dy: gesture.dy * SPEED_FACTOR,
          })
        );
      }
    },
    onPanResponderRelease: (_, gesture) => {
      if (connected && socket) {
        if (Math.abs(gesture.dx) < 5 && Math.abs(gesture.dy) < 5) {
          socket.send(JSON.stringify({ type: "click" }));
        }
      }
    },
  });

  const send = (msg: object) => {
    try {
      if (connected && socket) {
        socket.send(JSON.stringify(msg));
      } else {
        Alert.alert("Error", "Not connected to server");
      }
    } catch (e) {
      Alert.alert("Send Error", String(e));
    }
  };

  // Save IP and connect
  const saveIpAndConnect = async () => {
    if (!inputIp) {
      Alert.alert("Error", "Please enter a valid IP");
      return;
    }
    await AsyncStorage.setItem("server_ip", inputIp);
    Alert.alert("Saved", `IP set to ${inputIp}`);
    setIp(inputIp);
  };


  // If no IP yet, show input screen
  if (!ip) {
    return (
      <View style={styles.setupContainer}>
        <Text style={styles.setupText}>Enter your PC IP Address:</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter you NGROK IP here"
          placeholderTextColor="#777"
          value={inputIp}
          onChangeText={setInputIp}
        />
        <TouchableOpacity style={styles.saveButton} onPress={saveIpAndConnect}>
          <Text style={styles.saveText}>Save & Connect</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Touchpad Area */}
      <View style={styles.touchpad} {...panResponder.panHandlers} />

      {/* Buttons Area */}
      <View style={styles.buttonsContainer}>
        {/* Top Button */}
        <TouchableOpacity
          style={styles.button}
          onPress={() => send({ type: "scroll", amount: -100 })}
        >
          <Text style={styles.text}>↑</Text>
        </TouchableOpacity>

        {/* Middle Row */}
        <View style={styles.middleRow}>
          <TouchableOpacity
            style={styles.button}
            onPress={() => send({ type: "click" })}
          >
            <Text style={styles.text}>◀</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={() => send({ type: "rightClick" })}
          >
            <Text style={styles.text}>▶</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Button */}
        <TouchableOpacity
          style={styles.button}
          onPress={() => send({ type: "scroll", amount: 100 })}
        >
          <Text style={styles.text}>↓</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const BUTTON_SIZE = 110;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  setupContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
    padding: 20,
  },
  setupText: {
    color: "#fff",
    fontSize: 20,
    marginBottom: 20,
  },
  input: {
    width: "80%",
    borderWidth: 1,
    borderColor: "#555",
    borderRadius: 10,
    padding: 12,
    color: "#fff",
    marginBottom: 20,
    backgroundColor: "#111",
    textAlign: "center",
  },
  saveButton: {
    backgroundColor: "#333",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  saveText: {
    color: "#fff",
    fontSize: 18,
  },
  touchpad: {
    flex: 3,
    backgroundColor: "#111",
    margin: 12,
    height: 1000,
    borderRadius: 12,
  },
  buttonsContainer: {
    flex: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  middleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: BUTTON_SIZE * 3 + 40,
  },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    backgroundColor: "#333",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 16,
    margin: 10,
  },
  text: {
    color: "#fff",
    fontSize: 48,
    fontWeight: "bold",
  },
});
