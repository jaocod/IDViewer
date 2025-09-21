import * as FileSystem from "expo-file-system/legacy";
import { useLocalSearchParams } from "expo-router";
import * as Sharing from "expo-sharing";
import React from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import ImageViewer from "react-native-image-zoom-viewer";
import Pdf from "react-native-pdf";

const { width, height } = Dimensions.get("window");
export default function Viewer() {
  const params = useLocalSearchParams();
  const uri = params.uri as string;
  const [loading, setLoading] = React.useState(true);

  if (!uri) {
    return (
      <View style={styles.center}>
        {" "}
        <Text>Nenhum documento selecionado.</Text>{" "}
      </View>
    );
  }
  // decodifica URI
  const fileUri = decodeURIComponent(uri);

  const images = [
    {
      url: fileUri,
      props: {
        onLoadEnd: () => setLoading(false),
        onError: () => {
          Alert.alert("Erro", "Falha ao carregar a imagem.");
          setLoading(false);
        },
      },
    },
  ];

  // pega extensão do arquivo
  const extension = fileUri.split('.').pop()?.toLowerCase() ?? '';

  async function shareFile() {
    try {
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert(
          "Erro",
          "Compartilhamento não disponível neste dispositivo."
        );
        return;
      }
      await Sharing.shareAsync(fileUri);
    } catch (err) {
      console.error("Erro ao compartilhar:", err);
      Alert.alert("Erro", "Não foi possível compartilhar o arquivo.");
    }
  }

  async function downloadFile() {
    try {
      const dest = `${FileSystem.documentDirectory ?? ""}${
        fileUri.split("/").pop() ?? "arquivo"
      }`;

      await FileSystem.copyAsync({ from: fileUri, to: dest });
      Alert.alert("Sucesso", `Arquivo salvo em: ${dest}`);
    } catch (err) {
      console.error("Erro ao baixar:", err);
      Alert.alert("Erro", "Não foi possível salvar o arquivo.");
    }
  }

  const ActionsBar = () => (
    <View style={styles.actions}>
      <TouchableOpacity onPress={shareFile}>
        <Text style={styles.shareButton}>Compartilhar</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={downloadFile}>
        <Text style={styles.downloadButton}>Baixar</Text>
      </TouchableOpacity>
    </View>
  );

  // imagens
  // 🔁 Render principal com base na extensão
  if (["jpg", "jpeg", "png", "webp", "heic"].includes(extension ?? "")) {
    return (
      <View style={styles.container}>
        <ActionsBar />
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        )}
        <ImageViewer
          imageUrls={images}
          backgroundColor="#000"
          enableSwipeDown={true}
          onSwipeDown={() => console.log("Swipe down to close")}
          saveToLocalByLongPress={false}
        />
      </View>
    );
  }

  if (extension === "pdf") {
    return (
      <View style={styles.container}>
        <ActionsBar />
        <Pdf source={{ uri: fileUri, cache: true }} style={styles.pdf} />
      </View>
    );
  }
  // Word/Excel:
  //Google Docs Viewer requires a public URL; local file won't load

  if (["doc", "docx", "xls", "xlsx"].includes(extension ?? "")) {
   async function openWithExternalApp(fileUri: string) {
  try {
    const isAvailable = await Sharing.isAvailableAsync();
    const mimeType = getMimeType(extension);

    if (!isAvailable) {
      Alert.alert("Erro", "Compartilhamento não disponível neste dispositivo.");
      return;
    }

    // Isso abre a tela do sistema para escolher o app para abrir o arquivo
    await Sharing.shareAsync(fileUri, {
      mimeType,
      dialogTitle: "Abrir com...",
    });
  } catch (error) {
    console.error("Erro ao abrir arquivo:", error);
    Alert.alert("Erro", "Não foi possível abrir o arquivo.");
  }
}

    return (
      <View style={styles.center}>
        <ActionsBar />
        <Text style={{ marginBottom: 12, textAlign: "center" }}>
          Este é um arquivo do Office: {fileUri.split("/").pop()}
        </Text>
        <TouchableOpacity
          onPress={() => openWithExternalApp(fileUri)}
          style={{
            padding: 12,
            backgroundColor: "#007bff",
            borderRadius: 8,
          }}
        >
          <Text style={{ color: "#fff" }}>Abrir com aplicativo externo</Text>
        </TouchableOpacity>
      </View>
    );
  }
  // caso não reconheça
  return (
    <View style={styles.center}>
      <ActionsBar />{" "}
      <Text>Não foi possível visualizar este tipo de arquivo.</Text>{" "}
      <Text>Extensão: {extension}</Text>{" "}
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  image: {
    width,
    height,
    marginTop: 40,
  },
  pdf: {
    flex: 1,
    width,
    height,
    backgroundColor: "#000",
    marginTop: 40,
  },
  actions: {
    position: "absolute",
    top: 0,
    right: 0,
    left: 0,
    flexDirection: "row",
    justifyContent: "flex-end",
    padding: 8,
    backgroundColor: "rgba(0,0,0,0.6)", // transparente elegante
    zIndex: 10,
  },
  shareButton: {
    color: "#007bff",
    marginLeft: 16,
  },
  downloadButton: {
    color: "green",
    marginLeft: 16,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 99,
  },
});

function getMimeType(extension: string) {
  switch (extension.toLowerCase()) {
    case "doc":
      return "application/msword";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "xls":
      return "application/vnd.ms-excel";
    case "xlsx":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    case "pdf":
      return "application/pdf";
    case "ppt":
      return "application/vnd.ms-powerpoint";
    case "pptx":
      return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    case "txt":
      return "text/plain";
    case "rtf":
      return "application/rtf";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "gif":
      return "image/gif";
    case "mp4":
      return "video/mp4";
    case "mp3":
      return "audio/mpeg";
    case "csv":
      return "text/csv";
    default:
      return "application/octet-stream"; // tipo genérico
  }
}
