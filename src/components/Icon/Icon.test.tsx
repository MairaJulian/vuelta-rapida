import { render, screen } from '@testing-library/react-native';

import { Icon } from './Icon';
import { ICON_PATHS, ICON_VIEWBOX } from './Icon.styles';
import type { IconName } from './Icon.types';

describe('Icon', () => {
  it('dibuja el trazado de Phosphor con el color pedido', async () => {
    await render(<Icon name="play" color="#2F6BDD" testID="icon" />);
    const [path] = screen.container.queryAll((node) => node.type === 'Path');
    expect(path.props.path).toBe(ICON_PATHS.play);
    expect(path.props.color).toBe('#2F6BDD');
  });

  it('escala el viewBox de 256 al tamaño pedido', async () => {
    await render(<Icon name="pause" color="#000" size={32} testID="icon" />);
    expect(screen.getByTestId('icon', { includeHiddenElements: true })).toHaveStyle({
      width: 32,
      height: 32,
    });
    const [group] = screen.container.queryAll((node) => node.type === 'Group');
    expect(group.props.transform).toEqual([{ scale: 32 / ICON_VIEWBOX }]);
  });

  it('usa 24 dp por defecto y es decorativo: el lector de pantalla no lo ve', async () => {
    await render(<Icon name="trophy" color="#000" testID="icon" />);
    const canvas = screen.getByTestId('icon', { includeHiddenElements: true });
    expect(canvas).toHaveStyle({ width: 24, height: 24, pointerEvents: 'none' });
    expect(canvas.props.accessible).toBe(false);
    expect(screen.queryByTestId('icon')).toBeNull();
  });

  it('todos los íconos son un solo trazado SVG cerrado', () => {
    (Object.keys(ICON_PATHS) as IconName[]).forEach((name) => {
      expect(ICON_PATHS[name]).toMatch(/^M[\d.,\-A-Za-z ]+Z$/);
    });
  });
});
