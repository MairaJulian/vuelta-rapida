import { render } from '@testing-library/react-native';

import { DEFAULT_CIRCUIT } from '@/core/Circuits';
import { generateScenery } from '@/core/Scenery';
import type { UseSceneryViewResult } from '@/hooks/useSceneryView';

import { SceneryLayer } from './SceneryLayer';

const scenery = generateScenery(DEFAULT_CIRCUIT, { seed: 7, treeDensity: 1 });
const image = { __mockImage: true } as never;

const shared = <Value,>(value: Value) => ({ value, get: () => value }) as never;
const sprites = (name: string) => ({ sprites: shared([name]), transforms: shared([name]) });
const view: UseSceneryViewResult = {
  atlas: {
    shadows: sprites('shadows'),
    tyres: sprites('tyres'),
    bushes: sprites('bushes'),
    treesSmall: sprites('treesSmall'),
    treesLarge: sprites('treesLarge'),
  },
  levels: {
    bushes: shared([{ scale: 1.01 }]),
    signs: shared([{ scale: 1.03 }]),
    treesSmall: shared([{ scale: 1.05 }]),
    treesLarge: shared([{ scale: 1.08 }]),
  },
};

async function renderLayer(level: 'ground' | 'raised', atlas = image) {
  const screen = await render(
    <SceneryLayer scenery={scenery} atlas={atlas} view={view} level={level} />,
  );
  const find = (type: string) => screen.container.queryAll((node) => node.type === type);
  return { screen, find };
}

describe('SceneryLayer en el suelo', () => {
  it('dibuja con el atlas las sombras y, encima, las barreras de neumáticos', async () => {
    const { find } = await renderLayer('ground');
    const [shadows, tyres] = find('Atlas');
    expect(shadows.props).toMatchObject({
      image,
      sprites: view.atlas.shadows.sprites,
      transforms: view.atlas.shadows.transforms,
    });
    expect(tyres.props).toMatchObject({
      image,
      sprites: view.atlas.tyres.sprites,
      transforms: view.atlas.tyres.transforms,
    });
  });

  it('sin textura todavía no dibuja nada en el suelo', async () => {
    const { find } = await renderLayer('ground', null as never);
    expect(find('Atlas')).toEqual([]);
  });

  it('no dibuja nada elevado', async () => {
    const { find } = await renderLayer('ground');
    expect(find('SkiaText')).toEqual([]);
  });
});

describe('SceneryLayer elevada', () => {
  it('cada altura va en su capa con paralaje, de la más baja a la más alta', async () => {
    const { find } = await renderLayer('raised');
    const levels = find('Group').filter((node) =>
      Object.values(view.levels).includes(node.props.transform),
    );
    expect(levels.map((node) => node.props.transform)).toEqual([
      view.levels.bushes,
      view.levels.signs,
      view.levels.treesSmall,
      view.levels.treesLarge,
    ]);
    // Cada capa del atlas en la suya.
    expect(levels[0].queryAll((node) => node.type === 'Atlas')[0].props.sprites).toBe(
      view.atlas.bushes.sprites,
    );
    expect(levels[3].queryAll((node) => node.type === 'Atlas')[0].props.sprites).toBe(
      view.atlas.treesLarge.sprites,
    );
  });

  it('los carteles y las gradas van a la altura de los carteles; el techo, arriba', async () => {
    const { find } = await renderLayer('raised');
    const levels = find('Group').filter((node) =>
      Object.values(view.levels).includes(node.props.transform),
    );
    const boards = scenery.objects.filter(
      (object) => object.kind === 'distanceBoard' || object.kind === 'billboard',
    );
    expect(levels[1].queryAll((node) => node.type === 'SkiaText')).toHaveLength(boards.length);
    // El público (Points) está en las gradas, no en el techo.
    expect(levels[1].queryAll((node) => node.type === 'Points').length).toBeGreaterThan(0);
    expect(levels[3].queryAll((node) => node.type === 'Points')).toEqual([]);
    expect(levels[3].queryAll((node) => node.type === 'RoundedRect')).toHaveLength(1);
  });
});
