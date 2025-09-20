import { ResizeMode, Video } from "expo-av";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import ImageViewing from "react-native-image-viewing";

const { width, height } = Dimensions.get("window");

type DocItem = {
  name: string;
  uri: string;
};

export default function Home() {
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocItem | null>(null);
  const router = useRouter();
  const [imageViewerVisible, setImageViewerVisible] = useState(false);

  // função pra pegar o diretório local
  async function getDocsDir() {
    const base = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;
    return base + "docs/";
  }

  // carregar os arquivos já salvos
  async function loadDocs() {
    try {
      const docsDir = await getDocsDir();
      const files = await FileSystem.readDirectoryAsync(docsDir).catch(
        () => []
      );
      const list: DocItem[] = files.map((file) => ({
        name: file,
        uri: docsDir + file,
      }));
      setDocs(list);
    } catch (err) {
      console.error("Erro ao carregar documentos:", err);
    }
  }

  // adicionar arquivo
  async function addFile() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        multiple: false,
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const asset = result.assets?.[0];
      if (!asset || !asset.uri) {
        Alert.alert("Erro", "Nenhum arquivo foi selecionado.");
        return;
      }

      const docsDir = await getDocsDir();
      const dirInfo = await FileSystem.getInfoAsync(docsDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(docsDir, { intermediates: true });
      }

      // Deriva nome e garante que não conflite com arquivos existentes
      const originalName =
        asset.name ?? asset.uri.split("/").pop()?.split("?")[0] ?? "arquivo";

      async function getUniquePath(
        baseDir: string,
        name: string
      ): Promise<{ path: string; name: string }> {
        const parts = name.split(".");
        const ext = parts.length > 1 ? "." + parts.pop() : "";
        const base = parts.join(".") || "arquivo";
        let attempt = 0;
        while (true) {
          const candidateName =
            attempt === 0 ? `${base}${ext}` : `${base} (${attempt})${ext}`;
          const candidatePath = baseDir + candidateName;
          const info = await FileSystem.getInfoAsync(candidatePath);
          if (!info.exists) {
            return { path: candidatePath, name: candidateName };
          }
          attempt++;
        }
      }

      const { path: destUri, name: finalName } = await getUniquePath(
        docsDir,
        originalName
      );

      await FileSystem.copyAsync({
        from: asset.uri,
        to: destUri,
      });

      const newDoc = { name: finalName, uri: destUri };
      setDocs((prev) => [...prev, newDoc]);
    } catch (err: any) {
      console.error("Erro ao adicionar arquivo:", err);
      const message =
        typeof err?.message === "string"
          ? err.message
          : "Não foi possível adicionar o arquivo.";
      Alert.alert("Erro", message);
    }
  }

  // apagar arquivo
  async function deleteFile(file: DocItem) {
    try {
      await FileSystem.deleteAsync(file.uri);
      setDocs((prev) => prev.filter((d) => d.uri !== file.uri));

      // Se o arquivo deletado era o selecionado, limpa a seleção
      if (selectedDoc?.uri === file.uri) {
        setSelectedDoc(null);
      }
    } catch (err) {
      console.error("Erro ao apagar arquivo:", err);
    }
  }

  async function shareFile(file: DocItem) {
    try {
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert(
          "Erro",
          "Compartilhamento não disponível neste dispositivo."
        );
        return;
      }
      await Sharing.shareAsync(file.uri);
    } catch (err) {
      console.error("Erro ao compartilhar:", err);
      Alert.alert("Erro", "Não foi possível compartilhar o arquivo.");
    }
  }

  async function downloadFile(file: DocItem) {
    try {
      const dest = FileSystem.cacheDirectory + file.name;
      await FileSystem.copyAsync({ from: file.uri, to: dest });
      Alert.alert("Sucesso", `Arquivo salvo em: ${dest}`);
    } catch (err) {
      console.error("Erro ao baixar:", err);
      Alert.alert("Erro", "Não foi possível salvar o arquivo.");
    }
  }

  // função para obter o tipo de arquivo
  function getFileType(uri: string): string {
    const extension = uri.split(".").pop()?.toLowerCase();

    if (
      ["jpg", "jpeg", "png", "webp", "gif", "bmp"].includes(extension ?? "")
    ) {
      return "Imagem";
    } else if (extension === "pdf") {
      return "PDF";
    } else if (["doc", "docx"].includes(extension ?? "")) {
      return "Word";
    } else if (["xls", "xlsx"].includes(extension ?? "")) {
      return "Excel";
    } else if (["mp4", "mov", "avi", "mkv", "webm"].includes(extension ?? "")) {
      return "Vídeo";
    } else if (["mp3", "wav", "aac", "flac", "ogg"].includes(extension ?? "")) {
      return "Áudio";
    } else if (["txt", "md", "rtf"].includes(extension ?? "")) {
      return "Texto";
    } else if (["zip", "rar", "7z"].includes(extension ?? "")) {
      return "Arquivo";
    } else {
      return extension?.toUpperCase() ?? "Arquivo";
    }
  }

  // função para renderizar miniatura
  function renderThumbnail(doc: DocItem) {
    const extension = doc.uri.split(".").pop()?.toLowerCase();

    // Para imagens, mostra a miniatura
    if (
      ["jpg", "jpeg", "png", "webp", "gif", "bmp"].includes(extension ?? "")
    ) {
      return (
        <Image
          source={{ uri: doc.uri }}
          style={styles.thumbnailImage}
          resizeMode="cover"
        />
      );
    }

    // Para outros tipos, mostra ícone baseado na extensão
    return (
      <View style={styles.thumbnailIcon}>
        <Text style={styles.thumbnailIconText}>
          {extension === "pdf"
            ? "📄"
            : ["doc", "docx"].includes(extension ?? "")
            ? "📝"
            : ["xls", "xlsx"].includes(extension ?? "")
            ? "📊"
            : ["mp4", "mov", "avi", "mkv", "webm"].includes(extension ?? "")
            ? "🎬"
            : ["mp3", "wav", "aac", "flac", "ogg"].includes(extension ?? "")
            ? "🎵"
            : ["txt", "md", "rtf"].includes(extension ?? "")
            ? "📄"
            : ["zip", "rar", "7z"].includes(extension ?? "")
            ? "📦"
            : "📁"}
        </Text>
      </View>
    );
  }

  

  // função para renderizar o documento selecionado
  function renderDocument(doc: DocItem) {
    const extension = doc.uri.split(".").pop()?.toLowerCase();

    // imagens
    if (
      ["jpg", "jpeg", "png", "webp", "gif", "bmp"].includes(extension ?? "")
    ) {
      return (
        <View style={styles.documentContainer}>
          <TouchableOpacity
            style={{ flex: 1 }}
            onPress={() => setImageViewerVisible(true)}
          >
            <Image
              source={{ uri: doc.uri }}
              style={{ width: "100%", height: "100%" }}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>
      );
    }

    // vídeos
    if (["mp4", "mov", "avi", "mkv", "webm"].includes(extension ?? "")) {
      return (
        <View style={styles.documentContainer}>
          <Video
            source={{ uri: doc.uri }}
            style={styles.documentVideo}
            useNativeControls
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay={false}
          />
        </View>
      );
    }

    // áudios
    if (["mp3", "wav", "aac", "flac", "ogg"].includes(extension ?? "")) {
      return (
        <View style={styles.documentContainer}>
          <Video
            source={{ uri: doc.uri }}
            style={styles.documentAudio}
            useNativeControls
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay={false}
          />
        </View>
      );
    }

    // arquivos de texto
    if (["txt", "md", "rtf"].includes(extension ?? "")) {
      return (
        <View style={styles.documentContainer}>
          <ScrollView style={styles.textContainer}>
            <Text style={styles.textContent}>{doc.name}</Text>
            <Text style={styles.textSubtext}>
              Arquivo de texto detectado. Para visualizar o conteúdo, use um
              editor de texto.
            </Text>
          </ScrollView>
        </View>
      );
    }

    // PDFs - redireciona para a tela viewer
    if (selectedDoc && selectedDoc.uri.endsWith(".pdf")) {
      return (
        <View>
          <Text>Abrindo PDF...</Text>
        </View>
      );
    }

    // Word/Excel
    if (["doc", "docx", "xls", "xlsx"].includes(extension ?? "")) {
      return (
        <View style={styles.documentContainer}>
          <View style={styles.unsupportedContainer}>
            <Text style={styles.unsupportedText}>
              Arquivos Office locais não podem ser abertos diretamente.
            </Text>
            <Text style={styles.unsupportedSubtext}>
              Envie o arquivo para a nuvem e abra via link público, ou converta
              para PDF.
            </Text>
          </View>
        </View>
      );
    }

    // arquivos compactados
    if (["zip", "rar", "7z"].includes(extension ?? "")) {
      return (
        <View style={styles.documentContainer}>
          <View style={styles.unsupportedContainer}>
            <Text style={styles.unsupportedText}>
              Arquivo compactado: {doc.name}
            </Text>
            <Text style={styles.unsupportedSubtext}>
              Use um aplicativo de descompactação para extrair o conteúdo.
            </Text>
          </View>
        </View>
      );
    }

    // caso não reconheça
    return (
      <View style={styles.documentContainer}>
        <View style={styles.unsupportedContainer}>
          <Text style={styles.unsupportedText}>
            Não foi possível visualizar este tipo de arquivo.
          </Text>
          <Text style={styles.unsupportedSubtext}>Extensão: {extension}</Text>
        </View>
      </View>
    );
  }

  useEffect(() => {
    loadDocs();
  }, []);

  useEffect(() => {
    if (selectedDoc && selectedDoc.uri.endsWith(".pdf")) {
      router.push({
        pathname: "/viewer",
        params: { uri: encodeURIComponent(selectedDoc.uri) },
      });
    }
  }, [selectedDoc]);

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.addButton} onPress={addFile}>
        <Text style={styles.addButtonText}>+ Adicionar Documento</Text>
      </TouchableOpacity>

      {selectedDoc ? (
        <View style={styles.viewerContainer}>
          <View style={styles.viewerHeader}>
            <Text style={styles.viewerTitle}>{selectedDoc.name}</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                setSelectedDoc(null);
                router.replace("/"); // <-- volta para a página inicial
              }}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          {renderDocument(selectedDoc)}
          <ImageViewing
            images={[{ uri: selectedDoc?.uri ?? "" }]}
            imageIndex={0}
            visible={imageViewerVisible}
            onRequestClose={() => setImageViewerVisible(false)}
            swipeToCloseEnabled
          />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {docs.map((item) => (
            <View key={item.uri} style={styles.item}>
              <TouchableOpacity
                style={styles.itemContent}
                onPress={() => setSelectedDoc(item)}
              >
                <View style={styles.thumbnailContainer}>
                  {renderThumbnail(item)}
                </View>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemText} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <Text style={styles.itemType}>{getFileType(item.uri)}</Text>
                </View>
              </TouchableOpacity>
              <View style={styles.actionsRow}>
                <TouchableOpacity onPress={() => shareFile(item)}>
                  <Text style={styles.shareButton}>Compartilhar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => downloadFile(item)}>
                  <Text style={styles.downloadButton}>Baixar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteFile(item)}>
                  <Text style={styles.deleteButton}>Excluir</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    padding: 16,
  },
  addButton: {
    backgroundColor: "#007bff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  addButtonText: {
    color: "#fff",
    textAlign: "center",
    fontSize: 16,
  },
  scrollContainer: {
    flex: 1,
  },
  item: {
    padding: 10,
    marginVertical: 6,
    backgroundColor: "#ffffffff",
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  thumbnail: {
    width: 40,
    height: 40,
    marginRight: 10,
  },
  itemText: {
    flex: 1,
    color: "#3f3f3fff",
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 6,
  },
  itemContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  thumbnailContainer: {
    width: 60,
    height: 60,
    marginRight: 12,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  thumbnailImage: {
    width: "100%",
    height: "100%",
  },
  thumbnailIcon: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#e9ecef",
  },
  thumbnailIconText: {
    fontSize: 24,
  },
  itemInfo: {
    flex: 1,
  },
  itemType: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  deleteButton: {
    color: "red",
    marginLeft: 12,
    fontWeight: "bold",
  },
  shareButton: {
    color: "#007bff",
    marginLeft: 12,
  },
  downloadButton: {
    color: "green",
    marginLeft: 12,
  },
  viewerContainer: {
    flex: 1,
    backgroundColor: "#000",
    borderRadius: 8,
    overflow: "hidden",
  },
  viewerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#333",
    padding: 12,
  },
  viewerTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    flex: 1,
  },
  closeButton: {
    backgroundColor: "#666",
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  documentContainer: {
    flex: 1,
  },
  documentImage: {
    width: "100%",
    height: "100%",
  },
  documentVideo: {
    width: "100%",
    height: "100%",
  },
  documentAudio: {
    width: "100%",
    height: 200,
  },
  textContainer: {
    flex: 1,
    padding: 20,
  },
  textContent: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  textSubtext: {
    color: "#ccc",
    fontSize: 14,
    lineHeight: 20,
  },
  unsupportedContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  unsupportedText: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 8,
  },
  unsupportedSubtext: {
    color: "#ccc",
    fontSize: 14,
    textAlign: "center",
  },
});
