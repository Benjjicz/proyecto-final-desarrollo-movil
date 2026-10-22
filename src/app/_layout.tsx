import { router, Stack } from 'expo-router';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
} from 'react-native';

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#F7F7F2',
        },
        headerTintColor: '#183B42',
        headerShadowVisible: false,
        contentStyle: {
          backgroundColor: '#F7F7F2',
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: '',
          headerTitle: () => (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.acciones}
            >
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/agenda')}
                style={styles.boton}
              >
                <Text style={styles.texto}>Agenda</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Escanear código QR"
                onPress={() => router.push('/escanear')}
                style={styles.boton}
              >
                <Text style={styles.texto}>QR</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/recorrido')}
                style={styles.boton}
              >
                <Text style={styles.texto}>Mi recorrido</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/cuenta')}
                style={styles.boton}
              >
                <Text style={styles.texto}>Mi cuenta</Text>
              </Pressable>
            </ScrollView>
          ),
        }}
      />

      <Stack.Screen
        name="agenda"
        options={{
          title: 'Agenda',
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/eventos-guardados')}
              style={styles.boton}
            >
              <Text style={styles.texto}>Mis eventos</Text>
            </Pressable>
          ),
        }}
      />

      <Stack.Screen
        name="eventos-guardados"
        options={{ title: 'Mis eventos' }}
      />

      <Stack.Screen
        name="evento/[id]"
        options={{ title: 'Detalle del evento' }}
      />

      <Stack.Screen
        name="escanear"
        options={{ title: 'Escanear QR' }}
      />

      <Stack.Screen
        name="cuenta"
        options={{ title: 'Mi cuenta' }}
      />

      <Stack.Screen
        name="recorrido"
        options={{ title: 'Mi recorrido' }}
      />

      <Stack.Screen
        name="registrar-visita/[id]"
        options={{ title: 'Registrar visita' }}
      />

      <Stack.Screen
        name="lugar/[id]"
        options={({ route }) => {
          const parametros = route.params as
            | { id?: string | string[] }
            | undefined;

          const id = parametros?.id;

          return {
            title: 'Detalle del lugar',
            headerRight: () =>
              typeof id === 'string' ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Registrar visita a este lugar"
                  onPress={() =>
                    router.push({
                      pathname: '/registrar-visita/[id]',
                      params: { id },
                    })
                  }
                  style={styles.boton}
                >
                  <Text style={styles.texto}>Registrar</Text>
                </Pressable>
              ) : null,
          };
        }}
      />

      <Stack.Screen
        name="favoritos"
        options={{ title: 'Mis favoritos' }}
      />

      <Stack.Screen
        name="mapa"
        options={{ title: 'Explorá Colón' }}
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  acciones: {
    alignItems: 'center',
    gap: 4,
  },
  boton: {
    minHeight: 48,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  texto: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#14665C',
  },
});