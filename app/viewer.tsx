import * as FileSystem from "expo-file-system";
import { useLocalSearchParams } from "expo-router";
import * as Sharing from "expo-sharing";
import React from "react";
import {
  Alert,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import ImageViewer from 'react-native-image-zoom-viewer';
import Pdf from "react-native-pdf";

const { width, height } = Dimensions.get("window");
export default function Viewer() {
  const params = useLocalSearchParams();
  const uri = params.uri as string;

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
    url: '', // vazio aqui
    props: {
      source: {
        uri: fileUri,
      },
    },
  },
];
  // pega extensão do arquivo
  const extension = fileUri.split(".").pop()?.toLowerCase();

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
      const dest = `${
        (FileSystem as any).cacheDirectory ??
        (FileSystem as any).documentDirectory ??
        ""
      }${name ?? fileUri.split("/").pop() ?? "arquivo"}`;

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
  if (["jpg", "jpeg", "png", "webp"].includes(extension ?? "")) {
    return (
      <View style={styles.container}>
    <ActionsBar />
    <ImageViewer
      imageUrls={images}
      backgroundColor="#000"
      enableSwipeDown={true}
      onSwipeDown={() => console.log('Swipe down to close (implementar se quiser)')}
      saveToLocalByLongPress={false} // já tem botão de download separado
    />
      </View>
    );
  } // PDFs offline via native PDF renderer
  if (extension === "pdf") {
    return (
      <View style={styles.container}>
        <ActionsBar /> <Pdf source={{ uri: fileUri, cache: true }} style={styles.pdf} />
      </View>
    );
  } // Word/Excel:
  //Google Docs Viewer requires a public URL; local file won't load
  if (["doc", "docx", "xls", "xlsx"].includes(extension ?? "")) {
    return (
      <View style={styles.center}>
        <ActionsBar />{" "}
        <Text>Arquivos Office locais não podem ser abertos diretamente.</Text>{" "}
        <Text style={{ marginTop: 8, textAlign: "center" }}>
          {" "}
          Envie o arquivo para a nuvem e abra via link público, ou converta para
          PDF.{" "}
        </Text>{" "}
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
});
