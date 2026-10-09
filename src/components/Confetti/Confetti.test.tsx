import { render, screen } from '@testing-library/react-native';

import { Confetti, createConfettiPieces } from './Confetti';
import { CONFETTI_COLORS } from './Confetti.styles';

describe('createConfettiPieces', () => {
  it('arma la cantidad pedida, siempre igual con la misma semilla', () => {
    const pieces = createConfettiPieces(20);
    expect(pieces).toHaveLength(20);
    expect(createConfettiPieces(20)).toEqual(pieces);
    expect(createConfettiPieces(20, 7)).not.toEqual(pieces);
  });

  it('cada papelito queda dentro de sus rangos y usa los colores de la paleta', () => {
    createConfettiPieces(100).forEach((piece) => {
      expect(piece.x).toBeGreaterThanOrEqual(0);
      expect(piece.x).toBeLessThan(1);
      expect(piece.delay).toBeLessThan(0.35);
      expect(Math.abs(piece.spins)).toBeLessThanOrEqual(3);
      expect(CONFETTI_COLORS).toContain(piece.color);
    });
  });
});

describe('Confetti', () => {
  it('dibuja los papelitos sin recibir toques ni molestar al lector de pantalla', async () => {
    await render(<Confetti width={800} height={360} pieces={12} />);
    const overlay = screen.getByTestId('confetti', { includeHiddenElements: true });
    expect(overlay).toHaveStyle({ pointerEvents: 'none' });
    expect(overlay.children).toHaveLength(12);
    expect(screen.queryByTestId('confetti')).toBeNull();
  });
});
