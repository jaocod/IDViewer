import { Stack } from "expo-router";

export default function Layout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Meus Documentos" }} />
      <Stack.Screen name="viewer" options={{ title: "Visualizar" }} />
    </Stack>
  );
}
