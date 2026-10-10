import { useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MenuHeader } from '@/components/MenuHeader';
import { NewProfileCard } from '@/components/NewProfileCard';
import { ProfileCard } from '@/components/ProfileCard';
import { DEFAULT_CIRCUIT } from '@/core/Circuits';
import { getBestLap } from '@/core/Profiles';
import { useProfiles } from '@/hooks/useProfiles';

import { PADDING, styles } from './PlayerSelectScreen.styles';
import type { PlayerSelectScreenProps } from './PlayerSelectScreen.types';

/**
 * "¿Quién juega?": la primera pantalla al abrir el juego. Una tarjeta por perfil (auto,
 * número, nombre y récord) y al final "Nuevo piloto". Se muestra aunque haya un solo
 * perfil, para que sumar un segundo jugador sea evidente. Tocar una tarjeta elige al
 * jugador y va a Inicio; el lápiz abre la personalización para editarlo o borrarlo.
 */
export function PlayerSelectScreen(_props: PlayerSelectScreenProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, profiles, selectProfile } = useProfiles();

  const play = (id: string) => {
    selectProfile(id);
    router.push('/inicio');
  };

  return (
    <View
      testID="player-select-screen"
      style={[
        styles.container,
        {
          paddingTop: PADDING.vertical + insets.top,
          paddingBottom: PADDING.vertical + insets.bottom,
          paddingLeft: PADDING.horizontal + insets.left,
          paddingRight: PADDING.horizontal + insets.right,
        },
      ]}
    >
      <MenuHeader
        title="¿Quién juega?"
        subtitle={
          profiles.length > 0
            ? 'Tocá tu piloto para correr'
            : 'Creá tu piloto para guardar tus tiempos'
        }
      />
      <ScrollView
        horizontal
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsHorizontalScrollIndicator={false}
      >
        {profiles.map((profile) => (
          <ProfileCard
            key={profile.id}
            profile={profile}
            recordMs={getBestLap(state, profile.id, DEFAULT_CIRCUIT.id)}
            highlighted={profile.id === state.activeProfileId}
            onPress={() => play(profile.id)}
            onEdit={() => router.push({ pathname: '/piloto', params: { id: profile.id } })}
          />
        ))}
        <NewProfileCard onPress={() => router.push('/piloto')} />
      </ScrollView>
    </View>
  );
}
